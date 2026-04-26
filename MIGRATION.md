# Smart10 v1 → v2 Migration

This guide covers creating a fresh Supabase project for v2 and migrating all decks and questions from v1.

---

## 1. Create the v2 Supabase project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard) and click **New project**
2. Choose your organisation, give it a name (e.g. `smart10-v2`), set a strong DB password, pick a region
3. Wait for it to spin up (~1 min)
4. Once ready, go to **Project Settings → API** and note:
   - **Project URL** — `https://<ref>.supabase.co`
   - **Publishable key** — used in the app's `.env`
   - **Secret key** — needed for the migration script (keep this secret, bypasses RLS)

---

## 2. Run the schema migration

In the Supabase dashboard, open **SQL Editor** and run the contents of:

```
supabase/migrations/001_initial_schema.sql
```

This creates all tables, RLS policies, functions, and triggers.

---

## 3. Create the deck-images storage bucket

Go to **Storage → New bucket** and fill in:

- **Bucket name:** `deck-images`
- **Public bucket:** on (deck images need to be publicly readable)
- **Restrict file size:** on → set limit to `5` MB
- **Restrict MIME types:** on → allowed types: `image/jpeg, image/png, image/webp`

Click **Create**.

Then go to **SQL Editor** and run these policies so authenticated admins can upload and delete:

```sql
create policy "Authenticated upload"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'deck-images');

create policy "Authenticated delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'deck-images');
```

---

## 4. Configure your .env

Copy `.env.example` to `.env` and fill in the v2 project values:

```
VITE_SUPABASE_URL=https://<ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<publishable key>
```

---

## 5. Create your admin user

1. In the Supabase dashboard, go to **Authentication → Users → Invite user** and invite your email address
2. Accept the invite and set a password
3. Open **SQL Editor** and promote yourself to admin:

```sql
update public.users set is_admin = true where email = 'your@email.com';
```

---

## 6. Migrate data from v1

### 6a. Get your v1 credentials

In the **old** project's Supabase dashboard (**Settings → API**):
- **Project URL**
- **secret key** (under "Secret keys")

### 6b. Set up the migration env file

```bash
cp .env.migrate.example .env.migrate
```

Open `.env.migrate` and fill in all four values:

```
OLD_SUPABASE_URL=https://<old-ref>.supabase.co
OLD_SUPABASE_SECRET_KEY=<old secret key>

NEW_SUPABASE_URL=https://<new-ref>.supabase.co
NEW_SUPABASE_SECRET_KEY=<new secret key>
```

### 6c. Run the migration script


```bash
bun --env-file=.env.migrate run scripts/migrate.js
```

Or via package script:

```bash
bun run migrate:env
```

The script will:
- Copy all decks (preserving IDs so questions remain linked)
- Copy all questions, renaming types and transforming data:

| v1 type | v2 type | Notes |
|---------|---------|-------|
| `blue` | `standard` | No change to answers |
| `orange` | `boolean` | No change to answers |
| `green` | `rank` | No change to answers |
| `red` | `chooseBetween` | No change to answers |
| `pink` | `colors` | Answers converted to `{ text, backgroundColor }` objects; color names mapped to HSL |
| `yellow` | `numbers` | No change to answers |
| `purple` | `centuryDecade` | No change to answers; `purple_metadata_json` is dropped |

URL migration:
- Spotify URLs → `spotify_url` field
- YouTube URLs → `youtube_url` field
- Other URLs → `url` field
- Color labels from `answer_urls_json` on `pink` questions are used as the color `text` label

### 6d. Fix color blobs (optional)

The script maps color names to approximate HSL values. If any colors look wrong, open the question in the admin at `/admin` and use the H/S/L sliders to adjust.

---

## 7. Migrate deck images (optional)

Deck images live in the old project's Supabase Storage. The migration script copies the `image_url` references, but the files themselves aren't automatically re-uploaded. To move them:

1. Open the old project's Storage bucket in the dashboard and download each image
2. Re-upload via the v2 admin (**Admin → Decks → Edit deck → Replace**)

Alternatively, leave the old `image_url` values pointing at the v1 bucket — they'll continue working as long as the v1 project stays active.

---

## 8. Delete .env.migrate

Once you've confirmed everything looks correct, delete the migration env file — it contains the secret key which bypasses all RLS:

```bash
rm .env.migrate
```
