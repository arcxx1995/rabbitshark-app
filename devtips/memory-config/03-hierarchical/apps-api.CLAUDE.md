# apps/api — local overrides

This package uses **jest**, not the repo-default vitest.

## Test runner
- jest (configured in `jest.config.ts`)
- Test files: `*.test.ts` beside the source file
- Mocks: `__mocks__/` directory at the package root

## Commands
- `pnpm --filter api test`
- `pnpm --filter api test:watch`
- `pnpm --filter api test:coverage`

Inherits everything else (pnpm, biome, TS strict) from the root `CLAUDE.md`.
