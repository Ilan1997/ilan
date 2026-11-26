# HANDOFF — מאיה, המזכירה האישית (מצב נכון ל-2026-11-12)

קובץ העברה לשיחה חדשה: מרכז את מה שלא כתוב במקום אחר. פרטים: `SPEC.md` (אפיון + סטטוס 22 עקרונות), `ARCHITECTURE.md` (§1–52), `tests/`.

## מה זה
אפליקציית תכנון בעברית RTL בקובץ `index.html` יחיד. ריפו `Ilan1997/ilan` (ענף main), אתר https://ilan1997.github.io/ilan/ . ענן: Supabase (פונקציית `maya-ai` → Gemini). בדיקות: `node tests/run.js` (jsdom).
**המוצר:** לא "יומן עם AI" אלא מנוע ניהול חיים עם שיקול דעת — מגינה על הזמן, מרכזת, מונעת פיזור.

## כללי עבודה קבועים (מהמשתמש)
- לא לחזק/לשנות את המנוע הדטרמיניסטי (`buildEngine`); המודל מפרש בלבד, **לא מחשב שעות**.
- כל שינוי עם בדיקות אמיתיות; להריץ ב-3 אזורי זמן: UTC, Asia/Jerusalem, America/Los_Angeles (LA בנפרד עם `timeout`). לדווח מספרים אמיתיים ולהודות במה שלא נבדק מול שירותים אמיתיים (Gemini/Supabase/Google/GitHub Pages אינם נגישים מהסנדבוקס).
- בלי UI חדש עד ש-Context → Plan → Validate עובד היטב. UI רגוע ופשוט.
- תשובות בעברית. הודעות commit מסתיימות ב-`Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>` ו-`Claude-Session: …`.
- לא להדביק קישור artifact; משתנים ברמת המודול שמשמשים ב-boot — בראש ה-`<script>`.
- לא להמציא מרחקים: אין מפות; אזורים וזמני נסיעה מוגדרים/נלמדים מהמשתמש (`userRules.zones/travelMatrix`).

## החלטות מוצר שהמשתמש אישר
- ברירות מחדל (משך/מרווח) **לפי סוג משימה ולפי משתמש**, לא גלובליות; כל הנחה מסומנת `assumed` + מקור, ומוצגת ("שמתי שעה, אפשר לשנות").
- **לא** "גוגל = קשיח": קשיחות מוסקת (`inferRigidity`: explicit_user / inferred / calendar_default; לא ידוע → `unknown`, לא קשיח).
- confidence לכל פרט של הפרשנות; פרט קריטי נמוך → שאלה אחת; לא קריטי → הנחה.
- `planChain` (רצף) ו-`scheduleSet` (קבוצה) נפרדים. לכל פריט `mobility` {canMove, canShorten, canDrop, earliest, latest}.
- ContextSnapshot קפוא; לפני Execute — revalidate.
- משימות קטנות: ללא ארכוב אוטומטי — שואלים "עדיין רלוונטי?".

## סטטוס שלבים
A ✅ מודל נתונים · B ✅ הקשר+resolveAnchor+שרשרת בסיסית+intent-eval harness · C ✅ planChain מלא (גם "לפני X") + departureFor + scheduleSet · D ✅ Validate+proposeCuts (enforcement hard/soft, costScore, 8 בדיקות קבלה) · **ה׳ הבא (רק אחרי שהתרחיש המלא נבדק)**: Replan · E Replan · F החלפת הפרומפט ל-`PLAN_REQUEST`, ואז UI.
דמו: `node tests/demo-chain.js`. תרחישי אמת: `tests/fixtures/scenarios.json` (חוזים B–F "pending" יופעלו עם כל שלב).

## פעולות שנשארו אצל המשתמש
1. **להריץ intent-eval מול המודל** (עוד לא רץ): `GEMINI_API_KEY=… node tests/intent-eval/run.js --gemini --out report.json` (או `--function --jwt <token>`), ולשלוח תוצאה.
2. לפרוס מחדש את `maya-ai` ב-Supabase עם ה-timeout (`PER_MODEL_MS = 28000`, שורה 11 ב-`cloud/functions/maya-ai/index.ts`).
3. לבדוק אמיתית: יצירת משימה קטנה בצ'אט ("צריך לקנות חלב ולהתקשר לרופא"); אירוע אחד אמיתי ליומן גוגל; ושמאיה אכן שולחת `CAL_CREATE` / `MEETING_REQUEST` כצפוי.
4. אימות Google OAuth; אימייל קשר ב-`privacy.html`; `cloud/delete_account.sql`.
5. המיקרופון במחשב: לדווח מה שורת הסטטוס אומרת (כנראה חסום כשהאפליקציה בתוך claude.ai).

## ידוע שלא מאומת
התנהגות הפרומפט מול המודל האמיתי; Google POST/PATCH עם `extendedProperties.private` (maya_domain, maya_travel); מיקרופון; מקלדת באייפון; תפוגת טוקן גוגל (~שעה).

## GitHub
הסיבה לחסימת ה-403 הייתה שאפליקציית Claude ב-GitHub הייתה מותקנת רק על `iron-pair-impact`. אחרי הוספת `ilan` ואישור בקשת ההרשאות, `git push` עובד (נבדק 15.11.2026). שלבים א׳–ד׳ + תיקון רענון הטוקן כבר ב-GitHub (`4d31412`). ענף `auth-probe` נשאר מבדיקת ההרשאות (זהה ל-main) וניתן למחיקה ידנית. כל שלב משמעותי = קומיט נפרד. ההיסטוריה הישנה: `backup-local-history`, `backup-step-c`, `backup-step-d`, `backup-auth-fix` (מקומיים) ו-`ilan-backup.bundle`.

## ה-AI ("ההתחברות פגה")
תוקן הרענון (single-flight, ניסיון חוזר, אימוץ סשן מטאב אחר, טוקן תקף נשאר בשימוש). לא אומת מול Supabase אמיתי. אם עדיין נכשל: לשלוח את הטקסט המדויק של השגיאה או את תוצאת "בדוק את ה-AI" בחשבון; לוודא ש-`maya-ai` פרוסה עם `PER_MODEL_MS=28000`, ש-`GEMINI_API_KEY` קיים, ושם המודל תקף (`GEMINI_MODEL=gemini-2.5-flash`).

## Step F — what the user must do once (cannot be done from the sandbox)
1. Redeploy the edge function `maya-ai` (file: `cloud/functions/maya-ai/index.ts`) — it now accepts `mode:"intent"`, `schema`, `temperature` (structured output).
2. Hard-refresh the app (build label `2026-11-18.1` in the header).
3. Live accuracy run: `node tests/intent-eval/run.js --function --jwt <JWT> --out report.json` (or `--gemini` with GEMINI_API_KEY). Send the report; failing cases drive prompt/schema tweaks.
4. Try in the chat: "אחרי הפגישה בפתח תקווה תכנן לי נסיעה לאריאל ואז שעה בית מדרש", then "איחרתי ב-20 דקות".

## Production validation — what the owner runs (cannot be done from the sandbox)
1. Redeploy `maya-ai` (structured output + temperature), consider raising `DAILY_LIMIT` (parser-first routing = one extra call per message). Hard refresh; build label should read 2026-11-18.4.
2. `node tests/intent-eval/run.js --function --jwt <JWT> --out report.json --md report.md` → send `report.md`. It lists, per case, expected vs model intent, per-field pass/fail, question/assumption, latency, repair attempt, and a summary by error type.
3. Then end-to-end: chat → Gemini → engine → Google Calendar (write path).


## Onboarding stage 1 (2026-11-18.6)
Pure core in `index.html` (`onb*`), spec `ONBOARDING_SPEC_V2.md`, tests `tests/onboarding.scenarios.js` (+ fixtures `tests/fixtures/onboarding/`), demo `node tests/demo-onboarding.js [noam|yuval|dani]`. No UI, no calendar writes, no edge-function mode yet (extraction proven only with a stubbed model). Next: UI wiring after the demo is approved; then an `onboarding` extraction mode in `maya-ai` and a live run against Gemini.

### Onboarding next steps (2026-11-18.7)
1. Redeploy `maya-ai` (new `mode:"onboarding"`; copy in `/mnt/user-data/outputs/maya-ai-index.ts`).
2. `node tests/onboarding-eval/run.js --function --jwt <JWT> --out r.json --md report.md` and send `report.md` (any critical blocks UI).
3. `node tests/onboarding-eval/e2e.js yuval --function --jwt <JWT>` (and noam/dani) — real conversation to the post-approval state.
4. Then: replace the fallback placement with `scheduleSet`; then UI.

### Update 2026-11-18.8
Deterministic onboarding core fixed before Gemini eval: materialization of accepted review, MaintenanceNeed vs RoutineProposal, blocking workHours + `partially_placed`, dayStart as proposal (ARCHITECTURE §63). Steps 1–4 above unchanged; eval is now 40 cases.

### Update 2026-11-19 (build .10)
First real eval ran (see ARCHITECTURE §64). Re-run the full eval after pulling .10. If `git pull` fails with schannel/TLS (antivirus HTTPS scanning), download `index.html` and `tests/onboarding-eval/cases.json` from raw.githubusercontent.com instead. Consider lowering `PER_MODEL_MS` for onboarding (p95 ≈ 32s).


## עבודה פעילה 22.11.2026 — multi-account Google Calendar
ענף עבודה: `chatgpt/onboarding-multi-gcal` (PR #1, draft).
- מחברים כמה חשבונות Google Calendar במקביל (למשל אישי + עבודה); כל חשבון נשמר בנפרד עם token זמני ב-session בלבד.
- אירוע זהה שמופיע בשני חשבונות נשאר פעמיים בכוונה ומוצג כחפיפה; אין Google-vs-Google dedupe.
- עריכה/מחיקה נשלחת לחשבון המקור; אירועים חדשים של מאיה נכתבים רק ליומן שנבחר כ-`writeAccountId`.
- ניתוק חשבון אחד לא מוחק את אירועי החשבון השני.
- נוסף CI בשלושה אזורי זמן + `tests/multi-gcal.test.js`.
- באונבורדינג תוקן cadence grounding לכל פריט בנפרד וה-spec יושר מול materialization של סגירת שבוע.
- לפני merge: CI ירוק + בדיקת browser חיה עם שני חשבונות Google אמיתיים.
- 2026-11-23.1: vision-anchored voice for free-chat Maya (see ARCHITECTURE §65); friendly 503/429 message.


## ▶ התחלה מכאן — מצב נכון ל־2026-11-26 (build 2026-11-26.4)
**מי אני / הקשר:** אילן. אפליקציית "מאיה, המזכירה האישית" — קובץ HTML יחיד `index.html` (עברית RTL), פונקציית AI ב־`cloud/functions/maya-ai/index.ts` (Supabase, פרוסה כבר עם `GEMINI_MODEL=gemini-3.5-flash-lite`, `GEMINI_FALLBACK_MODELS=gemini-3.1-flash-lite`). חינמי בלבד — לא משלמים על Gemini. Live: https://ilan1997.github.io/ilan/ . שפה: עברית, הוראות קצרות ומדויקות ל־Windows/PowerShell.

**איפה עומדים (אונבורדינג):** הליבה הדטרמיניסטית `onb*` גמורה. Eval אמיתי מול Gemini (40 מקרים): ריצה 10 = 39/40, 0 critical (ב־B01 תוקן אחרי; נבדק רק ב־replay). E2E `yuval` רץ אמיתי מקצה לקצה; נמצאו ותוקנו 3 פגמים (§71) — **לא אומתו עדיין בהרצה חוזרת**. עדיין לא רצו E2E של `noam` ו־`dani`.

**כללי עבודה שהוסכמו:**
- שער: כל `critical` עוצר ומתקנים; `major` על פעולה/אילוץ/עומס/שבוע־מינימום מתוקן לפני E2E; `minor` אחר כך.
- עיקרון: המודל מדווח מה נאמר; הקוד עושה חשבון/עיגון. כל השלמה ב־`onbNormalizeExtraction(raw,ctx)` חייבת להיות מעוגנת בטקסט התשובה של המשתמש (לא להמציא).
- בדיקות: `npm test` ובנוסף `TZ=Asia/Jerusalem|UTC|America/Los_Angeles node tests/run.js` חייבים לעבור. כל תיקון מקבל בדיקת רגרסיה ב־`tests/onboarding.scenarios.js` ומעלה `APP_BUILD`.
- בדיקת פלט־מודל בלי לשלם: `node tests/onboarding-eval/run.js --mock <raw.json>` (replay), `--mock-expected` (חייב 40/40).
- כל שינוי: לעדכן `ARCHITECTURE.md` (§ חדש), `HANDOFF.md`, commit + push ל־`main`. Trailers: `Co-Authored-By: Claude <noreply@anthropic.com>`.

**הרצה מול Gemini אמיתי (Windows):**
```
cd "$HOME\Documents\ilan"
git pull
$env:NODE_OPTIONS="--use-system-ca"      # פותר SELF_SIGNED_CERT_IN_CHAIN (אנטי־וירוס)
# מפתח זמני (פג אחרי ~שעה): באפליקציה 👤 החשבון שלי → "🔑 העתק מפתח זמני לבדיקות"
$env:JWT="הדבק"
node tests/onboarding-eval/run.js --function --jwt $env:JWT --delay 4000 --out r.json --md report.md
node tests/onboarding-eval/e2e.js noam --function --jwt $env:JWT
node tests/onboarding-eval/e2e.js dani --function --jwt $env:JWT
```
אם `git pull` נופל על schannel: `git -c http.sslBackend=openssl pull`. אם יש שינויים מקומיים בקבצים — `git stash` ואז pull.

**הצעד הבא:** (1) להריץ E2E של `noam` ו־`dani` ואת yuval שוב, לתקן פגמים לפי השער. (2) להחליף את השיבוץ הזמני (`placement:'fallback_greedy'`, ה־TODO ליד `onbBuildTemplate`) ב־`scheduleSet`/`buildContextSnapshot`/`validatePlan` הקיימים. (3) רק אחר כך UI. פתוח לבדיקה: ה־E2E לא שומר את פלט המודל הגולמי — כדאי להוסיף `--trace` ששומר אותו, כדי שאפשר יהיה לשחזר פגמים.
**חוב ידוע:** בצ'אט החופשי נוסף "קול מחובר לחזון" (§65) — השפעתו על תשובות Gemini אמיתיות לא נמדדה. ענף `chatgpt/onboarding-multi-gcal` (PR #1) כבר מוזג ל־main.
