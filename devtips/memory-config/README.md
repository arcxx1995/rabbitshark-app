# 5 CLAUDE.md tricks that stop Claude from forgetting

Companion to the YouTube video. Five `CLAUDE.md` patterns Claude Code reads
automatically — so you stop re-explaining your stack, your style, and your
hard-won corrections every single session.

| # | Pattern | Lives at | What it kills |
|---|---|---|---|
| 1 | project CLAUDE.md | `<project>/CLAUDE.md` | re-explaining the stack |
| 2 | user CLAUDE.md | `~/.claude/CLAUDE.md` | personal style, per project |
| 3 | hierarchical CLAUDE.md | `<root>/CLAUDE.md` + `<dir>/CLAUDE.md` | mixed-convention monorepos |
| 4 | @-imports | `@./conventions/style.md` | bloated context budget |
| 5 | the # shortcut | typed in-chat with `#` | lessons lost at session end |

## Install one

Each pattern lives in its own folder with a `PATTERN.md` explainer plus the
exact files to copy. Pick one, read the PATTERN.md, paste the file at the path
shown.

## Install the lot

The fastest way to get the full set:

```bash
# 1. Project rules — paste at your repo root
cp 01-project-claude-md/CLAUDE.md.example  /path/to/your/repo/CLAUDE.md

# 2. Your personal taste — paste at your home
mkdir -p ~/.claude
cp 02-user-claude-md/user-CLAUDE.md.example  ~/.claude/CLAUDE.md

# 3. Per-package overrides — only if you have a monorepo
cp 03-hierarchical/apps-api.CLAUDE.md  /path/to/your/repo/apps/api/CLAUDE.md

# 4. Compose with @-imports — split a fat CLAUDE.md into focused snippets
cp -r 04-imports/conventions  /path/to/your/repo/conventions
# then in /path/to/your/repo/CLAUDE.md:
#     @./conventions/style.md
#     @./conventions/testing.md
#     @./conventions/security.md

# 5. The # shortcut — no install. Just type # mid-chat (see 05-hash-shortcut/).
```

Restart Claude Code after edits to `~/.claude/CLAUDE.md` so the new content
loads. Project-level files are picked up on next session start.

## How Claude Code resolves them

On session start, Claude Code reads — in this order:

1. `~/.claude/CLAUDE.md` (your personal file, applies to every project)
2. `<project root>/CLAUDE.md` (this repo)
3. Any `CLAUDE.md` in the directory of files you edit (per-package override)
4. Recursively follows `@<path>` imports inside any of the above

Later files **add to and refine** earlier ones — they don't replace them.
The `# `-prefix shortcut writes to whichever `CLAUDE.md` Claude Code is
currently looking at (usually project root).

## Series

This is part five of a series — each video covers one Claude Code superpower:

1. **Skills** — token-saving instructions you can install ([video](https://youtube.com/@tubeforge))
2. **MCP servers** — context that updates itself
3. **Subagents** — five tasks running in parallel, ten minutes instead of an hour
4. **Hooks** — auto-fix on every save
5. **Memory** ← you are here

Subscribe for the next one: [youtube.com/@tubeforge](https://youtube.com/@tubeforge)
