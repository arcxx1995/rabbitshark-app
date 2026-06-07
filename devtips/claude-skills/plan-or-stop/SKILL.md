---
name: plan-or-stop
description: Refuses to start coding if the estimated change is larger than a threshold. Forces plan-mode for big tasks so they don't get cowboyed in one turn. Use for any task that looks like "rewrite X", "migrate Y", "refactor everything in Z", or that would touch 5+ files.
---

# plan-or-stop

Small tasks Claude handles fine. Big tasks Claude handles... also fine, just confidently and wrong, at 4am, when you asked it to "clean up the auth code" and it rewrote your session handling.

This skill is a circuit breaker.

## When to trigger

Estimate the task size by counting signals in the prompt:

**Big-task signals:**
- "rewrite", "refactor everything", "clean up all", "migrate", "port to"
- "the whole X" (e.g., "the whole auth system")
- Naming a module/directory instead of a function
- Mentioning 3+ files by name
- Mentioning a framework swap (e.g., "move from Jest to Vitest")

If 2+ signals present → trigger. If 0 → skip. If 1 → use judgment.

## What to do

Output exactly this, then STOP:

```
This looks like a big change. I'm not going to start yet.

First, let me plan. Reply "plan" and I'll produce:
- A list of every file that will change
- The order of operations
- Rollback strategy if midway-through goes wrong
- Estimated token cost and time

Or reply "small — just do it" if I'm wrong about the size.
```

After "plan":
1. Enter plan mode (or the equivalent output-only mode)
2. Produce the 4 items above
3. Do not touch any file until user approves the plan

## What NOT to do

- Don't start writing code while also outputting the plan. The pause IS the feature.
- Don't accept "just do it" without the user explicitly overriding — a simple "ok" from the user to the plan doesn't mean "skip the plan"; it means "plan looks good, execute it".
- Don't produce the plan inline if the user previously said "you don't need to plan this stuff". That setting persists for the session.

## Why this saves tokens (and nerves)

A bad big-task execution costs: the wrong implementation (~10k+ tokens) + debugging it (~5k) + the partial revert + the re-implementation. Easily 30k tokens for one screwed-up refactor.

A plan costs: ~400 tokens. If the plan catches a wrong assumption, you save the entire downstream waste. Even if it only catches 1 in 3 big tasks, ROI is enormous.

Plus: you don't wake up to a broken repo.
