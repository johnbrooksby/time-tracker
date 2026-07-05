# Time Tracker

A tiny PWA to track permit driving practice hours toward a 60-hour goal, synced
across devices via Supabase.

## 1. Set up Supabase

1. Create a free project at [supabase.com](https://supabase.com).
2. In the SQL editor, run the contents of [`supabase-schema.sql`](supabase-schema.sql).
3. In **Authentication > Providers**, make sure Email is enabled (magic link sign-in
   is used, so no password is needed).
4. In **Project Settings > API**, copy the Project URL and anon public key.

## 2. Configure the app

Copy `.env.example` to `.env` and fill in the values from step 1:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## 3. Run locally

```
npm install
npm run dev
```

Sign in with an email address — Supabase sends a magic link. Anyone who signs in
sees and can add to the same shared list of sessions (see the RLS policies in
`supabase-schema.sql` if you want to restrict this later).

## 4. Deploy

Push this project to a GitHub repo and import it into
[Vercel](https://vercel.com) (or Netlify). Add the two `VITE_SUPABASE_*`
environment variables in the hosting dashboard's project settings, then deploy.

## 5. Install on a phone

Open the deployed URL in Safari (iOS) or Chrome (Android) and use
"Add to Home Screen" — it installs like a native app and works offline for
already-loaded data.
