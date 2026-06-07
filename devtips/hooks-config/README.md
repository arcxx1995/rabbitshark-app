# 5 Claude Code hooks that auto-fix my code

Companion to the YouTube video. These five hooks live in `~/.claude/settings.json`
and run automatically on every Claude Code edit — fixing the same five things
Claude keeps getting wrong, before you ever see the diff.

| # | Hook | Event | What it kills |
|---|---|---|---|
| 1 | auto-formatter | PostToolUse | style drift / prettier nags |
| 2 | lint --fix | PostToolUse | ~80% of ESLint warnings |
| 3 | type-check | PostToolUse | 30-minute CI surprises |
| 4 | auto-test | PostToolUse | regressions reaching review |
| 5 | safety guard | PreToolUse | writes outside your repo root |

## Install all 5 at once

Copy the `settings.json.example` block into your `~/.claude/settings.json` (merge
with any existing `hooks` block). Restart Claude Code to pick them up.

```bash
# inspect the snippet first
cat settings.json.example

# then merge by hand or:
mkdir -p ~/.claude
cp settings.json.example ~/.claude/settings.json   # if you have nothing else there
```

## Install one

Each hook lives in its own folder (`01-auto-formatter/`, etc.) with a `HOOK.md`
explainer and the exact JSON snippet to paste. Pick one, paste, restart.

## Hook 5 needs a guard script

The safety guard references `~/.claude/hooks/guard-paths.mjs`. That script lives
in `05-safety-guard/guard-paths.mjs` here — copy it to `~/.claude/hooks/` before
the hook will work.

## Requirements

- Claude Code 0.5.x or newer (PostToolUse / PreToolUse hooks)
- Node 18+ (for hook 5's guard script and any `npx` invocations)
- Whatever your project uses: prettier, ESLint, TypeScript, vitest

## Troubleshooting

- **Hook fires but nothing happens** — check `claude --debug` output, then run
  the hook command by hand against the file in question.
- **`$CLAUDE_FILE_PATHS` is empty** — older Claude Code versions used a
  different env var. Try `$CLAUDE_TOOL_FILE_PATH` (singular) as a fallback.
- **`exit 2` from PreToolUse doesn't block** — your shell's `exit` codes need
  to propagate to the parent. Make sure the hook command's last process is the
  one whose exit you care about (use `exec`, not `&&`, for the deny path).

## Watch the video

→ https://youtube.com/@tubeforge
