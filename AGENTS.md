# Code Review Standards — Rabbitshark Console

## JavaScript / React

- Use `const` and `let`; never `var`
- Prefer functional components with hooks
- Use JSX for React components
- Prop validation: use TypeScript or propTypes
- Keep components under 300 lines (split larger ones)
- One component per file (except for tightly coupled sub-components)

## CSS / Tailwind

- Use Tailwind utility classes for styling
- Avoid inline `style={}` for dynamic values; use Tailwind's arbitrary value syntax
- Keep responsive design in mind: mobile-first approach
- Extract repeated utility patterns into `@apply` in CSS modules

## Testing

- E2E tests in Playwright
- Test critical user flows: auth, challenge creation, poker table
- Avoid snapshot testing (brittle)

## Supabase / Database

- Never expose environment variables in client code
- Use RLS policies for data access control
- Document schema changes in migration files
- Test migrations before deployment

## General

- Keep commits atomic and reviewable
- Write descriptive commit messages (conventional commits)
- No hardcoded secrets or sensitive data
- Run `npm run lint` before commit
- Ensure `npm run build` and `npm run build:admin` succeed before pushing
