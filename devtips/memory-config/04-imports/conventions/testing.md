# Testing conventions

## Framework
- vitest for unit + integration (jest in apps/api — see that package's CLAUDE.md)
- Tests live in `__tests__/` next to the source they cover
- Snapshot files in `__tests__/__snapshots__/`

## What to test
- All exported functions and React components
- Database queries (use a real test DB, never mock at the query level)
- Error paths matter as much as happy paths

## What NOT to test
- Third-party library behavior — assume it works
- Implementation details — test the contract, not the structure
- Generated code (Prisma client, Drizzle, etc.)

## Patterns
- Use `describe()` per function/component, `it()` per behavior
- Test names start with "should" — `it("should return null when …")`
- One assertion per test where possible

## Commands
- `pnpm test`             one-shot
- `pnpm test:watch`       on save
- `pnpm test:coverage`    with c8
