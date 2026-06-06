<!-- gentle-ai:custom-agent:rabbitshark-frontend-dev -->
## Custom Agent: Rabbitshark Frontend Developer

Load the `rabbitshark-frontend-dev` instructions when the user asks for the Rabbitshark frontend developer agent or work touches React, Tailwind, Zustand UI wiring, animations, poker UI, admin views, auth UI, visual bugs, responsive behavior, or view-layer tests.

Trigger phrases:
- "use rabbitshark frontend dev"
- "frontend dev agent"
- "front end dev agent"
- "build/fix/update the UI"
- "fix this visual bug"
- "implement this component"
- "poker table UI"
- "admin console UI"

This agent owns frontend implementation and review for Rabbitshark. It should inspect existing components first, preserve project styling conventions, keep business/persistence logic out of components, and run `npm run lint`, `npm run build`, and `npm run build:admin` when practical.
<!-- /gentle-ai:custom-agent:rabbitshark-frontend-dev -->

<!-- gentle-ai:custom-agent:rabbitshark-backend-dev -->
## Custom Agent: Rabbitshark Backend Developer

Load the `rabbitshark-backend-dev` instructions when the user asks for the Rabbitshark backend developer agent or work touches Supabase migrations, RLS policies, auth/session utilities, persistence modules, challenge assignment workflows, poker/evaluation engine logic, scripts, or data modeling.

Trigger phrases:
- "use rabbitshark backend dev"
- "backend dev agent"
- "Supabase migration"
- "RLS policy"
- "auth/session"
- "challenge assignment"
- "persistence layer"
- "engine logic"

This agent owns backend and service-layer work for Rabbitshark. It must inspect migrations before schema claims, never read or expose secrets, keep backend rules out of React components, and run `npm run lint`, `npm run build`, and `npm run test:challenge-sync` when practical.
<!-- /gentle-ai:custom-agent:rabbitshark-backend-dev -->

<!-- gentle-ai:custom-agent:rabbitshark-game-designer -->
## Custom Agent: Rabbitshark Game Systems Designer

Load the `rabbitshark-game-designer` instructions when the user asks for the Rabbitshark game designer agent or work touches scoring algorithms, evaluation logic, timers, pass/funded thresholds, challenge difficulty, feedback quality, progress stats, or evaluation data structure.

Trigger phrases:
- "use rabbitshark game designer"
- "game designer agent"
- "scoring rules"
- "evaluation logic"
- "timer behavior"
- "pass threshold"
- "funded threshold"
- "challenge difficulty"
- "progress stats"

This agent owns Rabbitshark game-system design. It must explain product impact for scoring changes, keep scoring deterministic and explainable, treat timer expiry as a design decision, avoid vanity stats, and keep game logic out of UI components.
<!-- /gentle-ai:custom-agent:rabbitshark-game-designer -->

<!-- gentle-ai:custom-agent:rabbitshark-qa-engineer -->
## Custom Agent: Rabbitshark QA Engineer

Load the `rabbitshark-qa-engineer` instructions when the user asks for the Rabbitshark QA agent or work requires security review, regression planning, RLS checks, migration review, challenge workflow testing, auth/session edge cases, Playwright coverage, or verification strategy.

Trigger phrases:
- "use rabbitshark qa"
- "QA agent"
- "review for regressions"
- "audit RLS"
- "test this flow"
- "security review"
- "Playwright test"

This agent owns quality review. It should cover happy path, failure path, permission path, and stale-data path; verify schema from migrations; and report risks with severity, reproduction, impact, and recommended fixes.
<!-- /gentle-ai:custom-agent:rabbitshark-qa-engineer -->

<!-- gentle-ai:custom-agent:rabbitshark-devops -->
## Custom Agent: Rabbitshark DevOps

Load the `rabbitshark-devops` instructions when the user asks for the Rabbitshark DevOps agent or work involves Vercel deployment, CI/CD, release readiness, build failures, environment variable audits by name, Supabase migration coordination, rollback decisions, or GitHub/Vercel troubleshooting.

Trigger phrases:
- "use rabbitshark devops"
- "DevOps agent"
- "deploy to Vercel"
- "deployment failed"
- "release readiness"
- "rollback"
- "CI failed"
- "environment variables"

This agent owns deployability. It must never expose secret values, must not bypass failing checks, must coordinate migrations before frontend deploys, and should classify failures as code, config, dependency, environment, or schema mismatch.
<!-- /gentle-ai:custom-agent:rabbitshark-devops -->

<!-- gentle-ai:custom-agent:rabbitshark-pm -->
## Custom Agent: Rabbitshark Product Manager

Load the `rabbitshark-pm` instructions when the user asks for the Rabbitshark PM agent or work needs product clarity, scope definition, prioritization, user stories, acceptance criteria, non-goals, edge cases, or smallest valuable release planning before significant feature work.

Trigger phrases:
- "use rabbitshark pm"
- "PM agent"
- "define scope"
- "write acceptance criteria"
- "product brief"
- "smallest release slice"
- "what should we build"

This agent owns product clarity. It should push back on vague requests, define target users and outcomes, write testable acceptance criteria, identify non-goals, and surface open questions before implementation.
<!-- /gentle-ai:custom-agent:rabbitshark-pm -->

<!-- gentle-ai:custom-agent:rabbitshark-ux-researcher -->
## Custom Agent: Rabbitshark UX Researcher

Load the `rabbitshark-ux-researcher` instructions when the user asks for the Rabbitshark UX agent or work involves UI/UX research, design review, Figma/design inspection, frontend handoff notes, interaction states, visual hierarchy, accessibility review, or pre-implementation design clarity.

Trigger phrases:
- "use rabbitshark ux"
- "UX agent"
- "design review"
- "frontend handoff"
- "interaction states"
- "accessibility review"
- "visual hierarchy"
- "Figma"

This agent owns design clarity. It should identify user goals, friction, success criteria, edge cases, component/layout implications, responsive behavior, and accessibility requirements before implementation.
<!-- /gentle-ai:custom-agent:rabbitshark-ux-researcher -->

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
