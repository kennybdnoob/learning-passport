import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

/**
 * Learning Passport — server-authoritative reward redemption.
 *
 * This is the ONLY path that may decrease a passport's score. Clients cannot
 * write to `passports.score` or `passports/{id}/redemptions`; both paths are
 * rule-locked (write: false). This function runs with the Admin SDK.
 *
 * Integrity properties:
 *  - Caller must be the passport owner (email/password uid).
 *  - Reward must exist in the course config; point cost comes from there.
 *  - Score must be >= pointCost before the deduction.
 *  - Idempotent: a `redemptions/{rewardId}` doc prevents double-spend.
 */
export const redeemReward = onCall(
  { region: 'asia-southeast1' },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Sign in required');
    }
    if (request.auth.token.firebase?.sign_in_provider !== 'password') {
      throw new HttpsError('permission-denied', 'Passport participants only');
    }
    const uid = request.auth.uid;

    const { passportId, rewardId } = (request.data ?? {}) as {
      passportId?: string;
      rewardId?: string;
    };
    if (!passportId) throw new HttpsError('invalid-argument', 'passportId required');
    if (!rewardId)   throw new HttpsError('invalid-argument', 'rewardId required');

    const db = getFirestore();
    const passportRef = db.doc(`passports/${passportId}`);

    const passportSnap = await passportRef.get();
    if (!passportSnap.exists) throw new HttpsError('not-found', 'Passport not found');
    const passport = passportSnap.data()!;
    if (passport.learnerUid !== uid) {
      throw new HttpsError('permission-denied', 'Not your passport');
    }

    const courseSnap = await db.doc(`courses/${passport.courseId}`).get();
    if (!courseSnap.exists) throw new HttpsError('not-found', 'Course not found');
    const course = courseSnap.data()!;
    const rewards: Array<{ id: string; name: string; pointCost: number }> = course.rewards || [];
    const reward = rewards.find(r => r.id === rewardId);
    if (!reward) throw new HttpsError('not-found', 'Reward not found in this course');

    const redemptionRef = passportRef.collection('redemptions').doc(rewardId);

    const result = await db.runTransaction(async tx => {
      const [pSnap, rdSnap] = await Promise.all([
        tx.get(passportRef),
        tx.get(redemptionRef),
      ]);
      const current = (pSnap.data()?.score as number) ?? 0;

      if (rdSnap.exists) {
        return { alreadyRedeemed: true, score: current, rewardId, rewardName: reward.name };
      }
      if (current < reward.pointCost) {
        throw new HttpsError(
          'failed-precondition',
          `Not enough points. Need ${reward.pointCost}, have ${current}.`
        );
      }
      const updated = current - reward.pointCost;
      tx.update(passportRef, { score: FieldValue.increment(-reward.pointCost) });
      tx.set(redemptionRef, {
        rewardId,
        name: reward.name,
        pointCost: reward.pointCost,
        passportId,
        learnerUid: uid,
        redeemedAt: FieldValue.serverTimestamp(),
      });
      return { alreadyRedeemed: false, score: updated, rewardId, rewardName: reward.name };
    });

    return result;
  }
);
