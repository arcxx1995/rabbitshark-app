# Pattern 3 — hierarchical CLAUDE.md

Root rules + per-package overrides. Claude Code reads CLAUDE.md files top-down
from the project root all the way to the directory it's editing in, and
**merges** them — so a child file refines (not replaces) the parent.

## Where it goes

Wherever the convention diverges from the root.

```
your-monorepo/
├── CLAUDE.md                      ← root rules: pnpm, vitest, biome
├── apps/
│   ├── web/                       (inherits root — no override needed)
│   └── api/
│       └── CLAUDE.md              ← override: this package uses jest
└── packages/
    └── ui/
        └── CLAUDE.md              ← override: this is a Storybook package
```

```bash
cp root.CLAUDE.md          /path/to/your/repo/CLAUDE.md
cp apps-api.CLAUDE.md      /path/to/your/repo/apps/api/CLAUDE.md
```

## What to put in the override

Only the parts that **diverge** from the root. Everything else is inherited.
A good override is six lines that say:

1. What's different about this package
2. The local commands (e.g. `pnpm --filter api test`)
3. Any per-package don't-touch rules

Keep it short. If the override is more than 20 lines, the package probably
deserves its own root-level CLAUDE.md (i.e. it's drifting from the rest of the
monorepo enough that a refactor is warranted).

## Why it kills repetition

Without it: a single root CLAUDE.md can't say "we use vitest" AND "we use
jest" at the same time. Whatever it picks, Claude gets it wrong half the
time. You correct it in `apps/api`, you correct it again, you correct it
forever.

With it: edit a file in `apps/web`, Claude reads root + (no override) =
vitest. Edit in `apps/api`, Claude reads root + override = jest. Same prompt,
different rules, no manual switching.

## Why this is Pattern 3

Higher leverage than imports (Pattern 4) because it solves an unsolvable
problem rather than just optimizing context. But narrower applicability —
single-package repos don't need it.
