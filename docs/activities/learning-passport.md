# Activity: Learning Passport

**Status:** In progress — Phase 6.0 thin slice (see ROADMAP)
**Sub-path:** `game.knywong.com/passport`
**Source:** `learning-passport/public/`
**PRD:** Learning Passport PRD v0.3 (external — `C:\Users\knywo\Learning Passport\`)

---

## What it is

The participant home of the platform. Unlike other activities, it is not a
single exercise — it is the durable shell a participant returns to: identity
card, journal, resources, activities, score, certificate. Other activities
become tiles inside it.

**One-line:** A personal, kept-forever record of a workshop, born from a code.

---

## Identity model (differs from every other activity)

| User | Auth |
|---|---|
| Participant | **Email + password** Firebase Auth (`uid`). The ONLY learner identity. |
| Facilitator | Google Sign-In + role claim (unchanged platform pattern). |

The nickname / anonymous-learner model used by Impact Bingo and Reflective
Journal is **not** used here. Rules gate participants via `isPasswordUser()`.

## The security invariant

`score` is **never** writable by a client. Firestore rules reject every
client write to `passports.score` and to the `passports/{id}/rewards`
ledger. Points exist only via the `awardPassportPoints` Cloud Function
(Admin SDK). This is the single property the thin slice exists to prove —
see `learning-passport/tests/rules.test.mjs`.

---

## Firestore data model (thin slice)

```
learners/{uid}                      // owner-only profile
  uid, email, displayName, position, createdAt

passports/{uid}_{workshopCode}      // id binds to owner + course
  learnerUid, workshopCode, courseId, passportNumber,
  displayName, position, score (server-only), status, createdAt
  rewards/{entryId}                 // server-written idempotency ledger

journalEntries/{passportId}__{questionId}
  passportId, learnerUid, questionId, response, wordCount,
  submitted, submittedAt

courses/{workshopCode}              // facilitator-owned
  name, cohortName, facilitatorId, reflectionPoints
```

## Cloud Functions

- `awardPassportPoints({ passportId, entryId })` — sole trusted writer of
  `score`. Validates owner + submitted entry, awards course-configured
  points once (idempotent), returns new score.
- `deleteLearnerAccount({})` — hard delete (PRD §4). Cascades all the
  caller's passports (+ rewards), journal entries, learner profile, and
  Firebase Auth user. Client deletes are rule-forbidden; this is the only
  deletion path.

## Facilitator (Phase 6.1)

`game.knywong.com/passport/facilitator` — Google sign-in + role gate
(`facilitator`/`admin`/bootstrap email, matching the platform pattern).
Creates `courses/{CODE}` with name, cohort, `reflectionPoints`,
`reflectionQuestion`, and `featureFlags{}`. This replaces the emulator
seed script for real use. The participant grid renders only the features
whose flag is true (Journal & Settings always; built features live, the
rest "Soon"). Hosting: `/passport/facilitator` rewrites are ordered
before the `/passport/**` catch-all in `firebase.json`.

## Selfie + pre-registration (Phase 6.1)

- **Selfie:** client canvas square-crop + downscale to a ~360px JPEG →
  `passport-selfies/{uid}/avatar.jpg`. This is a **separate Storage path**
  with an auth+owner-scoped rule; Impact Bingo's intentionally
  unauthenticated `selfies/` path is untouched. Stored as `selfieUrl` on
  the learner (reused across all their passports); renders as the avatar
  on profile, shelf and card. Capture at onboarding (optional) and
  Settings → Replace selfie. Storage emulator added to `firebase.json`
  (port 9199). **Reminder:** `deploy.cmd`/`.sh` do NOT deploy Storage
  rules — run `firebase deploy --only storage` separately.
- **Pre-registration:** courses carry `status` (`active`/`closed`).
  Participants cannot mint a NEW passport for a `closed` cohort, but
  anyone who already has one keeps full access (PRD: close locks signups,
  passports retained). Facilitator toggles open/closed per course.

## Journal & synthesis (Phase 6.2)

- Facilitator authors `courses.journalQuestions[]` (topic · objective ·
  prompt). Participant Journal = list + per-question detail, answer any
  order, progress bar; each submit → question-generic `awardPassportPoints`.
- `generatePassportSynthesis({passportId})` — owner-only, requires ALL
  questions answered, idempotent (`synthesisReports/{passportId}`,
  server-write-only). Gemini 2.5 Flash → structured JSON (exec summary,
  per-reflection insight+next step, 3 commitments, manager one-pager,
  capstone) with anti-fabrication guard + JSON-parse retry. Renders a
  branded PDF via `pdfkit`, stores it at `passport-reports/{uid}/` and
  returns a long-lived **signed URL** (storage path fully locked; the
  signed URL is the only access). Needs `GEMINI_API_KEY` (existing
  platform secret).

## Security gate

`learning-passport/tests` — **32 assertions**, Firestore + Storage
emulators (`npm test`). Covers score immutability, ownership/isolation,
shelf queries, multi-question entries, course create/read/status, the
hardened selfie Storage rules (+ Impact Bingo non-regression), and
synthesis-report read isolation / server-only write. The gate is
rules-only; the AI function itself needs the Functions emulator + key or
a deploy to run live.

## Phase 6.1 shell (built)

`learning-passport/public/index.html` is now the full participant shell:
auth → profile → **passport shelf** (lists own passports via a
`where('learnerUid','==',uid)` query) → **add passport** (one per code) →
**identity card + feature grid** (Journal & Settings live; Resources /
Activities / Leaderboard / Rewards render as "Soon") → **Journal**
(reflection → server-awarded score) → **Settings** (edit profile, sign
out, hard-delete). Not deployed.

---

## Run the security gate (Phase 6.0 exit)

```
cd learning-passport/tests
npm install                # one-time
npm test                   # firebase emulators:exec --only firestore "node rules.test.mjs"
```

Requires Java (Firestore emulator). All assertions must be green before
Phase 6.1 begins. Not deployed to production until the gate passes.

## Manual click-through (optional)

```
firebase emulators:start                       # terminal 1 (repo root)
cd learning-passport/tests && npm run seed     # terminal 2 — seeds courses/AX7K2M
# open the hosting URL's /passport (default http://127.0.0.1:5002/passport)
# sign up: any email + 6+ char password + code AX7K2M
```

The page shows an "Emulator" tag when on localhost and submitting the
reflection should bump the score pill via `awardPassportPoints`.

## Deployment

Source `learning-passport/public/` → `public/passport/` via
`scripts/deploy.sh` / `deploy.cmd`. No build step. (Not yet deployed.)
