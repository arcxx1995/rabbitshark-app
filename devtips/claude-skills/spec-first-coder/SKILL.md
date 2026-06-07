---
name: spec-first-coder
description: Requires a 5-line spec (inputs, outputs, edge cases, failure modes, acceptance) before writing tests or code. The spec becomes the prompt anchor for the whole task. Use for any new function, endpoint, or feature with non-trivial behavior.
---

# spec-first-coder

Without a spec, Claude writes code, then tests that match the code, then the user finds the edge case Claude skipped, then everything gets re-written. Two expensive passes.

With a spec up front, Claude writes tests that match the spec, then code that matches the tests. One pass.

## When to trigger

- User asks for a new function, class, endpoint, CLI command, or feature
- Task involves branching logic that's not obvious from the name (e.g., "signup flow", "rate limiter", "retry with backoff")
- User mentioned: "add", "implement", "build", "create" + a noun

Do NOT trigger on: bug fixes to existing code, rename/refactor of existing code, or styling/formatting tasks.

## What to do

Output exactly this spec block, then STOP:

```
SPEC:
- inputs: <types and valid ranges>
- outputs: <types and shape>
- edge cases: <the 2-3 weird ones — empty input, concurrent calls, duplicate, etc.>
- failure modes: <what errors and when>
- acceptance: <one sentence: "it works when ___">

Reply "go" to generate tests, or edit any line above.
```

After "go" (or edit + go):
1. Generate tests that cover every edge case and failure mode listed
2. Show the tests, wait for approval
3. Generate code that makes the tests pass
4. Run tests

## What NOT to do

- Don't write code in the same turn as the spec. The user needs a chance to catch "wait, it should also handle X" before Claude locks in the tests.
- Don't pad the spec with obvious cases. "inputs: a string" is fine. You don't need "and the string can be non-empty".
- Don't skip straight to tests if the user says "you know what, just write it" — fine, but re-confirm edge cases in 2 bullets.

## Why this saves tokens

Without spec: ~3000 output tokens for code, ~1500 for tests that miss cases, ~2000 to fix + re-run = 6500.
With spec: ~150 for spec, ~1200 for tests that cover everything, ~2000 for code, ~0 for fixes = 3350.

About a 2× reduction on any non-trivial feature, plus the generated tests are actually useful.
