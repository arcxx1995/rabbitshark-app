# Pattern 5 — the # shortcut

The trick that finally makes mid-session corrections stick. Type any line in
Claude Code starting with `#` and it gets appended to your `CLAUDE.md`,
automatically. The lesson lives past the session boundary.

## Where it goes

Nowhere, on disk. You type it inline in the Claude Code chat:

```
> # we use snake_case for SQL columns even though TS uses camelCase
```

Claude Code:

```
✓ appended to ./CLAUDE.md
✓ next session will read it on start
```

That's it. No file open. No editor switch. No context-switch out of the work.

## Which CLAUDE.md gets the line

Claude Code appends to whichever `CLAUDE.md` is the **most local** to your
current session — usually the project root. If you want the line in your
user-level `~/.claude/CLAUDE.md` instead (it's a personal-style line, not
project-specific), prefix with `## ` and Claude Code will ask which file:

```
> ## use 2-space indents in every project
```

## When to use it

Any time you correct Claude on something subtle and you find yourself
thinking "I wish I'd remembered to add that to CLAUDE.md last time." The
moment you have that thought, type `#`.

The point is **friction**: the shortcut takes one line of typing. Opening
CLAUDE.md, scrolling to the right section, writing the line, saving — that's
twenty seconds and three context switches. You won't do it. You'll forget,
and tomorrow Claude will make the same mistake.

## What to capture

- Naming conventions ("we use snake_case for SQL")
- Anti-patterns ("don't suggest X — we tried it and it broke Y")
- Things you've corrected twice in the same week
- The little shortcuts only you know about your codebase

## Why this is Pattern 1 in the recap

Patterns 1–4 are great files but they require you to **author** them. This
one is the trick that fills those files for you, automatically, as you
work — which is why every long-lived `CLAUDE.md` you'll ever own ends up
being mostly `#`-shortcut lines you added in the moment.

It's the climax of the video, and the climax of the recap, for the same
reason: it's the pattern that turns memory from a maintenance burden into a
side effect.
