import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { GoogleGenerativeAI } from '@google/generative-ai';
import PDFDocument from 'pdfkit';

const BUCKET = 'learning-activities-kny.firebasestorage.app';
const INK = '#1c1a17';
const GOLD = '#a07e15';
const SOFT = '#5a5249';

interface Synthesis {
  execSummary: string;
  reflections: { questionId: string; insight: string; nextStep: string }[];
  actionPlan: string[];
  managerOnePager: string;
  capstone: string;
}

function parseJson(raw: string): Synthesis | null {
  let t = raw.trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) t = fence[1].trim();
  const a = t.indexOf('{');
  const b = t.lastIndexOf('}');
  if (a === -1 || b === -1) return null;
  try {
    return JSON.parse(t.slice(a, b + 1)) as Synthesis;
  } catch {
    return null;
  }
}

function buildPdf(p: FirebaseFirestore.DocumentData, s: Synthesis,
  items: { topic: string; prompt: string; response: string }[]): Promise<Buffer> {
  const doc = new PDFDocument({ size: 'A4', margin: 56 });
  const chunks: Buffer[] = [];
  doc.on('data', (c: Buffer) => chunks.push(c));
  const done = new Promise<Buffer>((res) => doc.on('end', () => res(Buffer.concat(chunks))));

  const H = (t: string) => doc.moveDown(0.8).fillColor(GOLD)
    .font('Helvetica-Bold').fontSize(11).text(t.toUpperCase(), { characterSpacing: 1 });
  const body = (t: string) => doc.fillColor(INK).font('Helvetica').fontSize(11)
    .text(t, { lineGap: 3 });

  // Cover
  doc.fillColor(SOFT).font('Helvetica-Bold').fontSize(10)
    .text('LEARNING PASSPORT', { characterSpacing: 2 });
  doc.moveDown(2);
  doc.fillColor(INK).font('Helvetica-Bold').fontSize(26)
    .text(p.displayName || 'Participant');
  doc.fillColor(SOFT).font('Helvetica').fontSize(12)
    .text(`${p.courseName || p.workshopCode || ''}${p.cohortName ? ' · ' + p.cohortName : ''}`);
  doc.moveDown(1.5);
  doc.fillColor(GOLD).font('Helvetica-Oblique').fontSize(14)
    .text(s.capstone, { lineGap: 4 });

  H('Executive summary');
  body(s.execSummary);

  H('Your reflections');
  s.reflections.forEach((r, i) => {
    const it = items[i] || { topic: '', prompt: '', response: '' };
    doc.moveDown(0.5).fillColor(INK).font('Helvetica-Bold').fontSize(11)
      .text(it.topic || `Reflection ${i + 1}`);
    doc.fillColor(SOFT).font('Helvetica-Oblique').fontSize(10).text(it.prompt, { lineGap: 2 });
    doc.moveDown(0.2).fillColor(INK).font('Helvetica').fontSize(10.5)
      .text(`Insight: ${r.insight}`, { lineGap: 2 });
    doc.fillColor(GOLD).font('Helvetica').fontSize(10.5)
      .text(`Next step: ${r.nextStep}`, { lineGap: 2 });
  });

  H('Your action plan');
  s.actionPlan.forEach((a, i) => body(`${i + 1}.  ${a}`));

  H('One-pager for your manager');
  body(s.managerOnePager);

  doc.end();
  return done;
}

export const generatePassportSynthesis = onCall(
  { region: 'asia-southeast1', secrets: ['GEMINI_API_KEY'], timeoutSeconds: 120 },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in required');
    if (request.auth.token.firebase?.sign_in_provider !== 'password') {
      throw new HttpsError('permission-denied', 'Not a Passport account');
    }
    const uid = request.auth.uid;
    const { passportId } = (request.data ?? {}) as { passportId?: string };
    if (!passportId) throw new HttpsError('invalid-argument', 'passportId required');

    const db = getFirestore();
    const pSnap = await db.doc(`passports/${passportId}`).get();
    if (!pSnap.exists) throw new HttpsError('not-found', 'Passport not found');
    const passport = pSnap.data()!;
    if (passport.learnerUid !== uid) {
      throw new HttpsError('permission-denied', 'Not your passport');
    }

    // One-shot: return the existing report if already generated.
    const repRef = db.doc(`synthesisReports/${passportId}`);
    const existing = await repRef.get();
    if (existing.exists) {
      const e = existing.data()!;
      return { ...(e.json as Synthesis), pdfUrl: e.pdfUrl as string, cached: true };
    }

    const courseSnap = await db.doc(`courses/${passport.courseId}`).get();
    const course = courseSnap.exists ? courseSnap.data()! : {};
    const questions: { id: string; topic?: string; objective?: string; prompt: string }[] =
      Array.isArray(course.journalQuestions) && course.journalQuestions.length
        ? course.journalQuestions
        : [{ id: 'q1', prompt: (course.reflectionQuestion as string) || 'Reflection' }];

    const items: { topic: string; objective: string; prompt: string; response: string }[] = [];
    for (const q of questions) {
      const eSnap = await db.doc(`journalEntries/${passportId}__${q.id}`).get();
      if (!eSnap.exists || eSnap.data()!.submitted !== true) {
        throw new HttpsError('failed-precondition', 'Complete all reflections first');
      }
      items.push({
        topic: q.topic || '', objective: q.objective || '', prompt: q.prompt,
        response: (eSnap.data()!.response as string) || '',
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new HttpsError('failed-precondition', 'AI service is not configured.');
    }

    const block = items.map((r, i) =>
      `Reflection ${i + 1}${r.topic ? ` — ${r.topic}` : ''}` +
      `${r.objective ? `\nObjective: ${r.objective}` : ''}` +
      `\nQuestion: "${r.prompt}"\nTheir answer: ${r.response}`).join('\n\n');

    const prompt = `You are writing a personal learning report for a participant of "${course.name || 'this workshop'}".
Use ONLY what they actually wrote. Never invent progress, facts, or sentiment that is not in their words. Mirror their language and register. Where a reflection clearly moves toward its stated objective, you may name that — only if their own words support it.

PARTICIPANT REFLECTIONS:
${block}

Return ONLY valid JSON (no markdown fence, no prose) with exactly this shape:
{
 "execSummary": "3-4 sentences synthesising their key learning, in second person",
 "reflections": [ { "questionId": "<the id>", "insight": "1-2 sentence insight grounded in their answer", "nextStep": "one concrete suggested next step" } ],
 "actionPlan": ["commitment 1", "commitment 2", "commitment 3"],
 "managerOnePager": "a short paragraph their manager can read to see the value gained",
 "capstone": "2-3 sentence 'who they became' summary, warm and specific"
}
The "reflections" array MUST have one entry per reflection above, in order, with questionId values: ${questions.map((q) => q.id).join(', ')}.
Banned words: leverage, synergy, stakeholder, key takeaway, growth journey, in conclusion, moving forward.`;

    const model = new GoogleGenerativeAI(apiKey)
      .getGenerativeModel({ model: 'gemini-2.5-flash' });

    let parsed: Synthesis | null = null;
    for (let attempt = 0; attempt < 2 && !parsed; attempt++) {
      try {
        const r = await model.generateContent(
          attempt === 0 ? prompt : prompt + '\n\nYour previous reply was not valid JSON. Reply with ONLY the JSON object.'
        );
        parsed = parseJson(r.response.text());
      } catch (err) {
        console.error('generatePassportSynthesis: Gemini call failed', err);
      }
    }
    if (!parsed || !parsed.capstone || !Array.isArray(parsed.reflections)) {
      throw new HttpsError('internal', 'Could not generate your report. Please try again.');
    }

    const pdf = await buildPdf(passport, parsed, items);
    const file = getStorage().bucket(BUCKET).file(`passport-reports/${uid}/${passportId}.pdf`);
    await file.save(pdf, { contentType: 'application/pdf', resumable: false });
    const [pdfUrl] = await file.getSignedUrl({ action: 'read', expires: '01-01-2491' });

    const now = Timestamp.now();
    await repRef.set({
      passportId, learnerUid: uid, courseId: passport.courseId,
      json: parsed, capstoneText: parsed.capstone, pdfUrl,
      model: 'gemini-2.5-flash', generatedAt: now, version: 1,
    });

    return { ...parsed, pdfUrl, cached: false };
  }
);
