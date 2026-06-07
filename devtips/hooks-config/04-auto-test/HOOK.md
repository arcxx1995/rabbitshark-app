# Hook 4 — auto-test

Run vitest scoped to whatever Claude touched. Regressions caught at edit-time.

## Snippet

```json
{
  "type": "command",
  "command": "npx vitest related --run \"$CLAUDE_FILE_PATHS\" 2>&1 | tail -20"
}
```

## Why

Claude refactors three files. Tests don't run. Tomorrow morning, in PR
review, your reviewer finds seven failing tests. They were yours to catch.

`vitest related` is the magic word here: it figures out which test files
import the file you just edited and runs only those. Fast, scoped, and
catches regressions while Claude still has the context to fix them.

This is the long-form expansion of the 45-second Short on the channel.
Watch that one for the "why this matters" before you set this up.

## Variants

- **Jest** — `npx jest --findRelatedTests "$CLAUDE_FILE_PATHS"`
- **Pytest** — `pytest "$CLAUDE_FILE_PATHS"` if your tests live next to
  the source. For separate test dirs, fall back to running the full suite
  and pipe to `| tail -30`.
- **Go** — `go test ./...` (Go's package boundaries make scoping easier).

## Watch out for

- `vitest related` only works if your test files use relative imports the
  resolver understands. If you use path aliases, make sure they're in
  `vitest.config.ts` `resolve.alias`.
- If your suite is slow, this hook is the first place to feel the pain.
  Combine with `--bail 1` to stop at the first failure — Claude usually
  only needs the first error to fix the rest.
- Edits to non-source files (configs, README) still trigger the hook;
  `vitest related` will print "No related tests found" and exit clean.
