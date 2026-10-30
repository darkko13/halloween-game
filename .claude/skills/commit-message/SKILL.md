---
name: commit-message
description: Write a git commit message that matches this repo's conventions — Conventional Commits prefix, imperative subject, concise body focused on *why*. Use when preparing a commit for the dino-game repo.
---

# commit-message

Follow this exactly when drafting a commit message for this repository.

## Subject line

- Format: `<type>: <subject>` (Conventional Commits, no scope).
- Allowed types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `perf`, `build`, `ci`, `style`.
- Imperative mood (`add`, `fix`, `remove` — not `added`, `fixes`).
- Lowercase after the colon, no trailing period.
- Keep under 72 characters; aim for under 60.
- Describe the *behavioural change*, not the file touched. Match the style of `fix: collision uses hitboxes, not sprite rects`: name the thing that changed and the shape of the change.

## Body (optional)

- Only include when the *why* is not obvious from the subject or diff.
- Wrap at ~72 columns, blank line after subject.
- Explain motivation, constraint, or spec reference — not what the diff already shows.
- Reference the AWOS spec folder when relevant: `context/spec/NNN-name/`.
- Do not list files, do not restate the diff.

## What not to do

- No scopes (`feat(game):` — leave the scope off).
- No emoji.
- No trailing summary like "This change improves X" when the subject already said so.
- No "as requested" / "per discussion" — the message outlives the conversation.
- Do not amend published commits; create a new one.

## Attribution

End the commit message with the attribution line the harness provides in its system reminder (currently `Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>`). Separate it from the body with a blank line. If the reminder is absent, omit the line — do not invent one.

## Examples

Good:

```
fix: collision uses hitboxes, not sprite rects
```

```
feat: add night-mode palette swap at score 700

Palette swap is a cosmetic feature per architecture.md §2 —
state lives in a closure, seeded off state.seed ^ SALT, and
resets on restart. See context/spec/004-night-mode/.
```

Avoid:

```
Updated collision.ts and tests        # not Conventional, lists files
fix: fixes bug                        # vague, redundant
feat(game): Added Night Mode!!!       # scope, past tense, emoji-adjacent
```

## Process

1. Run `git status` and `git diff --staged` to see what's actually in the commit.
2. Pick the single `<type>` that best describes the dominant change. If the diff spans types, split the commit instead of inventing a compound type.
3. Draft the subject, then decide whether a body is warranted (default: no).
4. Pass the message via HEREDOC to `git commit -m` so formatting survives.
