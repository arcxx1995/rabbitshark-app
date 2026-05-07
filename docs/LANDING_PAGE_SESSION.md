# Landing Page Session

This app does not render login or sign-up UI. Users should authenticate on the
landing page, then be redirected here with a Supabase session token.

Required Vite env vars:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-or-publishable-key
VITE_LANDING_PAGE_URL=https://your-landing-page.example
```

Supported redirect formats:

```text
https://app.example.com/?access_token=SUPABASE_ACCESS_TOKEN&refresh_token=SUPABASE_REFRESH_TOKEN
https://app.example.com/#access_token=SUPABASE_ACCESS_TOKEN&refresh_token=SUPABASE_REFRESH_TOKEN
https://app.example.com/?accessToken=SUPABASE_ACCESS_TOKEN&refreshToken=SUPABASE_REFRESH_TOKEN
```

The console verifies `access_token` with Supabase. If that token has expired and
`refresh_token` is present, it attempts to refresh the session. `session` may be
a plain JSON or base64-encoded JSON object containing `access_token` and
`refresh_token`.

Logout clears only the console's stored access grant and redirects to
`VITE_LANDING_PAGE_URL`. It does not revoke the landing page's Supabase session.
If that env var is not set, the app uses the external referrer when available,
then falls back to `/`.
