# intent-eval — בדיקת הפרשנות של המודל

השכבות הדטרמיניסטיות (Context / Plan / Validate) בטוחות רק אם המודל מפרש נכון. כאן בודקים את זה: **טקסט משתמש → Intent מהמודל → Intent מצופה**.

הרצה ידנית (עולה טוקנים, לא חלק מ-CI):
```
node tests/intent-eval/run.js --dry                      # בדיקת התיקים + הדפסת הפרומפט
GEMINI_API_KEY=... node tests/intent-eval/run.js --gemini [--model gemini-2.5-flash] --out report.json --record golden.json
node tests/intent-eval/run.js --function --jwt <JWT של משתמש מחובר>   # דרך הפונקציה maya-ai שבפרודקשן
node tests/intent-eval/run.js --mock golden.json         # הרצה חוזרת על פלטים מוקלטים (בדיקת ה-harness עצמו)
```
- 41 תיקים ב-`cases.json` (כולל שיחה רגילה op=none, ניסוח חופשי בלי מילות מפתח, יעדי "X שעות עד תאריך", העדפות). רק שדות שמופיעים ב-`expected` נבדקים; המודל **לא** רשאי להמציא משך, עוגן או scope שלא נאמרו.
- הפרומפט נלקח מ-`AI_INTENT_PROMPT` ב-`index.html` — מקור יחיד, יהיה גם הפרומפט של `PLAN_REQUEST`.
- ב-CI רץ רק self-check של ה-harness (`compare.js` + הקלטת זהב + פלט פגום) — **הוא לא מודד איכות מודל**.
- הרצה חיה לא בוצעה עדיין (הסנדבוקס שלי לא מגיע ל-Gemini/Supabase). המספרים הראשונים יגיעו מההרצה הראשונה שלך.
