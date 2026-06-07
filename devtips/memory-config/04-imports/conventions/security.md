# Security conventions

## Secrets
- Never commit `.env` files — `.gitignore` already excludes them
- Read secrets from `process.env` only at module init, not deep in call stacks
- Never log a secret — even partial. No "first 4 chars of API key" debug logs.

## Auth
- All `/api` routes go through the auth middleware unless explicitly listed in `PUBLIC_ROUTES`
- Never trust client-supplied user IDs; always derive from the verified session
- Rate-limit endpoints that touch credentials, sessions, or password reset

## Input validation
- All request bodies validated by zod schemas at the route boundary
- Never pass raw user input to SQL — Prisma's parameterized queries only
- File uploads: validate MIME type AND magic bytes, never trust the extension

## Dependencies
- New runtime deps need approval (mention in PR description why)
- Pinned versions only — no `^` or `~` in production deps
- Run `pnpm audit` before merge; fix highs and criticals
