# claude-skills

Five Claude Code Skills that cut my token usage by ~40%. Full walkthrough on [the video](https://youtube.com/@TubeForgeHQ).

## What's in here

| Skill | What it does | Biggest win |
|---|---|---|
| [auto-compactor](./auto-compactor/SKILL.md) | Detects context bloat and runs `/compact` before Claude wastes tokens re-reading files | Long sessions stop costing linearly |
| [review-before-run](./review-before-run/SKILL.md) | Forces a <50-word plan before any multi-file edit | Kills "wrong 400-line implementation" waste |
| [spec-first-coder](./spec-first-coder/SKILL.md) | Requires a 5-line spec before tests or code | ~2× reduction on any non-trivial feature |
| [test-writer](./test-writer/SKILL.md) | Auto-generates tests for just-edited files, in your project's framework | 3× cheaper than separately-prompted tests |
| [plan-or-stop](./plan-or-stop/SKILL.md) | Refuses big tasks until a rollback plan exists | Saves whole-session disasters |

## How to install

Claude Code looks for Skills in `~/.claude/skills/<name>/SKILL.md`.

```bash
# Install all five
git clone https://github.com/UrNas/devtips
cp -r devtips/claude-skills/* ~/.claude/skills/

# Or install one
cp -r devtips/claude-skills/auto-compactor ~/.claude/skills/
```

Restart your Claude Code session. They're now available to the model — no manual invocation needed; the `description:` frontmatter tells Claude when to use each one.

## Scope each skill to a project

Skills in `~/.claude/skills/` are global. To scope one to a single project, put it in `<project>/.claude/skills/<name>/SKILL.md` instead.

## Pairs with

- **Hooks:** `test-writer` works best paired with a PostToolUse hook that invokes it automatically after every Edit. See [the hooks video](https://youtube.com/@TubeForgeHQ) on tubeforge.
- **git worktree:** all five work nicely alongside running Claude on multiple branches via `git worktree`. See [the worktree video](https://youtube.com/@TubeForgeHQ).

## License

MIT. Fork, modify, remix. PRs welcome if you find a better trigger rule.
