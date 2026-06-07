# Pattern 2 — user CLAUDE.md

Your personal style file. Lives at `~/.claude/CLAUDE.md` and applies to every
project Claude Code opens, automatically. Capture your taste once, reapply
forever.

## Where it goes

`~/.claude/CLAUDE.md`

```bash
mkdir -p ~/.claude
cp user-CLAUDE.md.example ~/.claude/CLAUDE.md
```

Restart Claude Code so the new file loads.

## What to put in it

Things that are **about you**, not about any one repo. Indentation. Quote
style. Comment density. Commit format. Default to terse vs. verbose. Whether
you want explanations after every change or just the diff.

If you find yourself correcting Claude on the same thing across two different
projects, that's a `~/.claude/CLAUDE.md` line waiting to happen.

## What NOT to put in it

Anything project-specific. Stack choices, file paths, command shortcuts —
those go in `<project>/CLAUDE.md` (Pattern 1) so they don't follow you into
projects where they're wrong.

## Why it kills repetition

Without it: every new project, Claude defaults to whatever it learned in
training. Four-space indents in one repo, two in another. Single quotes in
one, double in another. Verbose explanations one day, terse the next.

With it: your style is consistent across every project from day one. Zero
per-project taste-setup.

## Why this is Pattern 2

Strict superset of Pattern 1's value: project rules apply to one repo, your
rules apply to all of them. But Pattern 1 wins for ordering because it has
the higher concentration of immediate stack-correction value — most people
notice "we use pnpm" mistakes before they notice indent drift.
