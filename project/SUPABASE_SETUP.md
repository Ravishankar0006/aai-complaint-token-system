# Switching this app from localStorage to Supabase (live, multi-user data)

## What changed in the code
- `src/db/supabaseClient.ts` — new file, connects to your Supabase project.
- `src/db/mockDb.ts` — rewritten to read/write Supabase instead of
  `localStorage`, but keeps the exact same function names, so
  **no other file was touched**: `App.tsx`, `AdminDashboard.tsx`,
  `TechnicianPanel.tsx`, `ComplainantPortal.tsx`, `LandingPage.tsx`,
  `LoginPortal.tsx` are all unchanged.
- `src/main.tsx` — one small addition: waits for the first Supabase fetch
  to finish (shows "Loading…" briefly) before rendering the app.
- `package.json` — added the `@supabase/supabase-js` dependency.
- `supabase-schema.sql` — the database schema + starting data, to run once.

## Steps

1. **Create a Supabase project** at supabase.com (free tier is enough).

2. **Run the schema**: open your project → SQL Editor → New query → paste
   the entire contents of `supabase-schema.sql` → Run. This creates all
   tables, turns on Realtime, and inserts the same starting data your app
   used to hardcode.

3. **Get your API keys**: Project Settings → API → copy the
   **Project URL** and the **anon public** key.

4. **Local setup**:
   ```bash
   cp .env.example .env
   ```
   Paste your Project URL and anon key into `.env`.
   ```bash
   npm install
   npm run dev
   ```
   Open the app in two different browsers (e.g. Chrome + Firefox, or one
   normal + one incognito window). Submit a complaint in one — it should
   appear in the other within a second or two, without refreshing.

5. **Only once you've confirmed step 4 works locally**, commit and push:
   ```bash
   git add .
   git commit -m "Move data layer from localStorage to Supabase for live multi-user sync"
   git push
   ```

6. **Add the same two environment variables on Render**: your Render
   service → Environment tab → add `VITE_SUPABASE_URL` and
   `VITE_SUPABASE_ANON_KEY` with the same values as your `.env`. Save —
   Render will redeploy automatically.

7. **Verify on the live Render URL** the same way as step 4, from two
   separate devices/networks this time.

## If something looks off
- Blank/stuck on "Loading…": open browser dev tools → Console. A missing
  or wrong `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` will print an
  error there.
- Data not syncing live: check Supabase → Database → Replication, and
  confirm all 7 tables are listed under the `supabase_realtime`
  publication (the SQL script does this for you, but worth a glance).
- Nothing lost: your old `mockDb.ts` behavior (business rules, auto
  -assignment, SLA logic) is unchanged — only *where* the data lives
  changed.

## Known limitation (fine for now, worth knowing)
Saves currently upsert the *whole* array for a table at once, mirroring
how the old localStorage version worked. If two people edit the exact
same ticket in the same instant, the second save can overwrite the
first. For a small team this is unlikely to bite you in practice, but if
you ever need airtight concurrent-editing safety, the fix is to switch
`saveTokens` (and friends) to update single rows instead of the whole
table — ask me if/when you want that hardened.
