# Pattern 4 — @-imports

Split a bloated `CLAUDE.md` into focused snippets. Compose them back together
with `@<path>` imports. Same rules, fraction of the context budget.

## Where it goes

`<project>/CLAUDE.md` becomes a thin shell that imports everything else:

```
your-repo/
├── CLAUDE.md                      ← short root, just imports
└── conventions/
    ├── style.md
    ├── testing.md
    └── security.md
```

```bash
mkdir -p /path/to/your/repo/conventions
cp CLAUDE.md            /path/to/your/repo/CLAUDE.md
cp conventions/*.md     /path/to/your/repo/conventions/
```

## How `@<path>` works

Inside any CLAUDE.md, a line that starts with `@` followed by a path is an
import. Claude Code resolves it on read and inlines the contents.

```markdown
# Project root

@./conventions/style.md
@./conventions/testing.md
@./conventions/security.md

## Just for this repo
- pnpm dev → starts the API
```

Imports compose recursively — a snippet can import another snippet — and
duplicates are deduplicated, so two files importing the same `style.md` won't
load it twice.

## What to put in each snippet

One topic per file. The natural splits:

- `conventions/style.md` — code style, comments, exports
- `conventions/testing.md` — test framework, structure, what to test
- `conventions/security.md` — auth, secrets, things to never log
- `conventions/deploy.md` — release process, env handling

Reusable across projects: stash these under `~/.claude/conventions/` and
import them with `@~/.claude/conventions/style.md`.

## Why it kills repetition (and tokens)

Without it: an 800-line CLAUDE.md loads 12k tokens at session start. Most
of it is irrelevant to the file Claude is editing. You pay for the whole
thing on every session, every prompt.

With it: thin root imports just what's needed. Same effective rules, ~3.4k
tokens.

## Why this is Pattern 4

Optimization, not enablement. Patterns 1-3 unlock things you couldn't do
otherwise. Pattern 4 makes those patterns sustainable as your CLAUDE.md
grows past the point where one file is readable.
