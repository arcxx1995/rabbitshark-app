---
name: test-writer
description: Auto-generates tests for any function the user just edited, in the project's existing test framework and style. Use whenever Claude edits a source file that has (or should have) a corresponding test file.
---

# test-writer

Most "I'll add tests later" code never gets tests, because writing tests cold is boring. But writing tests for code you just saw is easy — and that context is already in Claude's window.

Pair this skill with a PostToolUse hook (see `apps/claude-hooks/` in the tubeforge repo) for fully automatic coverage.

## When to trigger

- Claude just edited a file in `src/`, `lib/`, `app/`, or any source dir
- The edited file exports a function, class, or component
- The file is NOT itself a test (no `.test.`, `.spec.`, `__tests__`, etc. in the path)

## What to do

1. Detect the project's test framework by looking for one of: `vitest.config`, `jest.config`, `pytest.ini`/`pyproject.toml` with `[tool.pytest]`, `go test` conventions (files ending in `_test.go`), `cargo test`.
2. Find or create the corresponding test file. Conventions:
   - TS/JS: sibling `X.test.ts` or `X.spec.ts` (match existing style)
   - Python: `tests/test_X.py`
   - Go: `X_test.go` in same dir
3. Write tests covering:
   - Happy path (the obvious use)
   - Each edge case from the spec if one exists (see `spec-first-coder`)
   - Each explicit error path in the code
4. Run the tests. If any fail, output the failure and stop — do NOT auto-fix the source to make tests pass. That's the user's call.

## What NOT to do

- Don't mock the database in tests that previously hit a real DB. Match existing test style.
- Don't invent behavior that isn't in the source. If you can't find an edge case, say so — don't fabricate one.
- Don't "improve" the source code while writing tests. Tests first, refactor is a separate task.
- Don't add tests for trivial getters/setters, data classes, or pure type definitions.

## Integration with hooks

Combined with a PostToolUse hook that runs this skill automatically after every Edit, you get continuous coverage without ever thinking about it. Example hook config — see the companion video on hooks.

## Why this saves tokens

Separately-prompted "write me tests for login.ts" requires Claude to re-read the file, re-derive the behavior, and guess the test framework. All that context is free when piggybacking on the edit that just happened. Rough estimate: 3× cheaper than the separate-pass version.
