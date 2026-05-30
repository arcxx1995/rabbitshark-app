# Client Area Auth

The app owns authentication. Users can open the player app or admin console
directly and sign in with Supabase email/password credentials.

Required Vite env vars:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-or-publishable-key
```

Supabase persists the browser session, so reloads and later visits stay signed
in until the user logs out. Logout clears this app's stored access grant and
calls Supabase sign-out for the browser session.

Landing page integration should be a client-area link or embedded app entry,
not a token handoff. Point the landing page's client area to:

```text
https://app.example.com/
```

For the admin console:

```text
https://app.example.com/admin.html
```
