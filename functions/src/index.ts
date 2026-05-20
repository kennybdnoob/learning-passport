import { initializeApp, getApps } from 'firebase-admin/app';

if (getApps().length === 0) {
  initializeApp();
}

// Platform auth
export { syncRole } from './auth/syncRole';

// Activity functions
export { generateIBSummary } from './activities/impactBingo/generateSummary';

// Learning Passport
export { awardPassportPoints } from './activities/passport/awardPassportPoints';
export { deleteLearnerAccount } from './activities/passport/deleteLearnerAccount';
export { generatePassportSynthesis } from './activities/passport/generatePassportSynthesis';
export { redeemReward } from './activities/passport/redeemReward';
export { sendPassportReminders } from './activities/passport/sendPassportReminders';
