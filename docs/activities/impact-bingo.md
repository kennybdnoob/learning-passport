# Activity: Impact Bingo

**Status:** Live (needs auth migration to `learning-activities-kny` — see ROADMAP Phase 2)
**Sub-path:** `game.knywong.com/impactbingo`
**Source:** `impact-bingo/public/`

---

## What it is

A live bingo-style activity where participants mark off impact items on a bingo card during a workshop. Facilitators control the session; participants play on their phones.

## URLs

| URL | Page |
|---|---|
| `/impactbingo` | Participant — bingo card |
| `/impactbingo/facilitator` | Facilitator — session control |
| `/impactbingo/dashboard` | Dashboard — results overview |

## Stack

Plain HTML + CSS + vanilla JS. Firebase SDK loaded via CDN. No build step.

## Auth

- Facilitator: Google Sign-In → must have `token.role == 'facilitator'` or `'admin'` (post Phase 2 migration)
- Participant: no login

## Firestore collections

Prefixed to avoid collision with other activities. See `firestore.rules` for the rules.

## Deployment

Source files in `impact-bingo/public/` are copied to `public/impactbingo/` by `scripts/deploy.sh`.
