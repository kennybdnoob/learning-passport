import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

/**
 * Learning Passport — hard delete (PRD §4: "Delete = delete").
 *
 * Cascades, server-side, everything tied to the caller:
 *   - every passport they own (+ its rewards ledger via recursiveDelete)
 *   - every journal entry they own
 *   - their learner profile
 *   - their Firebase Auth user
 *
 * Storage selfie objects are removed when the selfie pipeline lands
 * (Phase 6.1) — there is no selfie to clean up yet.
 *
 * Client delete is forbidden by Firestore rules for all of these paths;
 * this Admin-SDK function is the only deletion path, callable only by the
 * owner.
 */
export const deleteLearnerAccount = onCall(
  { region: 'asia-southeast1' },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Sign in required');
    }
    if (request.auth.token.firebase?.sign_in_provider !== 'password') {
      throw new HttpsError('permission-denied', 'Not a Passport account');
    }
    const uid = request.auth.uid;
    const db = getFirestore();

    const [passports, entries] = await Promise.all([
      db.collection('passports').where('learnerUid', '==', uid).get(),
      db.collection('journalEntries').where('learnerUid', '==', uid).get(),
    ]);

    // recursiveDelete handles each passport's /rewards subcollection too.
    await Promise.all(passports.docs.map((d) => db.recursiveDelete(d.ref)));

    let batch = db.batch();
    let n = 0;
    for (const d of entries.docs) {
      batch.delete(d.ref);
      if (++n === 400) { await batch.commit(); batch = db.batch(); n = 0; }
    }
    batch.delete(db.doc(`learners/${uid}`));
    await batch.commit();

    await getAuth().deleteUser(uid);

    return {
      deleted: true,
      passports: passports.size,
      journalEntries: entries.size,
    };
  }
);
