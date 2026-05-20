import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';

const PASSPORT_URL = 'https://game.knywong.com/passport';

/**
 * Send reminder emails to participants who have not yet completed their
 * journal reflections. Facilitator-only. Uses Resend.
 *
 * Requires RESEND_API_KEY secret. Returns { sent, skipped } counts.
 */
export const sendPassportReminders = onCall(
  { region: 'asia-southeast1', secrets: ['RESEND_API_KEY'] },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in required');
    const role = request.auth.token.role as string;
    if (!['facilitator', 'admin'].includes(role)) {
      throw new HttpsError('permission-denied', 'Facilitator access required');
    }

    const { courseId } = (request.data ?? {}) as { courseId?: string };
    if (!courseId) throw new HttpsError('invalid-argument', 'courseId required');

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) throw new HttpsError('failed-precondition', 'Email service not configured.');

    const db = getFirestore();
    const courseSnap = await db.doc(`courses/${courseId}`).get();
    if (!courseSnap.exists) throw new HttpsError('not-found', 'Course not found');
    const course = courseSnap.data()!;
    if (course.facilitatorId !== request.auth.uid && role !== 'admin') {
      throw new HttpsError('permission-denied', 'Not your course');
    }

    const totalQuestions = Array.isArray(course.journalQuestions)
      ? course.journalQuestions.length : 1;

    // Load all passports for this course (Admin SDK bypasses rules).
    const passports = await db.collection('passports')
      .where('courseId', '==', courseId).get();

    let sent = 0, skipped = 0;

    for (const pDoc of passports.docs) {
      const p = pDoc.data();
      // Count completed journal entries for this passport.
      const entries = await db.collection('journalEntries')
        .where('passportId', '==', p.passportId)
        .where('submitted', '==', true)
        .get();
      const done = entries.size;
      if (done >= totalQuestions) { skipped++; continue; }

      const learnerSnap = await db.doc(`learners/${p.learnerUid}`).get();
      if (!learnerSnap.exists) { skipped++; continue; }
      const email = learnerSnap.data()!.email as string;
      if (!email) { skipped++; continue; }

      const remaining = totalQuestions - done;
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'Learning Passport <passport@knywong.com>',
          to: email,
          subject: `Your reflections are waiting — ${course.name || courseId}`,
          html: `<p>Hi ${p.displayName || 'there'},</p>
<p>You have <strong>${remaining} reflection${remaining !== 1 ? 's' : ''}</strong> waiting in your <strong>${course.name || courseId}</strong> learning passport.</p>
<p>Completing your journal unlocks your personal AI synthesis report and certificate.</p>
<p><a href="${PASSPORT_URL}" style="display:inline-block;background:#c9a227;color:#241c00;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">Open my passport →</a></p>
<p style="color:#888;font-size:12px">You're receiving this because your facilitator sent a course reminder.</p>`,
        }),
      });
      if (res.ok) sent++; else skipped++;
    }

    return { sent, skipped, total: passports.size };
  }
);
