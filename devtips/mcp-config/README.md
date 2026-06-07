# mcp-config

Five Model Context Protocol (MCP) server configs I use in every Claude Code session. Full walkthrough on [the video](https://youtube.com/@tubeforge).

## What's in here

| Server | What it does | Install cost |
|---|---|---|
| [postgres](./postgres/.mcp.json) | Direct read-only database access — typed rows into context, no copy-paste cycle | 1 connection string |
| [filesystem](./filesystem/.mcp.json) | Expose additional roots (sibling repos, scratch dirs, infra) to one session | 1 path list |
| [github](./github/.mcp.json) | PRs, issues, reviews, comments inline — via a personal access token | 1 PAT |
| [playwright](./playwright/.mcp.json) | A real browser in Claude's hands — navigate, click, screenshot, read DOM | none |
| [context7](./context7/.mcp.json) | Current, version-specific library docs injected on demand | none |

## How to install one

Claude Code reads MCP config from `~/.claude/mcp.json` (global) or `<project>/.claude/mcp.json` (project-scoped). Either copy the whole block from the file you want, or merge the `mcpServers` entry into your existing config.

```bash
git clone https://github.com/UrNas/devtips
cat devtips/mcp-config/postgres/.mcp.json     # inspect
# Merge the "postgres" key into your ~/.claude/mcp.json
```

Restart your Claude Code session. The server appears as available tools.

## Which ones to start with

Ranked by pain removed (from the video):
1. **playwright** — biggest productivity unlock, especially for frontend work
2. **context7** — silent savings; removes a class of bugs you didn't know were Claude's fault
3. **postgres** — immediate token reduction if you query databases mid-session
4. **github** — flow improvement; not a token story, but keeps you in one window
5. **filesystem** — unblocks workflows that were previously impossible

## Notes

- Each config ships with minimal permissions. For **postgres**, use a read-only role. For **github**, scope your PAT to the repos you want Claude to touch.
- The **filesystem** server's allowed paths are hard boundaries — Claude can't read anything outside them.
- **context7** pulls docs from Upstash's public docs index; no secret required.
- **playwright** needs Node and launches a headless browser on demand — first run can take ~30s to install Playwright's browser binaries.

## License

MIT. Fork, modify, remix.
