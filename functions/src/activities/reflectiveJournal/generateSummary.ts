import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { GoogleGenerativeAI } from '@google/generative-ai';

const SAFE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function makeCode(length: number): string {
  return Array.from(
    { length },
    () => SAFE_CHARS[Math.floor(Math.random() * SAFE_CHARS.length)]
  ).join('');
}

export const generateSummary = onCall(
  { region: 'asia-southeast1', secrets: ['GEMINI_API_KEY'] },
  async (request) => {
  // Anonymous auth is just the rule gate; identity is the nickname.
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in required');

  const { workshopId, nick } = request.data as { workshopId: string; nick: string };
  if (!workshopId) throw new HttpsError('invalid-argument', 'workshopId required');
  if (!nick) throw new HttpsError('invalid-argument', 'nick required');
  const participantId = nick; // identity = normalised nickname (set by client)

  const db = getFirestore();

  const workshopSnap = await db.doc(`workshops/${workshopId}`).get();
  if (!workshopSnap.exists) throw new HttpsError('not-found', 'Workshop not found');
  const workshop = workshopSnap.data()!;
  if (!workshop.summaryUnlocked) {
    throw new HttpsError('failed-precondition', 'Summary generation not yet unlocked by facilitator');
  }

  // Validate this nickname is actually registered in the workshop
  const partSnap = await db.doc(`workshops/${workshopId}/participants/${participantId}`).get();
  if (!partSnap.exists) {
    throw new HttpsError('permission-denied', 'Nickname not registered in this workshop');
  }

  // Return existing summary without regenerating
  const existingSnap = await db
    .collection(`workshops/${workshopId}/summaries`)
    .where('participantId', '==', participantId)
    .limit(1)
    .get();
  if (!existingSnap.empty) {
    const s = existingSnap.docs[0].data();
    return { summaryText: s.text as string, summaryCode: s.code as string };
  }

  // Fetch participant's submitted responses
  const responsesSnap = await db
    .collection(`workshops/${workshopId}/responses`)
    .where('participantId', '==', participantId)
    .where('submitted', '==', true)
    .get();

  if (responsesSnap.empty) {
    throw new HttpsError('failed-precondition', 'No submitted responses to summarise');
  }

  // Pair each response with its activity's topic, objective and question
  const items: Array<{ topic: string; objective: string; prompt: string; text: string }> = [];
  for (const resDoc of responsesSnap.docs) {
    const res = resDoc.data();
    const actSnap = await db
      .doc(`workshops/${workshopId}/activities/${res.activityId as string}`)
      .get();
    if (!actSnap.exists) continue;
    const act = actSnap.data()!;
    const text = ((res.data as Record<string, string>) ?? {}).text ?? '';
    if (text.trim()) {
      items.push({
        topic: (act.topic as string) || '',
        objective: (act.objective as string) || '',
        prompt: (act.prompt as string) || '',
        text,
      });
    }
  }

  if (items.length === 0) {
    throw new HttpsError('failed-precondition', 'No response text to summarise');
  }

  const trainingTitle = (workshop.title as string) || (workshop.name as string) || 'this training';

  const responsesBlock = items
    .map((r, i) => {
      const head = `Activity ${i + 1}${r.topic ? ` — ${r.topic}` : ''}`;
      const obj = r.objective ? `\nLearning objective: ${r.objective}` : '';
      return `${head}${obj}\nReflective question: "${r.prompt}"\nTheir response: ${r.text}`;
    })
    .join('\n\n');

  // Fail fast with a clear message if the API key never made it into the
  // runtime (this was previously surfacing to participants as "INTERNAL").
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('generateSummary: GEMINI_API_KEY is not set in the function environment');
    throw new HttpsError(
      'failed-precondition',
      'AI summary service is not configured. Please tell your facilitator.'
    );
  }

  const prompt = `You are helping a participant of "${trainingTitle}" create a personal learning summary from their own reflections.

Each activity below has a stated learning objective. Where the participant's words show movement toward that objective, name it naturally in their voice. If a response does not address its objective, do NOT invent progress or claim a connection that isn't there — simply summarise what they actually wrote.

PARTICIPANT RESPONSES (in order):
${responsesBlock}

Write a personalised first-person summary in exactly four sections. Use ONLY content from their responses — never invent or fabricate. Relate their reflections to the stated learning objectives only where their own words support it. Mirror their language and register. Keep each section 1–3 sentences. If they wrote very little, keep the summary short — never pad.

FORBIDDEN: leverage, synergy, stakeholder, key takeaway, growth journey, in conclusion, moving forward.

Output each section on its own paragraph, prefixed exactly as shown:
What I noticed about myself: [1–3 sentences]

What I learned from the activities: [1–3 sentences]

What I want to apply next: [1–3 sentences]

One sentence I can share: [exactly one sentence]`;

  let summaryText: string;
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const result = await model.generateContent(prompt);
    summaryText = result.response.text().trim();
  } catch (err) {
    // Log the REAL underlying error (key invalid, API not enabled, quota,
    // model name, etc.) so it's diagnosable instead of an opaque "INTERNAL".
    console.error('generateSummary: Gemini call failed', err);
    throw new HttpsError(
      'internal',
      'The AI could not generate your summary right now. Please try again in a moment.'
    );
  }

  if (!summaryText) {
    console.error('generateSummary: Gemini returned an empty response');
    throw new HttpsError(
      'internal',
      'The AI returned an empty summary. Please try again.'
    );
  }

  // Generate unique code, checked against top-level summaries collection
  let summaryCode = makeCode(8);
  for (let i = 0; i < 10; i++) {
    const check = await db.doc(`summaries/${summaryCode}`).get();
    if (!check.exists) break;
    summaryCode = makeCode(8);
  }

  const now = Timestamp.now();

  try {
    await db.collection(`workshops/${workshopId}/summaries`).add({
      participantId,
      code: summaryCode,
      text: summaryText,
      generatedAt: now,
      modelVersion: 'gemini-2.5-flash',
    });

    // Top-level collection for fast code-based retrieval
    await db.doc(`summaries/${summaryCode}`).set({
      text: summaryText,
      workshopId,
      participantId,
      generatedAt: now,
    });

    await db
      .doc(`workshops/${workshopId}/participants/${participantId}`)
      .set({ summaryCode }, { merge: true });
  } catch (err) {
    // The summary text generated fine — still return it so the participant
    // isn't blocked, but log the persistence failure for follow-up.
    console.error('generateSummary: failed to persist summary', err);
  }

  return { summaryText, summaryCode };
});
