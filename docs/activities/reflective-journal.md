# Activity: Reflective Journal

**Status:** In progress — Phase 3 (see ROADMAP)
**Sub-path:** `game.knywong.com/reflectivejournal`
**Source:** `reflective-journal/public/`
**Archive (old Next.js attempt):** `docs/archive/reflective-journal-next/`

---

## What it is

A live, AI-powered reflection activity. Participants join via a short code (no login), submit guided reflections pushed by the facilitator in real time, and receive a personalised first-person AI summary at the end.

**One-line:** Live AI-powered reflection that turns workshop moments into personalised, first-person learning insights.

---

## URLs

| URL | Page |
|---|---|
| `/reflectivejournal` | Participant — join + activity + summary |
| `/reflectivejournal/facilitator` | Facilitator — Control Room |

---

## Stack

Plain HTML + CSS + vanilla JS. Firebase SDK loaded via CDN. No build step. Matches impact-bingo pattern.

---

## Users

| User | Auth | Device |
|---|---|---|
| Facilitator | Google Sign-In, `token.role == 'facilitator'` or `'admin'` | Laptop |
| Participant | Anonymous Firebase auth (silent, **rule gate only**) — identity is the normalised **nickname** within the workshop, so the same code+nickname resumes the same journal on any device | Phone |

Participant joins in under 30 seconds: URL → enter code + nickname → first reflection screen.

---

## Core flows

### Participant (Phase A — planned journal)

1. Enter workshop code + nickname → anonymous auth fires silently
2. Waiting screen until at least one row is Live
3. **Journal list** — every Live/Complete row with a status chip (Not started / Draft saved / Submitted), answerable in any order
4. Tap a row → reflection detail (autosave debounced 500ms) → submit → ← back to journal
5. Facilitator unlocks summary → tap "Generate my learning summary"
6. AI returns 4-section first-person summary (objective-aligned) + summary code

### Facilitator (Phase A — pre-planned)

1. Sign in with Google (role check: `facilitator` or `admin`)
2. New Workshop → enter training info (title, pax, duration, client?, venue?) → 6-char code generated
3. Control Room: editable training-info card (autosave) + 3-column **plan table**, seeded with 3 draft rows
4. Per-row state machine: **draft → confirmed → live → complete** (Confirm required before Live; Complete is confirm-gated; Complete rows can be Re-opened)
5. Live submission counts per row + total reflections submitted
6. Unlock summary generation at session end

**Phase B/C (not built):** branded PDF export (B); cohort synthesis + pax-based progress (C).

---

## Activity types

| Type | MVP | Response shape |
|---|---|---|
| `reflection` | Yes | `{ text: string }` |
| `kiss` | Post-MVP | `{ keep, improve, stop, start: string }` |
| `table` | Post-MVP | `{ rows: Array<Record<columnKey, string>> }` |
| `commitment` | Post-MVP | `{ commitment: string, by?: string }` |

---

## AI summary

- Provider: Google Gemini 2.5 Flash (free tier), called from Cloud Function
- Abstracted behind `generateSummary(responses)` — swap to Anthropic Claude when paid usage is justified
- Output: 4 sections in order — "What I noticed about myself", "What I learned", "What I want to apply next", "One sentence I can share"
- Voice: first person, participant's own words only, no fabrication
- Generation policy: once, with one "include new responses" override. After that, locked.

---

## Firestore data model

```
workshops/{workshopId}
  code: string                  // 6-char, uppercase, no ambiguous chars
  name: string                  // kept in sync with title (legacy field)
  title: string                 // training title (shown on reports)
  pax: number?                  // expected participants
  durationDays: number?         // training duration in days (supports 0.5)
  client: string?               // optional — report header
  venue: string?                // optional — report header
  facilitatorId: string
  status: "live" | "ended"
  summaryUnlocked: boolean
  createdAt: timestamp
  endedAt: timestamp?
  // currentActivityId: ABANDONED in Phase A (journal model uses per-row state)

workshops/{workshopId}/activities/{activityId}   // a planned reflection row
  type: "reflection"
  topic: string                 // topic / module name
  objective: string             // learning objective (fed to AI)
  prompt: string                // the reflective question
  state: "draft" | "confirmed" | "live" | "complete"
  order: number
  createdAt: timestamp
  // Participant rules: only state in [live, complete] is readable by anon

workshops/{workshopId}/participants/{NICK}   // doc id = normalised nickname
  nickname: string                            // original-cased display name
  joinedAt: timestamp
  lastSeenAt: timestamp
  summaryCode: string?

workshops/{workshopId}/responses/{NICK_activityId}
  participantId: string                       // = normalised nickname (NOT uid)
  activityId: string
  data: object
  submitted: boolean
  updatedAt: timestamp
  submittedAt: timestamp?

workshops/{workshopId}/summaries/{summaryId}
  participantId: string
  code: string
  text: string
  generatedAt: timestamp
  modelVersion: string
```

---

## Non-functional requirements

| Area | Target |
|---|---|
| Join time | < 30s from URL to first reflection screen |
| Activity push → render | < 1.5s p95 |
| Autosave | < 800ms p95 |
| Mobile | iOS Safari 15+, Chrome Android (last 2 versions) |
| Cost | < $1 per 30-person 2-hour workshop |

---

## Deployment

Source files in `reflective-journal/public/` are copied to `public/reflectivejournal/` by `scripts/deploy.sh`. No build step.
