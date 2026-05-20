# learning-activities — Platform Roadmap

**Platform:** `game.knywong.com` (learning activities) + `knywong.com` (main site + resources)
**Firebase project:** `learning-activities-kny` (migrating from `impact-bingo`)
**Last updated:** 2026-05-14

Agents working on platform-level code: read this file, then `CLAUDE.md`, then `docs/PLATFORM-SPEC.md`.
Agents working on a specific activity: read this file, then the activity's doc in `docs/activities/`.

---

## Folder structure

### Current (as-is)

```
learning-activities/
├── .firebaserc                        # → impact-bingo (stale — see Phase 0)
├── firebase.json                      # Platform: hosting, firestore, functions, emulators
├── firestore.rules                    # Combined rules for all activities
├── firestore.indexes.json             # Combined indexes for all activities
├── docs/
│   └── reflective-journal-archive/   # Old Next.js attempt (archived docs)
├── functions/
│   └── src/index.ts                   # Stub — initializeApp only
├── impact-bingo/                      # Activity source (HTML/CSS)
│   └── public/
├── public/                            # Assembled deploy output (generated)
│   ├── index.html                     # Placeholder
│   ├── dashboard/                     # ⚠ Orphan — not tied to any activity
│   ├── facilitator/                   # ⚠ Orphan — not tied to any activity
│   └── impactbingo/                   # Impact Bingo built files
├── reflective-journal/                # Activity source (rebuilding as HTML/CSS)
│   └── reflective-journal-archive/   # ⚠ Duplicate of docs/reflective-journal-archive/
├── scripts/
│   ├── deploy.sh                      # ⚠ Still references Next.js build
│   └── deploy.cmd
└── tree.txt                           # ⚠ Stale artifact — delete
```

### Target (clean state)

```
learning-activities/
├── ROADMAP.md                         # This file
├── CLAUDE.md                          # AI agent entry point
├── .firebaserc                        # → learning-activities-kny
├── firebase.json                      # Platform config
├── firestore.rules                    # All activities' rules (namespaced)
├── firestore.indexes.json             # All activities' indexes
├── docs/
│   ├── PLATFORM-SPEC.md              # Auth design, routing, deployment
│   ├── activities/
│   │   ├── impact-bingo.md           # Impact Bingo spec
│   │   └── reflective-journal.md     # Reflective Journal spec
│   └── archive/
│       └── reflective-journal-next/  # Old Next.js attempt (reference only)
├── functions/
│   └── src/
│       ├── index.ts                   # Exports all functions
│       ├── auth/
│       │   └── syncRole.ts           # Role sync: Firestore → custom claims
│       └── activities/
│           ├── impactBingo/           # Impact Bingo functions
│           └── reflectiveJournal/
│               └── generateSummary.ts
├── impact-bingo/                      # Activity source (HTML/CSS)
│   └── public/
├── reflective-journal/                # Activity source (HTML/CSS)
│   └── public/
├── public/                            # Assembled deploy output (gitignored content)
│   ├── .gitkeep
│   └── [activity-slug]/              # e.g. impactbingo/, reflectivejournal/
└── scripts/
    ├── deploy.sh
    └── deploy.cmd
```

**Adding a new activity checklist** (for any future activity):
1. Create `[activity-name]/public/index.html` + `facilitator/index.html`
2. Add spec doc at `docs/activities/[activity-name].md`
3. Add Firestore rules namespace to `firestore.rules`
4. Add Cloud Functions (if needed) to `functions/src/activities/[name]/`
5. Add hosting rewrites to `firebase.json`
6. Update `scripts/deploy.sh` to copy source → `public/[slug]/`
7. Add a phase entry to this ROADMAP

---

## Phase 0 — Firebase project migration `[current]`

Goal: move from `impact-bingo` to `learning-activities-kny`. No production data exists, so migration is clean.

- [x] Create new Firebase project `learning-activities-kny` in Firebase Console
- [x] Enable: Authentication (Google provider), Firestore, Cloud Functions (Blaze plan), Hosting
- [x] Register a Web App, copy the Firebase config object (apiKey, projectId, etc.)
- [x] Add custom domain `game.knywong.com` to Hosting
- [x] Update `.firebaserc` (root) → `learning-activities-kny`
- [x] Update `impact-bingo/.firebaserc` → `learning-activities-kny`
- [x] Update Firebase SDK config in all `impact-bingo/public/` HTML files
- [x] Run `firebase deploy` from root — verify clean deploy on new project
- [ ] Decommission old `impact-bingo` Firebase project *(low priority — no traffic)*

**Exit:** `game.knywong.com` serves impact-bingo from `learning-activities-kny`.

---

## Phase 1 — Platform auth system

Goal: role-based auth that works across all activities and `knywong.com`. Facilitators, members, and admins authenticate via Google Sign-In. Learners in activities use anonymous auth (no login needed).

### Role model

| Role | Access |
|---|---|
| `member` | Sign in, download resources from knywong.com |
| `facilitator` | Member + create/run workshops, access activity control rooms and dashboards |
| `admin` | Facilitator + manage user roles, platform-wide settings |

**Adding a new role:** Set `users/{uid}.role = 'newrole'` in Firestore. The `syncRole` function auto-pushes it to the Firebase Auth custom claim. Security rules pick it up instantly. No schema changes needed.

### Architecture

- `users/{uid}` — Firestore doc: `role`, `email`, `displayName`, `photoURL`, `createdAt`
- `syncRole` Cloud Function — triggers on `users/{uid}` write, calls `admin.auth().setCustomUserClaims(uid, { role })`
- Security rules check `request.auth.token.role` — single source of truth across all activities
- All activities share the same Firebase project and Auth pool — no per-activity login needed

See `docs/PLATFORM-SPEC.md` for the full data model and security rules design.

### Tasks

- [x] Write `functions/src/auth/syncRole.ts` — Firestore onWrite trigger on `users/{uid}`
- [x] Export `syncRole` from `functions/src/index.ts`
- [x] Add `users/{uid}` rules to `firestore.rules` (owner read, admin role-write)
- [x] **BOOTSTRAP** Set `users/{YOUR_UID}.role = 'admin'` in Firestore Console, then sign out + back in to get the claim
- [x] Test: set role in Firestore → verify custom claim on token
- [x] Update impact-bingo facilitator page to check `token.role == 'facilitator'` (not just Google sign-in)
- [x] Write `docs/PLATFORM-SPEC.md`

**Exit:** Sign in with Google → set role in Firestore → facilitator access works across all activities.

---

## Phase 2 — Activity: Impact Bingo ✅ SHIPPED

Goal: wire existing Impact Bingo into the shared auth system on the new project.

- [x] Facilitator page checks `token.role` is `facilitator` or `admin`
- [x] Firestore rules updated for new role-based claims
- [ ] Seed script updated for `learning-activities-kny` *(demo session already created manually — low priority)*
- [x] Write `docs/activities/impact-bingo.md`

**Exit:** Impact Bingo works end-to-end on the new project with role-checked facilitator access.

---

## Phase 3 — Activity: Reflective Journal `[in progress]`

Goal: full MVP in plain HTML/CSS/vanilla JS, matching the impact-bingo pattern.
See `docs/activities/reflective-journal.md` for the full spec.

### MVP tasks

- [x] Participant: join page (6-char code + nickname) → anonymous auth → waiting state
- [x] Participant: `reflection` activity (text area, autosave + submit)
- [x] Participant: AI summary generation → 4-section output + summary code
- [x] Participant: summary retrieval by code
- [x] Participant: anonymous auth signs in at page load (invisible, stable UID across refreshes)
- [x] Facilitator: create workshop → 6-char code generated (client-side, collision-checked)
- [x] Facilitator: Control Room — live participant count, push activity, completion counter
- [x] Facilitator: unlock summary generation
- [x] Facilitator: auth-gated (Google sign-in via unified portal at `/facilitator/`)
- [x] Wire `functions/src/activities/reflectiveJournal/generateSummary.ts` to Gemini 2.0 Flash
- [x] Facilitator: role-checked (`token.role == 'facilitator'`) — was Google-auth only, now role-aware
- [x] Mobile QA (iOS Safari, Chrome Android)
- [x] **BLOCKER**: Add `game.knywong.com` to Firebase Auth authorized domains

### Phase 3A — Planned Reflective Journal `[shipped]`

Redesign from ad-hoc single-activity push → pre-planned, objective-aligned journal.

- [x] Training-info form: title, pax, duration, client?, venue? (autosaved)
- [x] 3-column plan table, seeded with 3 draft rows (topic+objective · question · actions)
- [x] Per-row state machine: draft → confirmed → live → complete (+ re-open)
- [x] Firestore rules: participants only read activities in state live/complete
- [x] Composite index: activities (state, order)
- [x] Participant journal list — answer any live row in any order, status chips
- [x] AI summary: training title + per-activity topic/objective fed in, objective-aligned with anti-fabrication guard
- [ ] **Phase B:** branded PDF export (individual summaries)
- [ ] **Phase C:** cohort synthesis + pax-based live progress + drag-reorder

### Post-MVP activity types

- [ ] `kiss` (Keep / Improve / Stop / Start)
- [ ] `table` (configurable columns)
- [ ] `commitment` (action + date)

**Exit:** facilitator pre-plans a journal → participants self-pace through live rows → objective-aligned summary code.

---

## Phase 4 — Platform homepage (game.knywong.com)

Goal: activity hub at the root URL. Member resource section and admin UI are post-MVP.

- [x] `public/index.html` — platform homepage (Facilitator portal + Participant activity picker)
- [ ] Admin UI — promote member → facilitator via UI *(currently done directly in Firestore Console)*
- [ ] Resource download section — gated to `member`+ *(Phase 5 dependency)*

---

## Phase 5 — Future activities

Planned (not yet scheduled):

| Activity | Description |
|---|---|
| `peer-review` | Structured peer feedback |
| `live-poll` | Real-time poll with results wall |
| `scenario-sim` | Branching scenario simulation |

Each follows the checklist in the "Adding a new activity" section above.

---

## Phase 6 — Learning Passport `[in progress]`

The participant home of the platform: email/password account → one passport per
workshop code → identity card → journal → server-awarded score → synthesis.
Spec: `docs/activities/learning-passport.md`. PRD: external (Learning Passport
PRD v0.3). Identity is email/password `uid` only — the Passport never uses the
nickname/anonymous learner model.

### Phase 6.0 — Thin slice (security gate) `[PASSED ✓ 2026-05-18]`

Proves the one novel, security-critical path before any breadth.

- [x] `isPasswordUser()` + `/learners` `/passports` `/journalEntries` `/courses` rules — **`score` is unwritable by any client**; passport id bound to `<uid>_<code>`; owner-only reads
- [x] `awardPassportPoints` Cloud Function — sole trusted score writer, idempotent per reflection, points from course config (not the client)
- [x] `learning-passport/public/index.html` — signup → profile → identity card → 1 reflection → server-awarded score; emulator-aware
- [x] `firebase.json` rewrites (`/passport`, `/passport/**`) + `deploy.sh`/`deploy.cmd` copy step
- [x] Adversarial rules test `learning-passport/tests/rules.test.mjs` (client score write rejected; cross-user read denied; creation constraints)
- [x] **Run the gate:** `npm test` → 15 passed, 0 failed (2026-05-18, Java/OpenJDK 21 installed)
- [ ] Manual click-through on the emulator suite (seed `courses/AX7K2M`) *(optional)*

**Exit:** ✓ MET — the security test passed; a client provably cannot forge score. NOT yet deployed to production.

### Phase 6.1 — Participant shell `[in progress]`

- [x] Login + passport shelf (one passport per workshop code) + add-passport
- [x] Identity card + feature grid (Journal + Settings live; others render as "Soon")
- [x] Settings: edit profile, sign out, hard-delete account (`deleteLearnerAccount` fn)
- [x] Rules gate extended for the shelf query (own-only list; unfiltered list denied)
- [x] Feature-flag driven grid (tiles show/hide per course `featureFlags`)
- [x] Minimal facilitator course-setup UI at `/passport/facilitator` (Google + role gate; replaces the seed script) + `firebase.json` facilitator rewrites ordered before `/passport/**`
- [x] Selfie pipeline — canvas downscale → `passport-selfies/{uid}/` (auth+owner scoped, separate path so Impact Bingo's unauthenticated `selfies/` is untouched); avatar renders on profile/shelf/card; capture at onboarding + Settings
- [x] Pre-registration front door — course `status`; participants can't mint a NEW passport for a `closed` cohort (existing passports keep full access); facilitator open/close toggle per course
- [x] Gate re-run after Phase 6.1 → **28 passed, 0 failed** (2026-05-18). Trailing Windows libuv `UV_HANDLE_CLOSING` abort is post-tally teardown noise, not a failure; exit hardened so the code now reflects the real result.

**Phase 6.1 COMPLETE ✓ (28/28). Not deployed.**

### Phase 6.2 — Journal & synthesis `[in progress]`

Merge the Reflective Journal in as the real Journal (PRD D2).

- [x] Facilitator authors a journal question bank (topic · objective · prompt; add/remove rows) → `courses.journalQuestions[]` (legacy `reflectionQuestion` kept as fallback)
- [x] Participant Journal lists all questions, answer any order, progress bar + all-done state; each submit server-awards points via the question-generic `awardPassportPoints`
- [x] Gate +1 (multi-question entry) → **29 assertions**; seed updated to a 3-question bank
- [x] `generatePassportSynthesis` Cloud Function — Gemini 2.5 Flash → structured JSON (exec summary, per-reflection insight + next step, 3-part action plan, manager one-pager, capstone); anti-fabrication guard; JSON parse + one retry; one-shot/idempotent (`synthesisReports/{passportId}`, server-write-only rule)
- [x] Server-side branded PDF via `pdfkit` → Storage `passport-reports/{uid}/` → long-lived signed URL (storage path locked; client never reads/writes it directly)
- [x] Participant: all-done → generate → preparing → report (certificate + capstone + exec summary + action plan + PDF download); re-open shows cached report
- [x] Gate +3 (synthesis report read isolation + server-only write) → **32 assertions**

**Phase 6.2 COMPLETE pending the 32/32 gate run.** Note: the gate is rules-only (Firestore+Storage emulators); the synthesis *function* itself needs the Functions emulator + `GEMINI_API_KEY` (already a platform secret) or a deploy to exercise live.

### Phase 6.3 — Gamification `[in progress]`

- [x] **Leaderboard** — `awardPassportPoints` upserts a server-only `leaderboardEntries/{courseId}__{uid}` projection (first name + score only; passports stay private). Cohort screen: top 10 + medals + own-row highlight + own rank if outside top 10. Privacy: owner may flip only their own `visible` flag (rule-enforced; score still server-only); Settings toggle + `passport.visibleToCohort`. Gate +5 → **37 assertions**.
- [x] **Rewards / redemption** — facilitator authors `courses.rewards[]` (name + pointCost) in course-setup UI. `redeemReward` Cloud Function: ownership check, course-configured cost, atomic transaction (score decrement + `passports/{pid}/redemptions/{rewardId}` ledger), idempotent. Rules: `redemptions` subcollection `write:false`, owner read. Participant Rewards screen: per-reward state (can afford / not enough / already claimed). Gate +2 → **39 assertions**. tsc CLEAN. NOT deployed.
- [x] **Activities as tiles** — facilitator authors `courses.activityLinks[]` (name, description, URL) in course-setup UI. Participant Activities screen shows cards with open links. Grid tile live. No rule changes.
- [x] **Facilitator dashboard** — per-course "Stats ↓" in course list: participant count, avg score, top-5 table from leaderboardEntries. Rule change: `leaderboardEntries` + `passports` + `synthesisReports` all allow facilitator read for own-course. Gate +4 → **43 assertions**. tsc CLEAN. NOT deployed.
- [x] **Cohort CSV export** — "Export CSV" button in dashboard: downloads `passport-cohort-{CODE}.csv` (name, score, visible) from leaderboardEntries client-side, no backend needed.
- [x] **Reminder emails** — `sendPassportReminders` Cloud Function: facilitator-only, queries passports by courseId (Admin SDK), skips participants who completed all reflections, sends via Resend REST API (no SDK, avoids React type dep). Requires `RESEND_API_KEY` Firebase secret. "Send reminders" button in dashboard shows sent/skipped count. tsc CLEAN.
- [x] **Full participant detail** — dashboard table now shows all participants (name, position, score, Report ✓/Pending) from passport query + parallel synthesisReport existence checks. Gate +1 (facilitator query) → **44 assertions**. Verified 44/44 autonomously.

### Phase 6 FEATURE-COMPLETE ✓ (2026-05-19)
All planned v1 features built and gate-verified. NOT deployed.
**To deploy:** `scripts/deploy.cmd` (hosting + functions + Firestore rules), then separately `firebase deploy --only storage` for storage.rules.
**One secret to add before reminders work:** `RESEND_API_KEY` via Firebase Console → Functions → Secrets.

### Phase 6.2+ — see PRD v0.3 (journal+synthesis → gamification → polish)

---

## Cleanup backlog

- [x] Delete `reflective-journal/reflective-journal-archive/` — duplicate of `docs/reflective-journal-archive/`
- [x] Delete `public/dashboard/` and `public/facilitator/` — orphan artifacts
- [x] Remove `/facilitator` and `/dashboard` rewrites from `firebase.json` — replaced with correct activity-scoped rewrites
- [x] Update `scripts/deploy.sh` — removed Next.js build step, now plain HTML copy for reflective-journal
- [x] Delete `tree.txt`
