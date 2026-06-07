# subagents-config

Five Claude Code subagent prompts I run in parallel on every meaningful change. Full walkthrough on [the video](https://youtube.com/@tubeforge).

These work with Claude Code's `Task` tool — each `SUBAGENT.md` is a self-contained prompt template with a `name`, `description`, and a constrained tool list.

## What's in here

| Subagent | What it does | Wall-clock win |
|---|---|---|
| [researcher](./researcher/SUBAGENT.md) | Reads unfamiliar code/libs in its OWN context, returns 5 bullets | ~16× cheaper main-context |
| [reviewer](./reviewer/SUBAGENT.md) | Lint + spec-check + risk flags, runs while you keep coding | 8 min serial → 0 of yours |
| [tester](./tester/SUBAGENT.md) | One prompt, spawned N× — one per file, all in parallel | 12 min → 2 min (parallel) |
| [doc-writer](./doc-writer/SUBAGENT.md) | Post-merge docstrings + README updates as a separate PR | docs that actually exist |
| [migrator](./migrator/SUBAGENT.md) | Refactor recipe fanned across N files via 5 subagents | 45 min → 8 min |

## Install

Claude Code reads subagent prompts from `~/.claude/agents/<name>.md` (global) or `<project>/.claude/agents/<name>.md` (project-scoped). Copy the file you want into one of those locations.

```bash
git clone https://github.com/UrNas/devtips
cp devtips/subagents-config/researcher/SUBAGENT.md ~/.claude/agents/researcher.md
```

Restart your Claude Code session. The subagent is invocable via the `Task` tool.

## Spawn one

In your main Claude session:

```
> Use the researcher subagent to summarize the jose library in node_modules
```

Or for fan-out (the parallel sweet spot — that's the whole point of subagents):

```
> Spawn 5 tester subagents, one per file:
>   src/cart/cart.ts, pricing.ts, checkout.ts, discount.ts, receipt.ts
```

## Which to start with

Ranked by impact (from the video's recap):
1. **migrator** — biggest wall-clock win, easiest to feel
2. **tester** — parallel sweet spot for any project with > 1 file
3. **reviewer** — productivity unlock, async by default
4. **researcher** — context-cost saver, especially in long sessions
5. **doc-writer** — compounds, and only works if you commit to running it post-merge

## Notes

- Each prompt has an explicit `tools:` list. Keep it minimal — broader tool access in a subagent means broader blast radius if it goes wrong.
- The `description:` line is what Claude uses to route work. Be specific.
- For the parallel patterns (`tester`, `migrator`), you trigger fan-out from your main prompt — Claude Code spawns N concurrent `Task` tool calls.

## License

MIT. Fork, modify, remix.
