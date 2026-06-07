---
name: auto-compactor
description: Detects context bloat and runs /compact before Claude wastes tokens re-reading the same files. Use whenever a session has been running for more than ~30 turns, or whenever the same file has been read more than twice.
---

# auto-compactor

Claude re-reads the same files every few turns when the session gets long. That's where most of the token bleed comes from in long coding sessions — not the code generation, the context re-loading.

This skill tells Claude when and how to prune its own context.

## When to trigger

- The same file has been Read more than twice in the current session
- The session has run more than 30 turns without a `/compact`
- The user says any of: "clean up", "reset context", "compact", "getting slow", "too much context"
- The last 10 messages contain more tool-result text than new user intent

## What to do

1. Summarize the last 10 turns in 5 bullets max, focused on: decisions made, files changed, open questions, current task, next step.
2. Run `/compact` with that summary as the retained context.
3. After compacting, output a one-line confirmation: `Context compacted. Retained: <summary>.`

## What NOT to do

- Don't compact mid-task if the user is actively waiting on a specific output — finish that first, then compact.
- Don't drop TODO items or open questions from the summary. Those are the expensive part to re-derive.
- Don't compact more than once per ~15 turns — it has its own cost.

## Why this saves tokens

Every turn after a large file Read, the full file content re-enters context. A 2000-line file at 10k tokens, re-loaded 5 times across a session, is 50k tokens of waste. Compacting replaces it with a 200-token summary.
