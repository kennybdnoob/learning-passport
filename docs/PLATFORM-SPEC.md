# Platform Spec

**Last updated:** 2026-05-14

The authoritative reference for platform-level architecture: auth, Firestore shared collections, routing, and deployment. Activity-specific behaviour lives in `docs/activities/[name].md`.

---

## 1. Platform overview

`knywong.com` and `game.knywong.com` are the same Firebase Hosting deployment (same project: `learning-activities-kny`). They share one Auth pool, one Firestore database, and one set of Cloud Functions.

- `knywong.com` — main site: member login, resource downloads, activity hub
- `game.knywong.com` — learning activities: each activity at a sub-path (`/impactbingo`, `/reflectivejournal`, etc.)
- Auth is shared across both domains — sign in once, recognised everywhere

---

## 2. Users and roles

### 2.1 Role model

Roles are strings stored in `users/{uid}.role` in Firestore and synced to Firebase Auth custom claims by the `syncRole` Cloud Function. Security rules check `request.auth.token.role`.

| Role | Access |
|---|---|
| `member` | Authenticated user. Can access knywong.com resources. |
| `facilitator` | Can create and run workshops, access activity control rooms and dashboards. |
| `admin` | Full platform access. Can promote/demote user roles via Firestore. |

New users default to no role (no `role` field) until promoted. Add a new role by setting `users/{uid}.role = 'newrole'` — the `syncRole` function propagates it automatically. No code changes needed.

### 2.2 Learners

Participants in learning activities are **not** in the `users` collection. They join via anonymous Firebase auth (stable uid, zero UX cost). Their identity is a `nickname` + `workshopCode`, stored in the activity's own Firestore subcollection.

### 2.3 Auth providers

| User type | Provider | When |
|---|---|---|
| Member / Facilitator / Admin | Google Sign-In | On knywong.com or any activity's facilitator page |
| Learner | Firebase anonymous auth | On activity participant page (silent, no UI) |

---

## 3. Shared Firestore collections

These collections belong to the platform, not any single activity. All activity-specific collections are defined in `docs/activities/[name].md`.

```
users/{uid}
  role: string              // 'member' | 'facilitator' | 'admin' | (future roles)
  email: string             // from Google profile
  displayName: string       // from Google profile
  photoURL: string?         // from Google profile
  createdAt: timestamp      // first sign-in
```

### Security rules (users collection)

```
match /users/{uid} {
  // Owner can read their own doc
  allow read: if request.auth.uid == uid;

  // Owner can write their own doc EXCEPT the role field
  allow write: if request.auth.uid == uid
    && !('role' in request.resource.data.diff(resource.data).affectedKeys());

  // Admin can write anything (including role)
  allow write: if request.auth.token.role == 'admin';
}
```

---

## 3a. Cloud Storage

Used by **Impact Bingo only** — proof-of-trade selfies.

- Bucket: `learning-activities-kny.firebasestorage.app`, region `asia-southeast1`.
- Rules: `storage.rules` (wired in `firebase.json`; **note `deploy.cmd` does NOT
  deploy storage — run `firebase deploy --only storage` separately**).
- Only the `selfies/` path is writable; images only; **512 KB** ceiling.
  Everything else in the bucket is denied.
- Writes are **unauthenticated by design** — IB participants have no Firebase
  Auth, matching the activity's open Firestore model.
- The client downscales each selfie to a ~360px / q0.4 JPEG (≈10–25 KB) before
  upload, so the photo is a throwaway thumbnail, not an archival image.

---

## 4. Cloud Functions

All functions live in `functions/src/` and are exported from `functions/src/index.ts`.

### 4.1 `syncRole` (platform auth)

**Trigger:** Firestore `onWrite` on `users/{uid}`
**Action:** Reads `role` from the new document, calls `admin.auth().setCustomUserClaims(uid, { role })`.
**Effect:** The next token refresh (≤1hr, or immediate on next sign-in) carries the new role claim. All security rules that check `request.auth.token.role` update automatically.

**Bootstrap admin (recovery path):** Because the role claim has up to a 1hr propagation delay, security rules also accept a single hard-coded owner email via `isBootstrapAdmin()` — `request.auth.token.email == 'aknyz88@gmail.com'`. The `email` claim is a *standard* JWT claim present the instant a user signs in, so this path has no propagation delay and guarantees the platform owner can never be locked out. It is the **only** identity that bypasses the role claim — it is NOT "any Google user" (the old `isGoogle()` blanket fallback was removed as a security hole). Every other facilitator must have `users/{uid}.role` provisioned explicitly.

### 4.2 Activity functions

Each activity adds its own functions under `functions/src/activities/[name]/`. These are callable functions (not triggers), invoked from the activity's frontend.

---

## 5. Hosting and routing

All static files are served from `public/` via Firebase Hosting (project `learning-activities-kny`, domain `game.knywong.com`).

### Sub-path layout

| URL | File served | What it is |
|---|---|---|
| `game.knywong.com/` | `public/index.html` | Platform homepage / activity hub |
| `game.knywong.com/impactbingo` | `public/impactbingo/index.html` | Impact Bingo participant |
| `game.knywong.com/impactbingo/facilitator` | `public/impactbingo/facilitator/index.html` | Impact Bingo facilitator |
| `game.knywong.com/impactbingo/dashboard` | `public/impactbingo/dashboard/index.html` | Impact Bingo dashboard |
| `game.knywong.com/reflectivejournal` | `public/reflectivejournal/index.html` | Reflective Journal participant |
| `game.knywong.com/reflectivejournal/facilitator` | `public/reflectivejournal/facilitator/index.html` | Reflective Journal facilitator |

Each activity is responsible for its own sub-path. New activities add their rewrites to `firebase.json`.

---

## 6. Deployment

Run `scripts/deploy.sh` (or `deploy.cmd` on Windows) from the `learning-activities/` root.

The script:
1. Copies each activity's static files into `public/[slug]/`
2. Runs `firebase deploy --only hosting,firestore,functions`

The `public/` directory is the assembled output — its contents are generated and should not be edited directly. Source files live in each activity's folder.

---

## 7. Local development

```bash
firebase emulators:start
```

Runs Auth (9099), Firestore (8080), Functions (5001), Hosting (5002), UI (4000).

Each activity also has its own `firebase.json` with emulator config for standalone local dev.

---

## 8. Firebase SDK config

When the Firebase project changes, update the config object in:
- Every `public/` HTML file that initialises Firebase (or is copied from an activity's source)
- Every activity's source HTML files

The config object comes from Firebase Console → Project Settings → Your apps → Web app.
