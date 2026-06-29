# Momentum — Hosted App (with login + cloud sync)

This is the **deployable** version of your Momentum planner. Unlike the in-chat artifact, this one has a **real login** and saves your data to a **cloud database**, so your MacBook and iPhone stay automatically in sync. Log in on any device, your data is there.

You (or any developer) can get this live in about an afternoon. Below is the plain-English guide. No prior experience assumed — just follow it top to bottom.

---

## What this is, in normal words

- **Next.js** — the framework that runs the app (the screens you see).
- **Supabase** — a free service that gives you two things you can't get from a chat artifact: a **login system** (email + password) and a **cloud database** (where your entries live so every device sees the same data).
- **Vercel** — a free service that puts the app on the internet at a real URL you can open on your phone.

All three have **free tiers** that are way more than enough for one person. Realistic cost: **€0/month** to start. If you ever outgrow the free tier (you won't, for personal use), it's ~€20/month.

---

## Step-by-step: get it online

### 1. Create a Supabase project (your database + login)
1. Go to **supabase.com**, sign up (free).
2. Click **New Project**. Give it a name like "momentum". Pick a region near you (e.g. Frankfurt). Set a database password and save it somewhere.
3. Wait ~2 minutes for it to build.
4. In the project, open the **SQL Editor**, paste in the contents of `supabase/schema.sql` (included in this package), and click **Run**. This creates the table that holds your entries and locks it down so only you can read your own data.
5. Go to **Project Settings → API**. Copy two values — you'll need them in step 3:
   - **Project URL**
   - **anon public key**

### 2. Put the code somewhere
- Easiest: create a free **GitHub** account, make a new repository, and upload this whole folder to it. (Or hand the folder to a developer and skip to step 3.)

### 3. Deploy on Vercel
1. Go to **vercel.com**, sign up with your GitHub account (free).
2. Click **Add New → Project**, pick the repository you just made.
3. Before deploying, open **Environment Variables** and add these two:
   - `NEXT_PUBLIC_SUPABASE_URL` = the Project URL from step 1.5
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = the anon public key from step 1.5
4. Click **Deploy**. Wait ~1 minute.
5. Vercel gives you a URL like `momentum-yourname.vercel.app`. **That's your app.** Open it on your laptop and your phone — same login, same data, synced.

### 4. First run
- Open the URL, click **Sign up**, make your account with email + password.
- Start filling it in. Everything saves to the cloud automatically. Open the same URL on your iPhone, log in with the same email — your data is already there.

> **Tip:** On iPhone, open the URL in Safari, tap Share → **Add to Home Screen**. Now it behaves like a real app with its own icon. Same on Mac with Chrome (Install button in the address bar).

---

## Running it on your own computer first (optional)

If you want to test locally before deploying:

```bash
npm install
# create a file named .env.local with these two lines:
#   NEXT_PUBLIC_SUPABASE_URL=your-project-url
#   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
npm run dev
```
Then open http://localhost:3000

You'll need **Node.js** installed (nodejs.org, the LTS version).

---

## Is my data private?

Yes. The database schema (`supabase/schema.sql`) turns on **Row Level Security**, which means the database physically refuses to return one user's rows to another user. Your entries are tied to your login and only your login can read them. Your password is handled by Supabase's auth system — the app never stores it directly.

Keep regular **exports** anyway (the app has a backup button) — belt and suspenders.

---

## What's in this package

```
momentum-app/
├── README.md                 ← you are here
├── package.json              ← dependencies
├── next.config.js
├── lib/
│   ├── supabaseClient.js     ← connects the app to your Supabase
│   └── storage.js            ← read/write entries to the cloud (replaces browser storage)
├── app/
│   ├── layout.js
│   ├── page.js               ← login gate + loads the planner
│   └── Planner.jsx           ← the full planner UI (same as your artifact)
└── supabase/
    └── schema.sql            ← run this once in Supabase to set up the database
```

The planner UI itself is identical to what you've been using — all the work we did (Vision, Dashboard, Income with base+commission, Habits with streaks, the "why" guidance, quarter→week→day laddering) carries straight over. The only thing that changes under the hood is **where the data is saved**: cloud instead of browser.

---

## If you hand this to a developer

Tell them: "It's a Next.js 14 App Router project backed by Supabase (auth + Postgres). Run `schema.sql` in Supabase, set the two `NEXT_PUBLIC_SUPABASE_*` env vars, deploy to Vercel. The data layer is in `lib/storage.js` — it's a key/value model (`entries` table: user_id, key, value JSONB). The UI is in `app/Planner.jsx`." That's all they need.

A competent dev will have this live in under an hour.
