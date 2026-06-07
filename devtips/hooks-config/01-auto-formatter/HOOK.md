# Hook 1 — auto-formatter

Run prettier on the file Claude just touched. Style drift dies where it's born.

## Snippet

Paste into `~/.claude/settings.json` under `hooks.PostToolUse[].hooks`:

```json
{
  "type": "command",
  "command": "npx prettier --write \"$CLAUDE_FILE_PATHS\" 2>&1 | tail -5"
}
```

Full block (if you have no other hooks yet):

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write|MultiEdit",
        "hooks": [
          {
            "type": "command",
            "command": "npx prettier --write \"$CLAUDE_FILE_PATHS\" 2>&1 | tail -5"
          }
        ]
      }
    ]
  }
}
```

## Why

Claude doesn't load your prettier config. So every edit drifts: spacing, quote
style, trailing commas. Six manual format passes a day, every day.

prettier is fast (~80ms per file). Running it on every edit means the next
turn always sees a clean file — no diff noise from formatting, no CI nag.

## Variants

- **biome** — `npx biome format --write "$CLAUDE_FILE_PATHS"`
- **dprint** — `dprint fmt "$CLAUDE_FILE_PATHS"`
- **Python (ruff)** — `ruff format "$CLAUDE_FILE_PATHS"`
- **Go** — `gofmt -w "$CLAUDE_FILE_PATHS"`

## Watch out for

- If your prettier config lives in a non-standard path, point `--config` at
  it explicitly. prettier silently formats with defaults otherwise.
- The `2>&1 | tail -5` is so the hook output is concise in Claude Code's
  terminal. Drop it if you want full output.
