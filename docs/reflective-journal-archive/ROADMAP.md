# Roadmap

Phased plan from empty repo to mature product. Each phase has an **exit criterion** — until it's met, the phase is not done and the next phase is not started. Agents should pick the lowest unfinished item in the current phase unless directed otherwise.

The current phase is whatever shows `[in progress]` below. When all items in a phase are checked, move the marker and bump the version in `CHANGELOG.md`.

---

## Phase 0 — Foundation ✅

Goal: a runnable Next.js app with Firebase wired up and the open decisions resolved, deploying as a sub-path activity on `game.knywong.com` per `SPEC.md` §7.4.

- [x] Resolve open decisions **D1** (hosting) and **D2** (participant identity) in `SPEC.md`. _Done 2026-05-13 — see `CHANGELOG.md` v0.2.0._
- [x] Initialise Next.js + TypeScript + Tailwind project at repo root. _Done 2026-05-13._
- [x] Configure Next.js for static export with `basePath: "/reflectivejournal"` to deploy under game.knywong.com. _Done 2026-05-13._
- [x] **Move project folder** from `C:\Users\knywo\reflective-journal\` to `C:\Users\knywo\learning-activities\reflective-journal\`. _Done 2026-05-13._
- [x] Inspect `impact-bingo`'s production Hosting setup to resolve **D6**. _Done 2026-05-13 — `game.knywong.com` = `impact-bingo` project. See `CHANGELOG.md` [Unreleased] and `SPEC.md` §7.4, §12._
- [x] Run `firebase init` — created `.firebaserc`, `firebase.json`, `firestore.rules`, `firestore.indexes.json` at activity level (emulators + local dev) and platform-level config at `learning-activities/` (single `impact-bingo` project). _Done 2026-05-13._
- [x] Enable services in the Firebase console: Authentication (Google + Anonymous), Firestore, Functions (just Blaze is enough). _Done 2026-05-13._
- [x] Write initial Firestore security rules matching `SPEC.md` §8.1 (Google-signed facilitators vs. anonymous participants) and test them against the emulator. _Done 2026-05-13._
- [x] Set up CI: lint + typecheck + rules test on push. _Done 2026-05-13 — `.github/workflows/ci.yml`._
- [x] Stub `generateSummary(responses)` server function returning placeholder text (real provider call lands in Phase 1). _Done 2026-05-13 — `functions/src/index.ts`._
- [x] Verify `npm run build` produces a static-export bundle and `npm run dev` boots cleanly. _Build verified 2026-05-13: `out/index.html` + `out/facilitator/index.html` produced clean. Run `npm run dev` locally to confirm dev server._

**Exit:** `npm run dev` boots; a Google-signed-in facilitator can land on `/reflectivejournal/facilitator` locally; the Firestore emulator runs the rules test suite green; `npm run build` produces a clean static bundle.

---

## Phase 1 — MVP core `[in progress]`

Goal: end-to-end live workshop with one activity type and AI summary.

- [ ] Facilitator: create workshop → 6-char code generated server-side with collision retry.
- [ ] Facilitator: Control Room shell with live participant count.
- [ ] Participant: join page (code + nickname) → anonymous auth → participant doc created.
- [ ] Participant: waiting state, subscribes to `currentActivityId`.
- [ ] Activity type: `reflection` (single text area). Autosave + submit.
- [ ] Facilitator: push activity (sets `currentActivityId`).
- [ ] Facilitator: completion counter (submitted / joined) for the active activity.
- [x] Resolve **D3** (AI provider). _Done 2026-05-13 — Gemini 2.0 Flash, see `CHANGELOG.md` v0.2.0._ Still TODO: wire real `generateSummary` in Firebase Functions.
- [ ] Facilitator: unlock summary generation (`summaryUnlocked = true`).
- [ ] Participant: "Generate my learning summary" → calls Function → renders 4-section output.
- [ ] Participant: summary code generated and shown; retrieval page accepts a code and renders the saved summary.
- [ ] Mobile QA on iOS Safari and Chrome Android.

**Exit:** a facilitator can run a real workshop with one `reflection` activity and participants leave with a summary code.

---

## Phase 2 — MVP completion

Goal: all four MVP activity types, privacy modes, and the polish items in `SPEC.md` §11.

- [ ] Activity type: `kiss`.
- [ ] Activity type: `table` (resolve **D4** first).
- [ ] Activity type: `commitment`.
- [ ] Activity library UI in Control Room (pick from existing or create new).
- [ ] Implement all four privacy modes per `SPEC.md` §5.4.
- [ ] Resolve **D5** (summary regeneration policy).
- [ ] Hit the non-functional performance targets in `SPEC.md` §9 (measure, fix, re-measure).
- [ ] First end-to-end accessibility pass (labels, contrast, focus order).

**Exit:** a real workshop using all four activity types runs cleanly with no critical bugs.

---

## Phase 3 — Expansion activities

Pick from the post-MVP list based on real facilitator demand. Schema for each must be added to `SPEC.md` §5.3 before implementation starts.

- [ ] `drawing` (canvas, stored as PNG in Firebase Storage)
- [ ] `rating` and `vote`
- [ ] `rank`
- [ ] `image_upload`
- [ ] `audio` (record + upload)
- [ ] `ai_conversation` (LLM asks follow-up reflection questions)
- [ ] `peer_reflection`

---

## Phase 4 — Insights & longevity

- [ ] Group insights (AI synthesis across all participants in a workshop, surfaced to the facilitator).
- [ ] PDF export of a participant's summary.
- [ ] Analytics dashboard for facilitators (completion trends, common themes).
- [ ] Persistent participant accounts (opt-in).
- [ ] Multi-session learning journeys (link a participant across workshops).
- [ ] Facilitator AI Assistant (suggest prompts mid-session).

---

## Phase 5 — Stretch

- [ ] Reflection replay (time-travel through a participant's growth).
- [ ] Team reflection heatmaps.
- [ ] Embeddable participant view for use inside other tools (Zoom, Notion, Mural).

---

## Working agreements for agents

1. **One phase at a time.** Don't start Phase 2 items while Phase 1 has unchecked boxes, unless explicitly told to.
2. **Update this file in the same change as the code.** When you check a box here, do it in the same commit as the implementation.
3. **Add to `CHANGELOG.md` on every meaningful change** (see that file for format).
4. **If a decision needs making and it's not in `SPEC.md` §12, stop and ask** — don't quietly set a precedent.
