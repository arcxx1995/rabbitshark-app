# Hook 5 — safety guard

Block any Claude write to a path outside your project root. Before the tool
call ever fires.

## Snippet

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Edit|Write|MultiEdit",
        "hooks": [
          {
            "type": "command",
            "command": "node ~/.claude/hooks/guard-paths.mjs"
          }
        ]
      }
    ]
  }
}
```

You also need to put `guard-paths.mjs` (in this folder) at
`~/.claude/hooks/guard-paths.mjs`.

## Why

You ask Claude to clean up your shell setup. It opens `~/.zshrc` and starts
overwriting 300 lines you spent three years tuning. Your dotfiles are not
in your git repo. There is no undo button.

A `PreToolUse` hook runs *before* the tool call. If the hook script exits
with code 2, Claude Code denies the call entirely — the file is never
opened, never written, never touched. You build a tiny script that checks
the path against `$CLAUDE_PROJECT_DIR` and refuses anything outside.

## How the guard works

`guard-paths.mjs` reads two env vars Claude Code provides:

- `CLAUDE_PROJECT_DIR` — the absolute path of the current project root.
- `CLAUDE_FILE_PATHS` — newline- or space-separated paths the tool wants
  to touch.

If any path resolves outside `CLAUDE_PROJECT_DIR`, the script prints a
denial reason to stderr and exits 2. Claude Code reads the exit code and
blocks the tool call.

## Watch out for

- Paths are resolved with `path.resolve()` — that handles `~`, `..`, and
  symlinks correctly. Don't write your own substring check; it will be
  bypassable.
- If you actually want Claude to touch files outside the project (e.g.
  configuring a sibling repo), either widen the allowed roots in the
  script or temporarily move the hook out.
- The denial message goes to stderr. Claude reads it and usually
  apologizes and re-scopes its plan to the repo.
