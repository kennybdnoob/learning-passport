import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { getAuth } from 'firebase-admin/auth';

/**
 * syncRole — Platform auth trigger
 *
 * Fires on any write to users/{uid}.
 * Reads the `role` field and pushes it to Firebase Auth custom claims.
 * Security rules that check `request.auth.token.role` update on the next
 * token refresh (≤1hr, or immediately after the next sign-in).
 *
 * Valid roles: 'member' | 'facilitator' | 'admin'
 * If the doc is deleted or has no `role` field, the claim is cleared.
 */
export const syncRole = onDocumentWritten('users/{uid}', async (event) => {
  const uid = event.params.uid;

  // Deleted doc — clear all role claims
  if (!event.data?.after.exists) {
    await getAuth().setCustomUserClaims(uid, {});
    console.log(`syncRole: cleared claims for uid=${uid}`);
    return;
  }

  const data = event.data.after.data();
  const role: string | undefined = data?.role;

  // Valid roles only — reject anything unexpected
  const VALID_ROLES = new Set(['member', 'facilitator', 'admin']);

  if (role && VALID_ROLES.has(role)) {
    await getAuth().setCustomUserClaims(uid, { role });
    console.log(`syncRole: set role="${role}" for uid=${uid}`);
  } else {
    // Unknown or missing role — clear the claim
    await getAuth().setCustomUserClaims(uid, {});
    if (role) {
      console.warn(`syncRole: unknown role "${role}" for uid=${uid} — claims cleared`);
    } else {
      console.log(`syncRole: no role field for uid=${uid} — claims cleared`);
    }
  }
  // NOTE: Do NOT write back to the user doc here — that would trigger this function again (infinite loop)
});
