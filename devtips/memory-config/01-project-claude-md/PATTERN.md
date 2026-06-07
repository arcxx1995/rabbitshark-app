# Pattern 1 — project CLAUDE.md

A 10-15 line file at your repo root that captures the cheat sheet Claude wishes
it already had. Stack choices, "don't touch X" rules, the commands you run
every day. Claude Code reads it on session start, before it does anything else.

## Where it goes

`<project>/CLAUDE.md` — at the root of your repo, alongside `package.json`.

## Template

See `CLAUDE.md.example` in this folder. Copy it, then strip out anything that
doesn't apply and add anything project-specific.

```bash
cp CLAUDE.md.example /path/to/your/repo/CLAUDE.md
```

## What to put in it

The single highest-leverage section is **Don't**. Every "don't" line is a
correction Claude won't make, forever.

- **Stack** — package manager (pnpm vs npm), framework, test runner, ORM
- **Commands you'll need** — three or four shortcuts you actually run daily
- **Don't** — directories Claude shouldn't touch, libraries to avoid,
  dependencies to never add

Keep it short. Twenty lines is plenty. Bigger files mean less of each rule
makes it into Claude's working context — and most of what you'd write past
twenty lines is better off in a `@./conventions/style.md` import (see
Pattern 4).

## Why it kills repetition

Without it, every new session Claude defaults to whatever it learned during
training. Your repo uses pnpm? It'll reach for npm. Your tests live in
`__tests__/`? It'll write them next to source. Your backend is fastify? It'll
import express. Four corrections per session, five sessions per week — twenty
small interruptions that add nothing to the work.

With it, Claude opens with the right command. First try.

## Why this is Pattern 1

Highest ratio of value-to-setup. Two minutes to write. Pays back on every
session, forever.
