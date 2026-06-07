# Monorepo conventions (apply unless a package overrides)

## Stack defaults
- Package manager: pnpm with workspaces
- Default test runner: vitest (overridden in apps/api)
- Lint/format: biome
- TypeScript everywhere; strict mode

## Commands
- `pnpm dev`                       run all dev servers
- `pnpm --filter <pkg> test`       test one package
- `pnpm --filter <pkg> build`      build one package

## Don't
- Don't import across package boundaries directly — go through the index.ts
- Don't add new top-level packages without updating `pnpm-workspace.yaml`
