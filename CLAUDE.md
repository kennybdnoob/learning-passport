# Platform — Agent Entry Point

This repo is the platform for `game.knywong.com` (learning activities) and `knywong.com` (main site).

## Read order (always)

1. **`ROADMAP.md`** — current phase, folder structure, what's next
2. **`docs/PLATFORM-SPEC.md`** — auth design, Firestore model, routing, deployment
3. **Activity spec** — `docs/activities/[name].md` for the activity you're touching

## Rules

1. **Don't touch an activity's files without reading its spec first.**
2. **Platform-level changes** (firestore.rules, firebase.json, functions/, scripts/) affect all activities — test before deploying.
3. **One phase at a time.** Don't start Phase N+1 while Phase N has unchecked boxes, unless told to.
4. **Update docs in the same change as code.** Tick the ROADMAP box, add a note to the relevant spec.
5. **Never commit `serviceAccountKey.json` or any file with credentials.**

## Stack at a glance

| Layer | Tech |
|---|---|
| Frontend | Plain HTML + CSS + vanilla JS (no framework, no build step) |
| Auth | Firebase Auth — Google Sign-In (facilitators/members), anonymous (learners) |
| Database | Cloud Firestore — realtime via `onSnapshot` |
| Functions | Firebase Cloud Functions (Node/TypeScript) — AI calls, role sync |
| Hosting | Firebase Hosting — static files, served from `public/` |
| AI | Google Gemini 2.0 Flash (free tier), abstracted behind `generateSummary()` |
| Firebase project | `learning-activities-kny` (migrating — see ROADMAP Phase 0) |

## Deployment

Run from `learning-activities/` root:

```
scripts/deploy.sh       # Linux/Mac
scripts/deploy.cmd      # Windows
```

This copies each activity's static files into `public/[slug]/` then runs `firebase deploy`.

## Auth quick reference

- Check if facilitator: `request.auth.token.role == 'facilitator'`
- Check if admin: `request.auth.token.role == 'admin'`
- Learner (anonymous): `request.auth.token.firebase.sign_in_provider == 'anonymous'`
- Add a new role: set `users/{uid}.role` in Firestore — `syncRole` function propagates it to the token automatically
