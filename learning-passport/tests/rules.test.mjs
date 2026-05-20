/**
 * Learning Passport — Thin Slice security gate.
 *
 * This is the acceptance test for Phase 0. It proves the one invariant the
 * whole architecture rests on: a CLIENT CAN NEVER WRITE `score`. Points exist
 * only through the awardPassportPoints Cloud Function (Admin SDK).
 *
 * Run from repo root (needs Java for the Firestore emulator):
 *   cd learning-passport/tests && npm install
 *   firebase emulators:exec --only firestore --project learning-activities-kny \
 *     "node learning-passport/tests/rules.test.mjs"
 * or simply:  cd learning-passport/tests && npm test
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import {
  initializeTestEnvironment, assertSucceeds, assertFails,
} from '@firebase/rules-unit-testing';
import {
  doc, getDoc, setDoc, updateDoc, getDocs, collection, query, where,
} from 'firebase/firestore';
import { ref as sref, uploadString } from 'firebase/storage';

const here = dirname(fileURLToPath(import.meta.url));
const rules = readFileSync(resolve(here, '../../firestore.rules'), 'utf8');
const storageRules = readFileSync(resolve(here, '../../storage.rules'), 'utf8');
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

const CODE = 'AX7K2M';
const UID_A = 'learnerA';
const UID_B = 'learnerB';
const PID_A = `${UID_A}_${CODE}`;

const pw = (env, uid) =>
  env.authenticatedContext(uid, { firebase: { sign_in_provider: 'password' } }).firestore();
const anon = (env) =>
  env.authenticatedContext('anonU', { firebase: { sign_in_provider: 'anonymous' } }).firestore();
const fac = (env, uid) =>
  env.authenticatedContext(uid, { role: 'facilitator', firebase: { sign_in_provider: 'google.com' } }).firestore();

let passed = 0, failed = 0;
async function check(name, p) {
  try { await p; console.log(`  PASS  ${name}`); passed++; }
  catch (e) { console.error(`  FAIL  ${name}\n        ${e.message}`); failed++; }
}

const env = await initializeTestEnvironment({
  projectId: 'learning-activities-kny',
  firestore: { rules },
  storage: { rules: storageRules },
});
const pwStore = (uid) =>
  env.authenticatedContext(uid, { firebase: { sign_in_provider: 'password' } }).storage();

// Seed a course + an existing passport with score 120, bypassing rules.
await env.withSecurityRulesDisabled(async (ctx) => {
  const db = ctx.firestore();
  await setDoc(doc(db, 'courses', CODE), {
    name: 'The AI Advantage', cohortName: 'KL Leaders 26',
    facilitatorId: 'fac1', reflectionPoints: 30,
    rewards: [{ id: 'r_coffee', name: 'Coffee voucher', pointCost: 50 }],
  });
  await setDoc(doc(db, 'passports', PID_A), {
    passportId: PID_A, learnerUid: UID_A, workshopCode: CODE, courseId: CODE,
    displayName: 'Aisha', position: 'Head of People', score: 120, status: 'active',
  });
  await setDoc(doc(db, 'synthesisReports', PID_A), {
    passportId: PID_A, learnerUid: UID_A, courseId: CODE, capstoneText: 'Grew into a deliberate experimenter.',
  });
  await setDoc(doc(db, 'leaderboardEntries', `${CODE}__${UID_A}`), {
    courseId: CODE, uid: UID_A, name: 'Aisha', score: 120, visible: true,
  });
  // Seed a redemption so the read assertion has something to fetch.
  await setDoc(doc(db, 'passports', PID_A, 'redemptions', 'r_coffee'), {
    rewardId: 'r_coffee', name: 'Coffee voucher', pointCost: 50,
    passportId: PID_A, learnerUid: UID_A,
  });
});

const LB_A = `${CODE}__${UID_A}`;

console.log('\nLearning Passport — security gate\n');

// ── THE CORE ASSERTION ───────────────────────────────────────────────────────
await check('client CANNOT raise its own score (the whole point)', assertFails(
  updateDoc(doc(pw(env, UID_A), 'passports', PID_A), { score: 99999 })));

await check('client CANNOT nudge score by +1 either', assertFails(
  updateDoc(doc(pw(env, UID_A), 'passports', PID_A), { score: 121 })));

await check('client CANNOT write the server-only rewards ledger', assertFails(
  setDoc(doc(pw(env, UID_A), 'passports', PID_A, 'rewards', 'fake'),
    { points: 999, reason: 'reflection' })));

// ── OWNERSHIP / ISOLATION ────────────────────────────────────────────────────
await check('owner CAN read own passport', assertSucceeds(
  getDoc(doc(pw(env, UID_A), 'passports', PID_A))));

await check('another participant CANNOT read it', assertFails(
  getDoc(doc(pw(env, UID_B), 'passports', PID_A))));

// ── SHELF QUERY (Phase 6.1) ──────────────────────────────────────────────────
await check('owner CAN list passports filtered to themselves', assertSucceeds(
  getDocs(query(collection(pw(env, UID_A), 'passports'),
    where('learnerUid', '==', UID_A)))));

await check('CANNOT list the whole passports collection unfiltered', assertFails(
  getDocs(collection(pw(env, UID_A), 'passports'))));

await check('CANNOT list someone else’s passports', assertFails(
  getDocs(query(collection(pw(env, UID_B), 'passports'),
    where('learnerUid', '==', UID_A)))));

await check('owner CAN edit display fields (score unchanged)', assertSucceeds(
  updateDoc(doc(pw(env, UID_A), 'passports', PID_A), { position: 'VP People' })));

// ── CREATION CONSTRAINTS ─────────────────────────────────────────────────────
await check('owner CAN create their passport with score 0', assertSucceeds(
  setDoc(doc(pw(env, UID_B), 'passports', `${UID_B}_${CODE}`), {
    passportId: `${UID_B}_${CODE}`, learnerUid: UID_B, workshopCode: CODE,
    courseId: CODE, displayName: 'Sam', score: 0, status: 'active' })));

await check('CANNOT create a passport pre-loaded with points', assertFails(
  setDoc(doc(pw(env, 'learnerC'), 'passports', `learnerC_${CODE}`), {
    passportId: `learnerC_${CODE}`, learnerUid: 'learnerC', workshopCode: CODE,
    courseId: CODE, displayName: 'Cheater', score: 500, status: 'active' })));

await check('CANNOT create a passport whose id is not <uid>_<code>', assertFails(
  setDoc(doc(pw(env, 'learnerD'), 'passports', 'someoneElse_X'), {
    passportId: 'someoneElse_X', learnerUid: 'learnerD', workshopCode: CODE,
    courseId: CODE, displayName: 'D', score: 0 })));

await check('CANNOT create a passport owned by someone else', assertFails(
  setDoc(doc(pw(env, 'learnerE'), 'passports', `learnerE_${CODE}`), {
    passportId: `learnerE_${CODE}`, learnerUid: 'victim', workshopCode: CODE,
    courseId: CODE, displayName: 'E', score: 0 })));

// ── IDENTITY TIER ────────────────────────────────────────────────────────────
await check('anonymous user is NOT a Passport participant', assertFails(
  setDoc(doc(anon(env), 'passports', `anonU_${CODE}`), {
    passportId: `anonU_${CODE}`, learnerUid: 'anonU', workshopCode: CODE,
    courseId: CODE, displayName: 'Anon', score: 0 })));

// ── JOURNAL + LEARNER OWNERSHIP ──────────────────────────────────────────────
await check('owner CAN write their own journal entry', assertSucceeds(
  setDoc(doc(pw(env, UID_A), 'journalEntries', `${PID_A}__q1`), {
    entryId: `${PID_A}__q1`, passportId: PID_A, learnerUid: UID_A,
    questionId: 'q1', response: 'x', submitted: true })));

await check('CANNOT write a journal entry as another learner', assertFails(
  setDoc(doc(pw(env, UID_B), 'journalEntries', `${PID_A}__q1b`), {
    entryId: `${PID_A}__q1b`, passportId: PID_A, learnerUid: UID_A,
    questionId: 'q1', response: 'x', submitted: true })));

await check('owner CAN write multiple entries (one per question)', assertSucceeds(
  setDoc(doc(pw(env, UID_A), 'journalEntries', `${PID_A}__q2`), {
    entryId: `${PID_A}__q2`, passportId: PID_A, learnerUid: UID_A,
    questionId: 'q2', response: 'second reflection', submitted: true })));

await check('learner can write own profile; not someone else’s', assertSucceeds(
  setDoc(doc(pw(env, UID_A), 'learners', UID_A),
    { uid: UID_A, displayName: 'Aisha', email: 'a@x.com' })));
await check('CANNOT write another learner profile', assertFails(
  setDoc(doc(pw(env, UID_B), 'learners', UID_A),
    { uid: UID_A, displayName: 'hijack' })));

// ── SYNTHESIS REPORTS (server-written only; Phase 6.2) ───────────────────────
await check('owner CAN read their own synthesis report', assertSucceeds(
  getDoc(doc(pw(env, UID_A), 'synthesisReports', PID_A))));

await check('another participant CANNOT read it', assertFails(
  getDoc(doc(pw(env, UID_B), 'synthesisReports', PID_A))));

await check('client CANNOT write a synthesis report (server-only)', assertFails(
  setDoc(doc(pw(env, UID_A), 'synthesisReports', PID_A),
    { learnerUid: UID_A, capstoneText: 'forged' })));

// ── LEADERBOARD (server projection; Phase 6.3) ───────────────────────────────
await check('any participant CAN read a leaderboard entry (cohort view)', assertSucceeds(
  getDoc(doc(pw(env, UID_B), 'leaderboardEntries', LB_A))));

await check('client CANNOT create a leaderboard entry', assertFails(
  setDoc(doc(pw(env, UID_B), 'leaderboardEntries', `${CODE}__${UID_B}`),
    { courseId: CODE, uid: UID_B, name: 'B', score: 9999, visible: true })));

await check('owner CAN flip only their own visible flag', assertSucceeds(
  setDoc(doc(pw(env, UID_A), 'leaderboardEntries', LB_A),
    { visible: false }, { merge: true })));

await check('owner CANNOT raise score via the leaderboard entry', assertFails(
  setDoc(doc(pw(env, UID_A), 'leaderboardEntries', LB_A),
    { score: 99999 }, { merge: true })));

await check('cannot flip someone else’s leaderboard visibility', assertFails(
  setDoc(doc(pw(env, UID_B), 'leaderboardEntries', LB_A),
    { visible: false }, { merge: true })));

// ── FACILITATOR DASHBOARD READS (Phase 6.4) ──────────────────────────────────
await check('facilitator CAN read leaderboard (for dashboard)', assertSucceeds(
  getDoc(doc(fac(env, 'fac9'), 'leaderboardEntries', LB_A))));

await check('course owner CAN read passport in their own course', assertSucceeds(
  getDoc(doc(fac(env, 'fac1'), 'passports', PID_A))));

await check('different facilitator CANNOT read passport in another course', assertFails(
  getDoc(doc(fac(env, 'fac9'), 'passports', PID_A))));

await check('course owner CAN read synthesis report in their own course', assertSucceeds(
  getDoc(doc(fac(env, 'fac1'), 'synthesisReports', PID_A))));

await check('course owner CAN query passports by courseId (dashboard list)', assertSucceeds(
  getDocs(query(collection(fac(env, 'fac1'), 'passports'), where('courseId', '==', CODE)))));

// ── COURSES (facilitator-owned; Phase 6.1 setup UI) ──────────────────────────
await check('facilitator CAN create their own course', assertSucceeds(
  setDoc(doc(fac(env, 'fac9'), 'courses', 'NEWCODE'), {
    name: 'X', cohortName: 'C', facilitatorId: 'fac9',
    reflectionPoints: 30, featureFlags: { journal: true } })));

await check('facilitator CANNOT create a course owned by someone else', assertFails(
  setDoc(doc(fac(env, 'fac9'), 'courses', 'SPOOF'), {
    name: 'X', facilitatorId: 'someoneElse', reflectionPoints: 30 })));

await check('participant CANNOT create a course', assertFails(
  setDoc(doc(pw(env, UID_A), 'courses', 'HACK'), {
    name: 'X', facilitatorId: UID_A, reflectionPoints: 999 })));

await check('participant CAN read a course (to resolve their code)', assertSucceeds(
  getDoc(doc(pw(env, UID_A), 'courses', CODE))));

await check('facilitator CAN close/open their own course', assertSucceeds(
  setDoc(doc(fac(env, 'fac9'), 'courses', 'NEWCODE'),
    { status: 'closed' }, { merge: true })));

await check('participant CANNOT change a course status', assertFails(
  setDoc(doc(pw(env, UID_A), 'courses', CODE),
    { status: 'closed' }, { merge: true })));

// ── REDEMPTIONS (server-written only; Phase 6.3) ─────────────────────────────
await check('owner CAN read their own redemption', assertSucceeds(
  getDoc(doc(pw(env, UID_A), 'passports', PID_A, 'redemptions', 'r_coffee'))));

await check('client CANNOT write a redemption directly', assertFails(
  setDoc(doc(pw(env, UID_A), 'passports', PID_A, 'redemptions', 'r_fake'),
    { rewardId: 'r_fake', name: 'Cheat', pointCost: 0, passportId: PID_A, learnerUid: UID_A })));

// ── STORAGE: Passport selfies (Phase 6.1, hardened) ──────────────────────────
await check('owner CAN upload to their own passport-selfies folder', assertSucceeds(
  uploadString(sref(pwStore(UID_A), `passport-selfies/${UID_A}/avatar.jpg`), PNG, 'data_url')));

await check('CANNOT upload into another user’s selfie folder', assertFails(
  uploadString(sref(pwStore(UID_B), `passport-selfies/${UID_A}/avatar.jpg`), PNG, 'data_url')));

await check('unauthenticated CANNOT write passport-selfies', assertFails(
  uploadString(sref(env.unauthenticatedContext().storage(), `passport-selfies/${UID_A}/x.jpg`), PNG, 'data_url')));

await check('regression: Impact Bingo selfies/ stays unauthenticated-writable', assertSucceeds(
  uploadString(sref(env.unauthenticatedContext().storage(), 'selfies/ib_demo.jpg'), PNG, 'data_url')));

await env.cleanup();
// Expected: 44 passed, 0 failed
console.log(`\n${passed} passed, ${failed} failed\n`);
// Windows + the Firebase SDK keep emulator sockets open for a tick; calling
// process.exit() immediately races libuv handle-closing and aborts with a
// false non-zero (UV_HANDLE_CLOSING) even when every assertion passed. Set
// the real exit code and let outstanding handles close first.
process.exitCode = failed ? 1 : 0;
setTimeout(() => process.exit(process.exitCode), 400);
