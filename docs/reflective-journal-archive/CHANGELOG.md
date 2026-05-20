# Changelog

All notable changes to this project are recorded here. Format loosely follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/).

## How agents should use this file

- **Read the latest entry before starting work** — it tells you the current state.
- **Add an entry for every meaningful change** in the same commit as the change. "Meaningful" = anything another agent would want to know: features, scope changes, dependency additions, decision resolutions, schema changes.
- **Don't edit past entries** except to fix factual errors. Add a new entry instead.
- **Version bumps:**
  - **MAJOR** — breaking change to the data model, public API, or product behaviour described in `SPEC.md`.
  - **MINOR** — new feature or roadmap phase completed.
  - **PATCH** — fixes, doc edits, internal refactors.
- **`[Unreleased]`** holds in-flight work. When a coherent set of changes is ready, give it a version + date and start a fresh `[Unreleased]` block.

Entry shape:

```
## [x.y.z] — YYYY-MM-DD
### Added       (new features)
### Changed     (changes to existing behaviour)
### Deprecated  (soon-to-be removed)
### Removed     (now removed)
### Fixed       (bug fixes)
### Decided     (open decisions resolved — link to SPEC.md §12)
### Schema      (Firestore data model changes — link to SPEC.md §8)
```

---

## [Unreleased]

_Nothing yet._

---

## [0.4.0] — 2026-05-13

Phase 0 complete. Foundation is live — stub pages deployed to `game.knywong.com/reflectivejournal`. Starting Phase 1.

Phase 0 infrastructure: Firebase config, security rules, Functions stub, CI, and single-project architecture.

### Added
- `.firebaserc` — points to `impact-bingo` project (single project for all activities).
- `firebase.json` — emulators + firestore only; used for local dev and CI rules tests. Deployment uses the platform-level `learning-activities/firebase.json`.
- `firestore.rules` — security rules for this activity (mirrored in `learning-activities/firestore.rules` which is what gets deployed).
- `firestore.indexes.json` — composite index on `responses.(participantId, activityId)`.
- `tests/firestore.rules.test.ts` — rules unit tests covering facilitator profiles, workshop read/write, response ownership, and summary write-protection. Uses `@firebase/rules-unit-testing` + Jest against the Firestore emulator.
- `jest.config.ts` — Jest config for ts-jest, `node` test environment.
- `.github/workflows/ci.yml` — CI on push/PR to `main`: lint, typecheck (Next.js), Firestore rules tests via emulator.
- `src/app/facilitator/page.tsx` — stub facilitator page at `/reflectivejournal/facilitator` (Phase 1 will wire up auth + Control Room).

### Added (platform level — `learning-activities/`)
- `firebase.json` — combined hosting (all activities), firestore, functions, emulators. Single deploy point.
- `.firebaserc` — `impact-bingo` project.
- `firestore.rules` — combined rules: impact-bingo + reflective-journal.
- `firestore.indexes.json` — combined indexes.
- `functions/src/reflectiveJournal/generateSummary.ts` — `generateSummary` stub; real Gemini call in Phase 1.
- `scripts/deploy.sh` — builds all activities, assembles `public/`, deploys to Firebase.

### Changed
- **Architecture:** consolidated from two Firebase projects (`impact-bingo` + `reflective-journal-kny`) to one (`impact-bingo`). Platform-level Firebase config lives at `learning-activities/`, activity folders are app code only.

### Decided
- **D6 — Firebase Hosting routing:** single `impact-bingo` Firebase project. `game.knywong.com` custom domain on that project. Platform `firebase.json` at `learning-activities/` covers all activities. Deploy via `scripts/deploy.sh`. See `SPEC.md` §7.4, §12.

---

## [0.3.0] — 2026-05-13

Major architectural correction after discovering Reflective Journal is **one of many learning activities** under the existing `game.knywong.com` SaaS, not a standalone product. Triggered by the user clarifying that facilitators sign in once to the platform (Google) and access activities at sub-paths, and that the existing `impact-bingo` activity (in `C:\Users\knywo\learning-activities\impact-bingo`) sets the pattern.

### Changed (architecture)
- **Deployment model:** Reflective Journal is now a sub-path activity served at `game.knywong.com/reflectivejournal` (participant) and `game.knywong.com/reflectivejournal/facilitator` (facilitator). It is not a standalone product. See `SPEC.md` §1, §7.4.
- **Folder location:** project moves from `C:\Users\knywo\reflective-journal\` to `C:\Users\knywo\learning-activities\reflective-journal\` to sit alongside `impact-bingo` and any future activities. (Move executed manually by the user — folder was locked while the editing session was open.)
- **Facilitator auth:** changed from email/password to **Google Sign-In** (Firebase Auth, Google provider) to match the rest of the platform. Participant anonymous auth unchanged. See `SPEC.md` §2, §4.2, §8.1.
- **Frontend build:** Next.js now configured with `output: "export"` and `basePath: "/reflectivejournal"`. Same deployment shape as `impact-bingo` (static files served by Firebase Hosting) while keeping React/TypeScript/Tailwind for dev ergonomics. See `next.config.ts` and `SPEC.md` §7.1.
- **Data model — `facilitators/{uid}`:** now records Google profile fields (`email`, `displayName`, `photoURL`) on first sign-in instead of email/password registration metadata. See `SPEC.md` §8.

### Added
- `SPEC.md` §1 — platform context paragraph explaining Reflective Journal's place in the `game.knywong.com` SaaS.
- `SPEC.md` §7.4 — deployment & platform integration section covering project layout, build → deploy pipeline, sub-path routing, and the multi-site vs. custom-domain question.
- New open decision **D6** (Firebase Hosting routing strategy) in `SPEC.md` §12.

### Decided
- **Stack:** Next.js with static export, not plain HTML. Chosen because Reflective Journal's UI has substantially more state (live activity switching, autosave, multiple activity types, realtime completion counts) than `impact-bingo`'s single-screen bingo card. Static export keeps deployment identical to existing activities.
- **Auth pattern:** match `impact-bingo` (Google Sign-In, separate Firebase project per activity). User experience is "single sign-in" because Google OAuth re-consents instantly between projects.

### Removed
- Earlier plan to use Firebase Auth email/password for facilitators. Replaced by Google Sign-In above.
- Earlier framing of Reflective Journal as a standalone product. Replaced by sub-path activity framing above.

---

## [0.2.1] — 2026-05-13

### Added
- Scaffolded Next.js 15 app at repo root: TypeScript, Tailwind CSS v4, ESLint, App Router, `src/` layout, Turbopack dev server. Created via `create-next-app`.
- Next.js shipped its own `AGENTS.md` warning block ("This is NOT the Next.js you know"); preserved and merged into the project `AGENTS.md`.
- `CLAUDE.md` at root (auto-created by Next) imports `AGENTS.md` so Claude Code sessions pick it up.

### Changed
- `AGENTS.md` "Stack at a glance" line now names Gemini 2.0 Flash (was Anthropic) to match v0.2.0 decision.

---

## [0.2.0] — 2026-05-13

### Decided
- **D1 — Hosting:** Firebase Hosting. One vendor, one CLI, one bill. Vercel not needed since the participant UI is a thin Firestore client and the AI call lives in Functions. See `SPEC.md` §7.1.
- **D2 — Participant identity:** Firebase anonymous auth. Stable uid with zero UX cost; makes security rules trivial. See `SPEC.md` §7.1, §8.1.
- **D3 — AI provider:** Google Gemini 2.0 Flash via AI Studio API, free tier. Chosen because Anthropic and OpenAI only offer signup credits, not a true free tier. Abstracted behind `generateSummary()` for later swap to Anthropic Claude when paid usage is justified. Privacy caveat: Google free tier may train on prompts — disclosed to participants on the join screen. See `SPEC.md` §6.4, §7.1.
- **D4 — `table` activity config:** Fixed at creation. Editing columns mid-session would require migrating partial responses; deferred to Phase 3 if facilitators ask. See `SPEC.md` §5.2.
- **D5 — Summary regeneration:** Once, with **one** "include new responses" override if the participant submits more after generating. After that, locked. Keeps the summary code stable and AI costs predictable. See `SPEC.md` §6.5 (new section).

### Added
- `SPEC.md` §6.5 — explicit regeneration policy.

### Changed
- `SPEC.md` §12 — D1–D5 moved out of open decisions into a resolved table. Section now empty pending new decisions.

---

## [0.1.0] — 2026-05-13

### Added
- Initial project spec at `SPEC.md` covering product summary, users, flows, activity model, AI summary contract, Firestore data model, security rules outline, NFRs, MVP scope, and a glossary.
- Roadmap at `ROADMAP.md` with five phases and exit criteria per phase. Phase 0 marked in progress.
- This changelog at `CHANGELOG.md` with the format rules above.
- Agent entry-point doc at `AGENTS.md` pointing all coding agents at these three files.

### Decided
- Database: Cloud Firestore (not Realtime Database). See `SPEC.md` §7.1.
- AI summary section count and order: four sections, fixed order. See `SPEC.md` §6.1.
- MVP activity types locked: `reflection`, `kiss`, `table`, `commitment`. Everything else is post-MVP. See `SPEC.md` §11.

### Open
- D1 (hosting), D2 (participant identity), D3 (AI provider), D4 (table config mutability), D5 (summary regeneration policy). All tracked in `SPEC.md` §12; must be resolved before their owning phase starts.
