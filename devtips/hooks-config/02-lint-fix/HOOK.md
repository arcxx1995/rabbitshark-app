# Hook 2 — lint --fix

Run ESLint with `--fix` on every Claude edit. About 80% of warnings auto-resolve.

## Snippet

```json
{
  "type": "command",
  "command": "npx eslint --fix \"$CLAUDE_FILE_PATHS\" 2>&1 | tail -10"
}
```

## Why

Lint warnings pile up across the week — unused imports, missing const,
implicit any, unused vars. By Friday you have 47 warnings in 12 files and
you fix them by hand at 6pm. ESLint with `--fix` knows how to resolve most
of them automatically; on every Claude edit, your warning count basically
stays at zero.

## Variants

- **Python (ruff check --fix)** — `ruff check --fix "$CLAUDE_FILE_PATHS"`
- **Rust (clippy --fix)** — `cargo clippy --fix --allow-dirty -- -D warnings`
- **Go (gofumpt + staticcheck)** — chain them in the same command

## Watch out for

- ESLint `--fix` only fixes rules marked auto-fixable. Manual rules (like
  `no-explicit-any` without a fix codemod) still surface in output.
- If you run on a monorepo, point ESLint at the right config root with
  `--resolve-plugins-relative-to` or it'll error on every edit.
- Quote `$CLAUDE_FILE_PATHS` — paths with spaces will break the command
  otherwise. (Yes this happens. Don't ask.)
