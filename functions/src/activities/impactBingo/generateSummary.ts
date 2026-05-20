import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const generateIBSummary = onCall(
  { region: 'asia-southeast1', secrets: ['GEMINI_API_KEY'] },
  async (request) => {
  // IB participants have no Firebase Auth — validate via Firestore instead
  const {
    sessionId, nick, balance, lines, finalScore,
    totalBought, totalSold, topSale, answers,
  } = request.data as {
    sessionId: string;
    nick: string;
    balance: number;
    lines: number;
    finalScore: number;
    totalBought: number;
    totalSold: number;
    topSale: number;
    answers: string[];
  };

  if (!sessionId || !nick || !Array.isArray(answers)) {
    throw new HttpsError('invalid-argument', 'sessionId, nick, and answers are required');
  }

  const db = getFirestore();

  // Validate session exists
  const sessionSnap = await db.doc(`sessions/${sessionId}`).get();
  if (!sessionSnap.exists) throw new HttpsError('not-found', 'Session not found');
  const sessionData = sessionSnap.data()!;

  // Validate this nick is actually registered in the session
  const userSnap = await db.doc(`sessions/${sessionId}/users/${nick}`).get();
  if (!userSnap.exists) throw new HttpsError('permission-denied', 'Player not registered in this session');

  const mult = lines * 0.3;
  const qs: string[] = sessionData.reflectionQuestions ?? [
    'What surprised you most about how others saw you today?',
    'Which square was hardest to sell — and what does that tell you?',
    'What will you do differently in how you recognise others after today?',
  ];

  const prompt = `You are a warm, celebratory, and insightful learning coach. A participant just completed an experiential learning activity called Impact Bingo — a market-based bingo game where players buy and sell human traits, skills, achievements, and recognition moments.

THEIR PERFORMANCE:
- Final balance: ${balance} points
- Lines completed: ${lines} (multiplier: ×${mult.toFixed(1)})
- Final score: ${finalScore} points
- Squares bought: ${totalBought}
- Times sold: ${totalSold}
- Highest single sale: ${topSale} points
- Nickname: ${nick}

THEIR REFLECTION ANSWERS:
${qs.map((q, i) => `Q: ${q}\nA: ${answers[i] ?? ''}`).join('\n\n')}

SESSION OBJECTIVE: ${sessionData.objective ?? 'Team building and mutual recognition'}

Write a personalised summary (3-4 paragraphs) that:
1. Celebrates their specific achievements in the game with energy and warmth
2. Connects their game behaviour (buying patterns, selling, line completion) to real insights about how they show up at work
3. Weaves in their reflection answers meaningfully
4. Ends with ONE powerful coaching question they can bring to a group discussion — prefix it clearly with "COACHING QUESTION:"

Keep the tone celebratory, warm, and forward-looking. Be specific to their data — not generic.`;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('generateIBSummary: GEMINI_API_KEY is not set in the function environment');
    throw new HttpsError(
      'failed-precondition',
      'AI summary service is not configured. Please tell your facilitator.'
    );
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    if (!text) {
      console.error('generateIBSummary: Gemini returned an empty response');
      throw new HttpsError('internal', 'The AI returned an empty summary. Please try again.');
    }
    return { text };
  } catch (err) {
    if (err instanceof HttpsError) throw err;
    console.error('generateIBSummary: Gemini call failed', err);
    throw new HttpsError(
      'internal',
      'The AI could not generate your summary right now. Please try again in a moment.'
    );
  }
});
