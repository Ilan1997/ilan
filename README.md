# מנוע תכנון — המזכירה האישית מאיה

אפליקציית תכנון שבועי בקובץ HTML יחיד (`index.html`, עברית RTL). מנוע שיבוץ דטרמיניסטי + מאיה, עוזרת AI שמכירה אותך, לומדת מהתיקונים שלך ומציעה — אבל המנוע הוא זה שמחליט מה חוקי.

## הרצה
פתח את `index.html` בדפדפן. הנתונים נשמרים בדפדפן (`localStorage`) ולא בריפו.

> הצ'אט עם מאיה: בתוך claude.ai הוא עובד בלי מפתח. מחוץ לשם צריך מפתח API אישי — **Gemini של גוגל** (יש שכבה חינמית; גוגל עשויה להשתמש בתוכן בשכבה החינמית) או Anthropic. המפתח נשמר רק בדפדפן שלך (`localStorage`), אף פעם לא בריפו. הגדרה: בצ'אט, הקישור "מפתח AI". **אל תכניס מפתח ל-`index.html`.**

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
