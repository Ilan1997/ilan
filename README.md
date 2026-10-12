# מנוע תכנון — המזכירה האישית מאיה

אפליקציית תכנון שבועי בקובץ HTML יחיד (`index.html`, עברית RTL). מנוע שיבוץ דטרמיניסטי + מאיה, עוזרת AI שמכירה אותך, לומדת מהתיקונים שלך ומציעה — אבל המנוע הוא זה שמחליט מה חוקי.

- דיבור: 🎙 ליד תיבת ההודעה; אפשר לסמן "שלח אוטומטית" ו"מאיה מקריאה בקול" (כבויים כברירת מחדל).
- עיצוב: שכבת theme מודרנית (themeModern) — CSS בלבד.
- אירועים ברמת הדקה: בטופס "אירוע" אפשר להזין דקות; התצוגה מדויקת, השיבוץ נשאר לפי שעות.

## הרצה
פתח את `index.html` בדפדפן. הנתונים נשמרים בדפדפן (`localStorage`) ולא בריפו.

> הצ'אט עם מאיה: בתוך claude.ai הוא עובד בלי מפתח. באתר הציבורי הוא עובד דרך השירות המשותף (Gemini) למשתמשים מחוברים בלבד, אחרי אישור חד-פעמי של המשתמש להעברת ההודעות לגוגל. אין מפתחות אישיים ואין Anthropic.

## בדיקות
```bash
npm install
npm test          # או: TZ=Asia/Jerusalem node tests/run.js
```

## תיעוד
ראה [ARCHITECTURE.md](ARCHITECTURE.md) — עקרונות המנוע, חוזים, ושכבת מאיה (§16–19).


## Accounts & sync (optional)

Works without any setup (local only). To enable sign-up / sign-in / sync between devices:
1. Create a free project at supabase.com.
2. SQL Editor → run `cloud/setup.sql`.
3. Project Settings → API: copy the *Project URL* and the *anon public* key into `CLOUD_CONFIG` in `index.html`.
4. Authentication → URL Configuration: set Site URL (and Redirect URLs) to the address the app is served from, so password-reset links return to it. Optionally turn off "Confirm email" for instant sign-up.

Security: the page ships a Content-Security-Policy (meta tag) that only lets it talk to `*.supabase.co` (the browser never talks to Gemini or Anthropic directly). If you use a custom Supabase domain, add it to `connect-src`. Minimum password length is 8; also set it to 8+ in Supabase → Authentication → Providers → Email.

Google sign-in: Google Cloud Console → OAuth client (Web) with redirect URI `https://<project>.supabase.co/auth/v1/callback`; then Supabase → Authentication → Providers → Google: paste Client ID + Secret; add the site address to Redirect URLs. Keep the Secret only in Supabase.

## Free AI for everyone (shared Gemini key, kept server-side)

Signed-in users can talk to Maya without any key: the page calls a Supabase Edge Function (`cloud/functions/maya-ai`) that holds the Gemini key as a secret, checks the user, and limits each account to 40 messages a day. Set-up (once):
1. Get a free key at https://aistudio.google.com/apikey.
2. SQL Editor → run `cloud/ai_proxy.sql`.
3. Edge Functions → *Deploy a new function* → *Via Editor* → name it exactly `maya-ai` → paste `cloud/functions/maya-ai/index.ts` → turn **Verify JWT** off (the function verifies the user itself) → Deploy.
4. Edge Functions → Secrets → add `GEMINI_API_KEY` (your key). Optional: `DAILY_LIMIT`, `GEMINI_MODEL`, `ALLOWED_ORIGINS` (comma-separated; default `https://ilan1997.github.io`).
5. In the app: 👤 → "בדוק את ה-AI".
The free Gemini tier has shared limits and Google may use free-tier content to improve its products — the app asks each user for a one-time consent before the first AI message (`_aiEnsureConsent`). Personal API keys and direct Anthropic calls were removed; leftovers are deleted from the browser on load.

### Mandatory login
On the GitHub Pages site the first thing shown is a sign-in / sign-up window that cannot be closed until signed in. Create users via Supabase → Authentication → Users → Add user (Auto Confirm) or sign up in the app.

### Google Calendar import (optional, read-only)
Hidden until `GCAL_CONFIG.clientId` is set in `index.html`. Setup (Google Cloud Console, free):
1. Create a project → **APIs & Services → Library → Google Calendar API → Enable**.
2. **OAuth consent screen**: External, app name, support e-mail; add scope `.../auth/calendar.events.readonly`; while in *Testing* add each user as a **Test user** (max 100; going public needs Google verification for this sensitive scope).
3. **Credentials → Create credentials → OAuth client ID → Web application**; **Authorized JavaScript origins**: `https://ilan1997.github.io` (no path). Copy the Client ID into `GCAL_CONFIG.clientId`.
The user sees a consent window first (risk + responsibility; "busy times only" is pre-checked). Events become blocked time (`gcal_…` ids), no write-back. Disconnect deletes the imported events.

### Microphone
🎙 in Maya's input uses the browser's speech recognition (`he-IL`, Chrome/Edge; Chrome sends audio to Google). One-time consent; the text lands in the box and is **not** sent automatically.

### Delete account, backup, legal
- Run `cloud/delete_account.sql` once in Supabase → SQL Editor. It creates `delete_my_account()` (a signed-in user deletes only their own account + data). Until then "🗑 מחק חשבון" shows an explanatory error and deletes nothing.
- `privacy.html` (served at `/ilan/privacy.html`) is a plain-language terms + privacy page linked from the sign-in window and the account window. **Fill in the contact line before going public and have it reviewed** — it is not legal advice. Google verification needs this URL.
- "⬇ הורד גיבוי" downloads the user's data as JSON (works on the public site; browser downloads are blocked inside claude.ai).
