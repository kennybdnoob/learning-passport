<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# For coding agents

This project is built by multiple AI coding agents (Claude Code, Cursor, Aider, others). To stay coherent across sessions and tools, every agent **must** read these three files before making changes:

1. **[SPEC.md](SPEC.md)** — what the product is. Single source of truth for product behaviour, data model, AI contract, and scope. If the code disagrees, the spec wins until the spec is updated.
2. **[ROADMAP.md](ROADMAP.md)** — what to build next. Phased plan with exit criteria. Pick the lowest unchecked item in the current phase unless told otherwise.
3. **[CHANGELOG.md](CHANGELOG.md)** — what just happened. The latest entry tells you the current state.

## Rules

1. **Don't drift from the spec.** If a task requires deviating from `SPEC.md`, stop and propose a spec edit first. Don't silently change behaviour.
2. **Open decisions live in `SPEC.md` §12.** If something needs deciding and it's not listed there, ask the human — don't pick for them.
3. **Update docs in the same change as code.**
   - Check the box in `ROADMAP.md` when the item is done.
   - Add an entry to `CHANGELOG.md` under `[Unreleased]` describing what changed.
   - Edit `SPEC.md` if the behaviour or data model changed.
4. **One roadmap phase at a time.** Don't pull work from a later phase while the current one has unchecked boxes.
5. **No new top-level docs without a reason.** If you need a new design note, put it in `docs/` and link it from the relevant section of `SPEC.md`.

## Stack at a glance

Next.js + TypeScript + Tailwind, Firebase (Auth, Firestore, Functions, Hosting), Google Gemini 2.0 Flash for the AI summary. See `SPEC.md` §7 for detail and §12 for what's still undecided.

## Definition of done for a roadmap item

- Code implements the behaviour in `SPEC.md`.
- Tests cover the new behaviour (rules tests for Firestore changes, unit tests for logic).
- Mobile QA done if it touches the participant UI.
- `ROADMAP.md` checkbox ticked.
- `CHANGELOG.md` `[Unreleased]` entry added.
