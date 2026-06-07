# Code style

## Indentation & quotes
- 2-space indents, never tabs
- Single quotes in JS/TS unless escaping
- Trailing commas everywhere allowed

## Exports & imports
- Named exports only, no default exports
- Sort imports: external first, then aliased (`@/`), then relative
- Never import across package boundaries directly — go through the index.ts

## Naming
- Files: `kebab-case.ts` (except React components: `PascalCase.tsx`)
- Variables / functions: `camelCase`
- Types & components: `PascalCase`
- SQL columns: `snake_case` even though TS is `camelCase`

## Comments
- Default to no comments. Only add when the WHY is non-obvious.
- Never restate what code does in a comment.
- Don't reference current task / fix / callers in comments.
