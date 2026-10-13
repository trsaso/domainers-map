# Turning on Sign in with X and shared listings

Without these settings the app runs in **demo mode**: sample data only, no sign-in. Three services need
setting up (Supabase, X and Vercel), which takes about 15 minutes. No secret keys go into the app or Vercel. The X app's secret
is stored only inside Supabase.

## Which account owns what

| Service | Sign in with | Used for |
|---------|--------------|----------|
| GitHub | **trsaso** (trsaso@gmail.com) | the code repository |
| Vercel | **sasograbcom@gmail.com** | hosting and environment variables |
| Supabase | **trsaso@gmail.com** | database and member sign-ins |
| X developer app | **@GrabCom** | the "Sign in with X" app |

The services connect only through the values you copy between them, so it doesn't matter that the emails differ.

## 1. Supabase project and database

1. Go to https://supabase.com, sign in with **trsaso@gmail.com**, and click **New project**. Pick a region close to your users,
   such as Frankfurt, and save the database password somewhere safe. Wait until the project is ready.
2. Open **SQL Editor → New query**. Paste the whole of `supabase/migrations/0001_profiles_domains.sql`
   and click **Run**. Then do the same with `supabase/migrations/0002_offers.sql`.
   Both files are safe to run again later.
3. Open **Project Settings → API** (on newer dashboards, **API Keys**) and copy two values:
   - **Project URL**, e.g. `https://abcd1234.supabase.co`
   - the **anon / public** key. A newer `sb_publishable_…` key also works.

## 2. X developer app

1. Sign in to https://developer.x.com as **@GrabCom** → **Developer Portal → Projects & Apps** and create an app. The Free tier is enough.
2. In the app, open **User authentication settings → Set up** and fill in:
   - **App permissions:** Read
   - **Type of App:** Web App
   - **Callback URI:** `https://<your-project>.supabase.co/auth/v1/callback`, using the Project URL from step 1.3
   - **Website URL:** `https://domainers-map.vercel.app`
3. Open **Keys and tokens** and copy the **API Key and Secret** (Consumer Keys).

## 3. Connect X to Supabase

1. In Supabase, open **Authentication → Sign In / Providers → Twitter**. Turn it on, paste the API Key
   and API Secret, and save.
   - If your dashboard offers **X / Twitter (OAuth 2.0)** and you'd rather use that, paste the app's
     **OAuth 2.0 Client ID and Secret** instead. Also set `NEXT_PUBLIC_SUPABASE_X_PROVIDER=x` in Vercel (step 4).
2. Open **Authentication → URL Configuration** and set:
   - **Site URL:** `https://domainers-map.vercel.app`
   - **Redirect URLs** (add all three):
     - `https://domainers-map.vercel.app/auth/callback`
     - `https://*-sasograbcom-9197s-projects.vercel.app/auth/callback` (Vercel previews)
     - `http://localhost:3000/auth/callback`

## 4. Vercel environment variables

Sign in to Vercel with **sasograbcom@gmail.com**, then open **domainers-map → Settings → Environment Variables** and add these for **Production and Preview**:

| Name | Value |
|------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | the Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | the anon / publishable key |
| `NEXT_PUBLIC_SITE_URL` | `https://domainers-map.vercel.app` |

Then go to **Deployments**, open the latest deployment, choose **⋯ → Redeploy**, and untick the build cache.

## 5. Check it

1. Open the site. The top bar should show **Sign in with X**.
2. Sign in. You'll land on **Put yourself on the map**. Add your city and country, click the map to place your pin, and save.
3. Open **My domains → + Add domain**, list a name, and check that it appears on the map and under **Domains**.
4. In a private window, signed out, open that domain. It should be visible and should ask you to sign in to make an offer.

If sign-in comes back with an error, the message is shown at the top of the map. The usual causes are:
- The callback URI in the X app doesn't exactly match `https://<project>.supabase.co/auth/v1/callback`.
- The site's `/auth/callback` URL is missing from Supabase's Redirect URLs.

## How the rules are enforced

Permissions live in the database (Row Level Security), not in the browser:
- Anyone can read profiles and listed domains.
- Members can change only their own profile and domains.
- An auction with bids can't be deleted until it ends.
- Bids go through a server function that applies the minimum, keeps maximums private, and sends outbid notices.

`npm test` checks these rules against the migration files in an in-process Postgres.
