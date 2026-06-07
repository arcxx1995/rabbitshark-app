# Hook 3 — type-check

Run `tsc --noEmit` after every Claude edit. Catch type errors at edit-time
instead of 30 minutes later in CI.

## Snippet

```json
{
  "type": "command",
  "command": "npx tsc --noEmit --pretty 2>&1 | head -30"
}
```

## Why

Claude tweaks a generic. The change looks fine. Half an hour later, in CI,
you find out the function signature is broken and three callers are failing.
You've already context-switched. The fix is now expensive.

`tsc --noEmit` runs in a few seconds on most projects. Running it on every
edit means the error surfaces in the very same terminal Claude is writing
to — and Claude reads its own failure on the next turn. The fix happens
before you've even noticed there's a problem.

## Variants

- **Per-file check** — Slower than full `tsc` for medium projects, weirdly.
  Project-wide `tsc --noEmit` is usually faster than per-file thanks to
  TypeScript's incremental cache.
- **mypy / pyright (Python)** — `pyright "$CLAUDE_FILE_PATHS"` or
  `mypy "$CLAUDE_FILE_PATHS"`.
- **rustc / cargo check** — `cargo check --quiet`.
- **Go** — `go vet ./...` (vet > build for fast feedback).

## Watch out for

- `tsc` is the slowest hook of the five (3–10s on a typical project). If
  your project is huge, narrow scope: `tsc --noEmit --incremental` and
  commit the `.tsbuildinfo` file.
- Pipe to `head -30` so a wall of errors doesn't drown Claude's terminal.
  The first 30 lines are usually enough to fix the root cause.
