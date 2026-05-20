import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

/**
 * Learning Passport — server-authoritative score award.
 *
 * This is the ONLY path that may increase a passport's score. Firestore rules
 * forbid every client write to `passports.score`; this function runs with the
 * Admin SDK (which bypasses rules) and is the single trusted writer.
 *
 * Integrity properties:
 *  - Caller must be the passport owner (email/password uid).
 *  - The journal entry must exist, belong to the caller, sit under this
 *    passport, and be submitted.
 *  - Idempotent: a per-entry reward doc makes a second call a no-op, so a
 *    replayed request can never double-award.
 *  - Points come from the facilitator-configured course value, never the
 *    client — the client cannot choose how many points it gets.
 */
export const awardPassportPoints = onCall(
  { region: 'asia-southeast1' },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Sign in required');
    }
    if (request.auth.token.firebase?.sign_in_provider !== 'password') {
      throw new HttpsError(
        'permission-denied',
        'Learning Passport requires an email/password account'
      );
    }
    const uid = request.auth.uid;

    const { passportId, entryId } = (request.data ?? {}) as {
      passportId?: string;
      entryId?: string;
    };
    if (!passportId) throw new HttpsError('invalid-argument', 'passportId required');
    if (!entryId) throw new HttpsError('invalid-argument', 'entryId required');

    const db = getFirestore();
    const passportRef = db.doc(`passports/${passportId}`);
    const entryRef = db.doc(`journalEntries/${entryId}`);
    const rewardRef = passportRef.collection('rewards').doc(entryId);

    const [passportSnap, entrySnap] = await Promise.all([
      passportRef.get(),
      entryRef.get(),
    ]);

    if (!passportSnap.exists) throw new HttpsError('not-found', 'Passport not found');
    const passport = passportSnap.data()!;
    if (passport.learnerUid !== uid) {
      throw new HttpsError('permission-denied', 'Not your passport');
    }

    if (!entrySnap.exists) throw new HttpsError('not-found', 'Reflection not found');
    const entry = entrySnap.data()!;
    if (entry.learnerUid !== uid) {
      throw new HttpsError('permission-denied', 'Not your reflection');
    }
    if (entry.passportId !== passportId) {
      throw new HttpsError('failed-precondition', 'Reflection is not on this passport');
    }
    if (entry.submitted !== true) {
      throw new HttpsError('failed-precondition', 'Reflection not submitted');
    }

    // Facilitator-configured points (course doc id == workshop code).
    let points = 30;
    if (passport.courseId) {
      const courseSnap = await db.doc(`courses/${passport.courseId}`).get();
      const cfg = courseSnap.exists ? courseSnap.data()! : {};
      if (typeof cfg.reflectionPoints === 'number') points = cfg.reflectionPoints;
    }

    // Atomic, idempotent award.
    const newScore = await db.runTransaction(async (tx) => {
      const [pSnap, rSnap] = await Promise.all([
        tx.get(passportRef),
        tx.get(rewardRef),
      ]);
      const current = (pSnap.data()?.score as number) ?? 0;
      if (rSnap.exists) {
        return current; // already awarded for this reflection — no-op
      }
      const updated = current + points;
      tx.set(rewardRef, {
        entryId,
        reason: 'reflection',
        points,
        awardedAt: Timestamp.now(),
      });
      tx.update(passportRef, { score: updated });
      return updated;
    });

    // Server-only leaderboard projection — passports stay private; this is
    // the safe, cohort-readable view (first name + score only). The client
    // can never write here (rules: write:false).
    const courseId = passport.courseId as string;
    const first = String(passport.displayName || 'Participant').split(/\s+/)[0];
    await db.doc(`leaderboardEntries/${courseId}__${uid}`).set({
      courseId,
      uid,
      name: first,
      score: newScore,
      visible: passport.visibleToCohort !== false,
      updatedAt: Timestamp.now(),
    });

    return { score: newScore, points };
  }
);
