# מנוע תכנון v9 — מסמך אדריכלות ומסירה

מסמך זה קיים כדי שכל סוכן AI חדש (או מפתח אנושי) שייכנס לפרויקט הזה **לא יצטרך לקרוא שיחה של אלפי הודעות** כדי להבין למה הדברים בנויים כמו שהם בנויים. עדכנו אותו (`_lastUpdated` למטה) בכל שינוי אדריכלי משמעותי.

`_lastUpdated: 2026-07-23`

---

## 1. עקרון-העל: המנוע חייב להיות טהור ודטרמיניסטי

**`buildEngine(state, calendarId, options={})` היא הלב של המערכת, וחייבת להישאר פונקציה טהורה.**

- אסור לה לקרוא: `CW`, `ACTIVE_TAB`, `ACTIVE_CALENDAR`, `STATE_ACTIVE`, `document`, `window`, `localStorage`, או `new Date()` בלי ערך קלט.
- כל מידע שהיא צריכה (כולל "עכשיו", "השבוע המוצג", העדפות שנלמדו) חייב להיגיע **דרך `state` או `options` במפורש**.
- **למה זה קריטי:** בסבב עבודה קודם התגלה שהמנוע קרא משתנה גלובלי `CW` (השבוע המוצג) — כלומר אותו State בדיוק הפיק תוצאות **שונות** תלוי באיזה שבוע המשתמש הביט בו במסך. זה בוטל לחלוטין. יש בדיקה קבועה על זה (`runCoreTests` #2).
- **הוכחה בפועל:** `runArchitectureAudit().enginePurityAudit` סורק את קוד המקור של `buildEngine` ונכשל אם אחת המילים האסורות מופיעה שם (לא רק בהערות).

## 2. State הוא מקור האמת היחיד — ותמיד עובר דרך `commitState`

**אסור בהחלט:** `STATE_ACTIVE = something` ישירות, בשום מקום מלבד:
- Boot ראשוני (`let STATE_ACTIVE=loadState()||STATE;`)
- בתוך `commitState` עצמה
- מיגרציה (`migrateState`)

**כל שינוי חי חייב לעבור דרך:**
```js
commitState(nextState, reason, {save, render}) // מגדיל meta.revision פעם אחת, שומר, מרנדר
```
או דרך `dispatchEvent(calendarId, event, opts)` לאירוע בודד.

**`applyEvent(state, calendarId, event)` היא Pure** — לא מגדילה revision בעצמה. פעולה מורכבת (למשל onboarding עם כמה משימות) בונה State זמני עם כמה קריאות `applyEvent` רצופות, ומבצעת `commitState` **פעם אחת בסוף**.

**הוכחה בפועל:** `auditStateMutationPaths()` סורק את קוד המקור בזמן ריצה ומוודא שאין כתיבה ישירה ל-`STATE_ACTIVE` מחוץ לחריגים המותרים.

## 3. שינויי שיבוץ (Assignment) — תמיד דרך `applyValidatedPlan`

**אסור:** רצף `LOCK_EMPTY_SLOT` + `LOCK_SLOT` נפרד, או כתיבה ישירה ל-`lockedAssignments`.

**המסלול הנכון:**
```js
applyValidatedPlan(state, calendarId, {
  expectedRevision, // נגד הצעה/תוכנית מיושנת
  changes: [
    {type:'move', taskId, fromSlotId, targetSlotId},
    {type:'swap', firstSlotId, secondSlotId},
    {type:'lock', taskId, targetSlotId, nth, hardLock},
    {type:'unlock', slotId},
    {type:'edit_task', taskId, patch:{deadline?, requiredUnits?}}, // עריכת תכונות המשימה עצמה
  ]
})
```
מחזירה `{valid, nextState, violations, appliedChanges}`. **אטומי לגמרי** — אם `valid===false`, `nextState` זהה ל-`state` המקורי (אותה הפניה או JSON זהה), בלי שינוי חלקי.

**שכבות הבטיחות מתחתיו (בסדר):**
1. `canAssignSlot(context, task, slot)` — הבדיקה הבסיסית ביותר: past, hardCap, maxPerWeek, maxConsecutive, planning deadline.
2. `validateAssignmentChange` — עוטפת אותה, בודקת גם taskId מקור תואם, לא ניתן לדרוס יעד תפוס בלי swap מפורש, nth נשמר, מספר יחידות לא משתנה ב-move/swap.
3. `validateLockedAssignments` — בדיקה מבנית שלמה על State מוצע: hardCap, maxPerWeek, maxConsecutive, planningDeadline, strict_contiguous, nth כפול.
4. `applyValidatedPlan` — עוטפת הכל: revision, התנגשויות יעד כפולות, ולידציה כשרשרת (batch), clone יחיד.

**הוכחה בפועל:** `auditAssignmentMutationPaths()` סורק בזמן ריצה שאין כתיבה ל-`lockedAssignments` מחוץ למקורות המורשים.

## 4. גרירה של בלוק רצוף — הזזה קבוצתית אטומית

**הבעיה שהייתה:** גרירת שעה אחת מתוך משימת `strict_contiguous` הזיזה **רק את השעה הזו**, ונתנה למנוע "להשלים" את השאר — מה שיכול לפצל את הבלוק (הופר את האילוץ שהמשימה עצמה דורשת).

**הפתרון (`_findContiguousGroup` + `_doMoveSlot`):** גרירה מזהה קודם את כל השעות שנמצאות **באותו בלוק רצוף** (יום זהה, שעות סמוכות, אותה משימה). אם הקבוצה גדולה מ-1:
- מחשבת offset (הפרש ימים/שעות בין מקור ליעד)
- בונה `changes` — move/lock לכל שעה בקבוצה עם אותו offset
- מריצה הכל דרך `applyValidatedPlan` באטומיות — או שכל הבלוק זז, או שכלום לא זז
- אם חלק מהבלוק נעול בנעילת-קשיח — נדחה עם הודעה ברורה, לא מזיז חלק

עובד גם ל-`chunked` (כל צ'אנק נגרר בנפרד, צ'אנקים אחרים של אותה משימה לא זזים).

**⚠️ באג אמיתי שנמצא בייצור (דרך התראת `assertEngineInvariants` בפועל) — שרשרת של 3 תיקונים:**
1. `_findContiguousGroup` הסתמך על `RESULT_P`/`RESULT_W` (ה-render cache הגלובלי) שיכול להיות לא-עדכני ביחס ל-`STATE_ACTIVE` — תוקן: תמיד בונה `buildEngine(STATE_ACTIVE,calId)` טרי, לעולם לא סומך על ה-cache עבור פעולות שמייצרות שינוי (בניגוד לצרכני רינדור בלבד, שם cache לא-מעודכן זמנית הוא לא בעיה).
2. Swap בנה שינויים מסוג `'swap'`, אבל זה דורש נעילה **קיימת** בצד אחד לפחות — רוב המשימות הן auto-scheduled בלבד ומעולם לא ננעלו, אז ההחלפה נכשלה תמיד עם `source_not_found`. תוקן: swap בונה עכשיו `unlock` על שני המקורות ואז `lock` מפורש על שני היעדים — לא מסתמך על מנגנון ה-`swap` הפנימי בכלל.
3. `applyValidatedPlan`'s בדיקת ההתנגשויות טיפלה ב-`unlock(X)` ואז `lock(X)` (באותה תוכנית) כהתנגשות — אבל זה "פנה ואז תפוס" לגיטימי, לא עמימות. תוקן: רק `lock`/`move`/`swap` (שינויים שבאמת "תובעים" משבצת) נספרים; `unlock` לא.

שלושת התיקונים ביחד היו נדרשים כדי ש-swap יעבוד בפועל למשימות שמעולם לא ננעלו ידנית — המקרה הנפוץ ביותר.

**בדקתי גם אם אותה מחלקת באג קיימת במקומות אחרים** (כל שימוש ב-`RESULT_P`/`RESULT_W` שמזין ישירות בניית שינוי, לא רק תצוגה/סינון) — נמצא עוד מופע אחד: `_emBuildProposedState()` (זרימת "הזז דרך חלון עריכה") קראה `nth` והיקף ניקוי-נעילות שבועי מ-`R` ישיר — תוקן לבנייה טרייה מ-`STATE_ACTIVE`. שאר הצרכנים (רשימות תצוגה/סינון כמו `cellMenuPickTask`, `dropSlot`'s ניתוב) עוברים דרך שכבת ה-validation לפני שהם הופכים למוטציה בפועל — נשארים "בטוחים אך לא מדויקים ב-100%" (לכל היותר UX מיושן לרגע, לא invariant violation).

**⚠️ פער ידוע:** אותה בעיה בדיוק קיימת ב-**מחיקה** של שעה בודדת מבלוק רצוף — אין הגנת קבוצה (יש רק ב-Move ו-Swap).

## 5. שכבת ההצעות (Suggestions) — תמיד תוכניות קונקרטיות

**אסור:** הצעה מופשטת (`{consolidate:[...]}` וכו') בלי `changes` קונקרטיים.

**מבנה מחייב לכל הצעה:**
```js
{id, type, calendarId, taskId, taskTitle, generatedFromStateRevision,
 changes:[{type:'move', taskId, fromSlotId, targetSlotId}, ...],
 beforeMetrics, afterMetrics, benefit, risk, validationStatus, validationViolations}
```

**5 סוגי הצעות (`findConcreteSuggestionPlan` + `findInfeasibleTaskResolutions`):**
- `continuity_improvement` — יוצר רצף ארוך יותר
- `reduce_spread` — מקבץ ימים
- `deadline_pressure` — מקדים שיבוץ מאוחר
- `policy_violation` — מתקן חריגת maxPerWeek
- `reduce_scope` / `extend_deadline` — כשמשימה **לא נכנסת בכלל** (level='critical'), מציעה פתרון אמיתי: לצמצם היקף או להאריך דדליין. משתמשת ב-`edit_task` change type.

**כל הצעה מאומתת פעמיים:** פעם אחת ביצירה (`applyValidatedPlan` + `buildEngine` לפני/אחרי + `isPlanImprovement`), ופעם שנייה **מחדש** באישור (`approveSuggestion`) — אם ה-revision השתנה מאז היצירה, ההצעה נמחקת ומחושבת מחדש, לא מבוצעת על State מיושן.

**`isPlanImprovement(before, after)`** — כלל מוחלט: נפסל מיד אם `hardViolationCount`/`totalRemainingUnits`/`totalAfterDeadline`/הפרות maxPerWeek-maxConsecutive **גדלים**. מאושר רק אם משהו משמעותי **השתפר** בלי לפגוע בשום דבר קשיח.

**⚠️ פער ידוע:** אם הצעה יחידה נוגעת בבלוק רצוף, היא פשוט לא תוצג (בטוח, לא חכם) — אין לוגיקה שמציעה להזיז את כל הבלוק.

## 6. Risk Engine — מבוסס remainingUnits, לא needed המקורי

```js
risk[taskId] = {
  done, remainingUnits, effectiveDeadline, eligibleCapacity,
  capacityAfterHigherPriorityTasks, slackHours, remainingActiveDays,
  requiredDailyRate, stressIndex, constraintReasons, level, // 'done'|'safe'|'warning'|'critical'
  // + כינויים לאחור: daysLeft, remaining, availBefore, realisticCapacity, afterDl
}
```
`level` מחושב מ-`remainingUnits` בפועל מול קיבולת חוקית אמיתית (דרך `canAssignSlot`), לא הערכה גסה. ההתראה על משימה קריטית **מסבירה למה** (`constraintReasons` מתורגם לעברית) — לא רק "אין קיבולת".

**`getRiskPresentation(risk)`** — שכבת תצוגה אחידה (label, icon, cardClass, primaryText, explanation, actionHint...). **⚠️ מחוברת רק ל-2 מתוך ~13 צרכני UI** (Task Board, Sidebar summary). Alerts/Preview/AI output/Progress Bar/Suggestion display עדיין לא עוברים דרכה.

## 7. למידה מסתגלת (`schedulePrefs`) — חלק מה-State, לא global

```js
state.schedulePrefs = {
  hourStats: { [hour]: {pushedAwayWeighted, movedToWeighted, sampleCount} },
  taskStats: { [taskTitle]: { [hour]: {...אותו מבנה...} } },
}
```
- כל גרירה ידנית (`_doMoveSlot`) שולחת `RECORD_HOUR_PREFERENCE` (עם `taskTitle`) **באותו commit** כמו ההזזה עצמה — אטומי.
- ניקוד: `_learnedPreferencePenalty` ב-`_scoreSlot` — מעדיף נתון ספציפי-למשימה (אם ≥3 דגימות) על פני הנתון הכללי לשעה. קנס פרופורציונלי למשקל המשימה (`task.needed`) — משימה כבדה נמנעת יותר משעה "רעה", משימה קלה נשארת גמישה.
- **משפיע רק על soft-scoring** — אף פעם לא על אילוץ קשיח.
- `getLearnedInsights(state)` — פונקציה טהורה שמתרגמת את הנתונים הגולמיים לתובנות בעברית, מוצגת בהגדרות תחת "🧠 מה שלמדתי עליך". לא ממציאה כלום — סף מינימלי (`sampleCount>=3`) לפני שמציגה משהו.

**⚠️ פערים ידועים:** רק גרירות ידניות נספרות (לא, למשל, דחיית דדליין חוזרת). התאמת שם מדויקת בלבד (לא fuzzy). אין דעיכת ביטחון לאורך זמן — נתון ישן שוקל כמו נתון חדש.

## 8. חוזה האינטגרציה עם AI — מוכן ל-agent חיצוני כבר עכשיו

**זו הנקודה החשובה ביותר למי שממשיך את הפרויקט:** `_aiApplyPlan(plan)` **לא בודקת מי יצר את ה-`plan`**. כל סוכן — Claude, agent אחר, כל דבר שיודע לפלוט JSON בפורמט הזה — מקבל אוטומטית את כל שכבות הבטיחות (סעיפים 2-5 למעלה) בלי לכתוב קוד נוסף.

**`planVersion`** — `PLAN_JSON_VERSION` (קבוע, כרגע `1`) ו-`PLAN_JSON_SUPPORTED_VERSIONS`. אם `plan.planVersion` חסר — מניחים גרסה נוכחית (תאימות אחורה לקריאות ישנות בלי השדה). אם קיים אך לא מוכר — **לא חוסם**, רק `console.warn` (עדיף לנסות ולהיכשל בעדינות מאשר לדחות שינוי לגיטימי בגלל אי-התאמת גרסה). כשמשנים את צורת ה-PLAN_JSON באופן שובר תאימות — להעלות את `PLAN_JSON_VERSION` ולהוסיף אותה ל-`PLAN_JSON_SUPPORTED_VERSIONS`.

**סכמת ה-PLAN_JSON (התקנית, ראה `AI_SYSTEM_PROMPT_BASE` לפרטים המלאים):**
```json
{
  "planVersion": 1,
  "tasks":[{"calendar":"personal|work","title":"...","location":"","deadline":"YYYY-MM-DD",
            "hours":3,"priority":1-5,"type":"generic|small|blocker",
            "split":"allowed|prefer_contiguous|strict_contiguous|chunked",
            "maxBlockHours":2,"breakHours":1}],
  "events":[{"title":"...","date":"YYYY-MM-DD","startHour":9,"endHour":12}],
  "capacity":{"days":[0-6],"startHour":9,"endHour":17},
  "deletes":[{"type":"task|event","id":"..."}]
}
```

**מה שכבר נייד ומוכן להעברה:**
- `state.schedulePrefs` — נתוני הלמידה, פורמט JSON טהור, לא תלוי-Claude.
- כל ה-state (משימות, נעילות, הגדרות) — כנ"ל.

**מה שכן תלוי בצ'אט הנוכחי (Claude-specific), שווה לשקול לפני מעבר:**
- `AI_PREFS` (טקסט חופשי, מוזן לפרומפט של הצ'אט) — legacy, פחות רלוונטי עכשיו ש-`schedulePrefs` הוא מקור האמת המובנה. אפשר להשאיר ל-agent חדש, או להוציא משימוש.
- הפרומפט המערכתי עצמו (`AI_SYSTEM_PROMPT_BASE`) כתוב בהנחה שהמודל הוא Claude שקורא ל-Anthropic API ישירות מהדפדפן — agent חיצוני עם ארכיטקטורה אחרת (למשל agent עצמאי שקורא ל-`_aiApplyPlan` ישירות בלי לעבור דרך פרומפט טקסט) יכול לדלג על השכבה הזו לגמרי ולקרוא ל-API הפנימי ישירות.

## 9. תשתית בדיקות — איך לבדוק שהכל עדיין עובד

הרץ מקונסולת הדפדפן:
```js
runCoreTests()          // ~82 בדיקות יחידה על המנוע עצמו
runUserScenarios()      // 20 תרחישי משתמש מקצה-לקצה
runArchitectureAudit()  // סורק את קוד המקור בזמן ריצה, מוודא שאין הפרות ארכיטקטורה
```
כולם מחזירים `{passed, failed, ...}` — **אל תצהיר שמשהו "עובד" בלי להריץ את אלה בפועל** (לא רק לקרוא קוד).

## 10. רשימת פערים ידועים — לא "מושלם", אבל כן

1. ~~Swap/מחיקה של שעה מתוך בלוק רצוף — אין הגנת קבוצה~~ **נסגר**: `buildAtomicGroupOperation()` מטפל היום ב-move+swap עם הגנת קבוצה מלאה. Delete — הלוגיקה קיימת ונבדקת, אך **אין עדיין כפתור UI** שקורא לה (לא הגנה חסרה, תכונה שלא נבנתה).
2. `getRiskPresentation` מחובר בהיקף רחב יותר (Task Board, Sidebar summary, Sidebar task cards, Progress Bar, Deadline Bar, Summary Strip) — **תוך כדי נמצאו ותוקנו 2 באגים אמיתיים וישנים**: (א) Summary Strip השווה `level` מול אוצר-מילים ישן (`'crit'/'warn'`) שלא היה קיים יותר — הספירה הייתה תמיד 0; (ב) גבול הכרטיס בסיידבר ופס ההתקדמות בנו class name מ-`level` ישירות (`risk-critical`) בזמן שה-CSS הקיים הגדיר רק `risk-crit` — כלומר הצבע/מסגרת לא עבדו כלל, בלי הודעת שגיאה, כנראה מאז שכתוב ה-Risk Engine. עדיין לא מחובר: Suggestion display (לא רלוונטי — מציג type, לא level), AI output, Unscheduled Reason, Empty/Overload messages — לא נבדקו/תוקנו בסבב הזה.
3. שגרות אמיתיות (UX ל-`timesPerWeek`) — לא נבנה.
4. אין Push notifications אמיתיות (מגבלת web app מובנית).
5. למידה: ללא fuzzy matching, ללא דעיכת ביטחון, רק גרירות ידניות נספרות.
6. לא נבדק בקנה מידה גדול (הרבה משימות, טווח שנה מלא) מבחינת ביצועים.
7. מובייל/נגישות — לא נבדק מחדש אחרי כל שינויי המנוע.
8. ~~Engine Contracts document ו-Engine Metrics~~ **נסגר**: ראה §11 (Contracts) ו-`engineMetrics` בפלט `buildEngine` (§6 המקורי, ר' §12 ל-invariants).

## 11. AI Plan Pipeline — מהצ'אט ועד Commit, בטוח ומדורג

```
User message → AI returns Semantic Plan → prepareAIPlanProposal() → preview →
explicit user approval (כפתור) → approveAIPlanProposal() → applyEvent×N → commitState() פעם אחת
```

**ה-AI מחובר עכשיו לחוזה הסמנטי בפועל** (`AI_SYSTEM_PROMPT_BASE` מייצר \`\`\`SEMANTIC_PLAN כברירת מחדל). מחיקות ושינויי קיבולת קבועה עדיין דרך \`\`\`PLAN_JSON הישן (fallback מכוון, לא הוסר).

**`resolveAIPlanPayload(state, payload)`** — הנתיב הכפול: `semanticVersion` קיים → `compileSemanticPlan`; אחרת `planVersion`/מבנה legacy → `validateLegacyPlanPayload`; אחרת → `UNKNOWN_AI_PAYLOAD_FORMAT`.

**`sanitizeSemanticPlanPayload(payload)`** — הגנה לפני הכל: חוסם `__proto__`/`constructor`/`prototype`, מגביל ל-50 intents, כותרת ל-200 תווים, זורק ערכים לא-סופיים/שעות מחוץ לתחום. לא משנה את האובייקט המקורי.

**`prepareAIPlanProposal(state, aiPayload)`** — האורקסטרטור הטהור: sanitize → resolve → compile/validate → **simulate** (דרך `simulatePlan` הקיים, לכל לוח בנפרד) → **preview אמיתי** (`_buildAIPlanPreview` — טקסט נבנה אך ורק ממספרי הסימולציה בפועל, כולל פירוט יום-ביום, לא מטקסט שה-AI כתב). **לא נוגע ב-State, DOM, localStorage, שעון, ACTIVE_CALENDAR, או Commit.**

**⚠️ אין Commit אוטומטי.** ה-Proposal מוצג בבועת צ'אט עם כפתורי "✅ אשר ובצע" / "ביטול". שום State לא משתנה עד לחיצה מפורשת.

**`approveAIPlanProposal(proposal)`** — הפונקציה **היחידה** שמבצעת Commit. בודקת `proposal.generatedFromStateRevision !== STATE_ACTIVE.meta.revision` → `STALE_REVISION`, לא מבצעת דבר. אחרת: **בונה מחדש** את השינוי מול ה-State החי (לא סומכת על `tentativeState` מהסימולציה, שעלול היה להיות מיושן) דרך שרשרת `applyEvent` (ADD_TASK/ADD_GLOBAL_EVENT) + `commitState` **פעם אחת**. משימות בלבד (`applyValidatedPlan` מטפל בשינויי שיבוץ קיימים — הוספת משימה חדשה היא סוג פעולה אחר, ללא ייצוג ב-`changes` vocabulary כרגע — ראה §12 להערה כנה על זה).

**סיווג שגיאות:** `PARSE_ERROR` · `SEMANTIC_VALIDATION_ERROR` · `COMPILATION_ERROR` · `PLAN_VALIDATION_ERROR` · `SIMULATION_ERROR` · `STALE_REVISION` · `UNKNOWN_AI_PAYLOAD_FORMAT`.

**אטומיות רב-Intent:** intent שגוי אחד מתוך כמה → כל ה-Proposal נפסל (`{valid:false}`), לא אישור חלקי.

**אי-בהירות:** דדליין חסר → `MISSING_DEADLINE` + `clarificationRequests` עם שאלה קונקרטית — לא ברירת מחדל שקטה.

**`runAIPlanPipelineAudit()`** — בודק שה-AI מחזיר את החוזה הסמנטי, ה-Compiler הוא הנתיב הראשי, אין Commit לפני אישור, כל אישור מוגן revision, ה-Preview נגזר מסימולציה אמיתית, טוהר `prepareAIPlanProposal`, ואין חשיפת שדות מנוע בפרומפט. מחובר ל-`runFullSystemAudit()`.

## 12. Semantic Plan Compiler — גבול ארכיטקטוני בין AI ל-PLAN_JSON

```
User text → AI semantic response → compileSemanticPlan() → validated PLAN_JSON → existing plan execution pipeline
```

**`compileSemanticPlan(state, semanticPlan)`** — פונקציה טהורה. `SemanticPlan` לא מכיר שום פרט מנוע (`priorityWeight`, `planningDeadlineOffset`, `splitMode`, `lockedAssignments`, `slotId`) — רק מונחים סמנטיים:
```json
{"semanticVersion":1,"intents":[
  {"action":"create_task","title":"...","calendar":"personal","durationHours":5,
   "deadline":"YYYY-MM-DD","importance":"high","schedulingPreference":"prefer_contiguous"}
]}
```
מיפויים דטרמיניסטיים בלבד (`IMPORTANCE_TO_PRIORITY`, `SCHEDULING_PREF_TO_SPLIT`) — שום ניחוש. שדות חובה חסרים (`deadline`, `durationHours`, `title`) **לא מקבלים ברירת מחדל שקטה** — מחזירים `{valid:false, errors:[{code, intentIndex, field}]}`. ברירת מחדל מותרת רק ל-3 שדות שהוגדרו מפורשות בחוזה: `calendar='personal'`, `importance='normal'`, `schedulingPreference='flexible'`.

מזהה דטרמיניסטי (`_deterministicIntentId`) — hash יציב (djb2) על `semanticVersion|intentIndex|action|title|deadline|calendar`, **לעולם לא** `Date.now()`/`Math.random()`/`crypto.randomUUID()`. התנגשות → suffix דטרמיניסטי (`_2`, `_3`...).

**מסלול כפול** — `_aiApplyPayload(payload)`: אם יש `payload.semanticVersion` → מקמפל דרך `compileSemanticPlan` ואז מריץ את ה-PLAN_JSON המתקבל דרך `_aiApplyPlan` הקיים ללא שינוי; אחרת מעביר ישירות ל-`_aiApplyPlan` (הזרימה הקיימת, ללא שינוי).

**⚠️ חשוב: ה-AI עצמו עדיין לא מחובר לחוזה הזה.** `AI_SYSTEM_PROMPT_BASE` ממשיך לייצר PLAN_JSON ישיר בדיוק כמו קודם. `compileSemanticPlan`/`_aiApplyPayload` בנויים, נבדקו, ומוכנים — אך לא מקושרים לזרימת הצ'אט בפועל. חיבור ה-AI לחוזה החדש הוא צעד נפרד, מכוון, עתידי.

**`runSemanticCompilerAudit()`** — טוהר (סריקת מקור), דטרמיניזם, טיפול בגרסה, תקינות PLAN_JSON, אפס mutation. מחובר גם ל-`runFullSystemAudit()`.

## 12. Engine Contracts — פורמלי לכל פונקציה ציבורית

```
buildEngine(state, calendarId, options={})
  Input:      state (immutable — never mutated), calendarId: 'personal'|'work',
              options.nowMinutes?: number (explicit clock override, for tests)
  Output:     EngineSnapshot = {assignments, dayLoad, progress, alerts, risk,
              engineMetrics, derived:{allFreeSlots, tasks, ...}}
  Never:      mutate state; read CW/ACTIVE_TAB/ACTIVE_CALENDAR/STATE_ACTIVE/
              document/window/localStorage; call `new Date()` with no args
  Determinism: same (state, options) → same assignments/dayLoad/progress/alerts/
              risk/derived, ALWAYS. engineMetrics timing fields are the one
              documented exception (see §11) — never fed back into scheduling.
  Complexity: O(tasks × allSlots) worst case (soft-scoring / hard-overflow
              passes scan the full slot list per task). allSlots is bounded
              by the state's date range × hours/day, not by task count.
  Verified by: runCoreTests, runUserScenarios, assertEngineInvariants

canAssignSlot(context, task, slot)
  Input:      context:{assignments, lockedAssignments, dayLoad, HARD, plDlId,
              wkAssigned}, task, slot
  Output:     {ok:boolean, reason?:string}
  Never:      mutate context/task/slot; the single source of truth for
              "can this task legally occupy this slot" — every other
              validation layer (validateAssignmentChange, suggestion search,
              risk eligibility scan) calls THIS, never reimplements the check
  Complexity: O(1) — no scanning, pure boolean logic over the given context
  Verified by: runCoreTests (canAssignSlot-specific cases)

applyValidatedPlan(state, calendarId, {expectedRevision, changes})
  Input:      state, calendarId, plan.changes: array of
              {type:'move'|'swap'|'lock'|'unlock'|'edit_task', ...}
  Output:     {valid, nextState, violations, appliedChanges}
  Never:      partially apply — nextState is EITHER the fully-applied result
              OR (when valid:false) the exact same reference/JSON as the
              input state; never anything in between
  Complexity: O(changes × validateAssignmentChange's cost) — chains changes,
              validating each against the state as modified by prior ones
  Verified by: runCoreTests, runUserScenarios (Batch Move tests)

buildAtomicGroupOperation(calId, taskId, srcSid, opType, opParams)
  Input:      opType: 'move'|'swap'|'delete', opParams per type (see §4)
  Output:     {ok:true, changes, group} | {ok:false, error, group}
  Never:      mutate STATE_ACTIVE — pure changes[]-builder; caller runs the
              result through applyValidatedPlan and commits separately
  Complexity: O(group size) to build changes; group detection is
              O(assignments for this task on this day)
  Verified by: runCoreTests (#83-86)

commitState(nextState, reason, {save, render}={})
  Input:      nextState (candidate), reason: string (for debug logging)
  Output:     STATE_ACTIVE (post-commit) — also the return value
  Never:      bump meta.revision on a no-op (deep-equal to current
              STATE_ACTIVE); called more than once per logical user action
  Complexity: O(state size) for the deep-equal no-op check;
              O(buildEngine) if render!==false (via recalcAndRender)
  Verified by: runCoreTests (commitState tests)

dispatchEvent(calendarId, event, opts)
  Input:      a single event (see applyEvent's supported types)
  Output:     STATE_ACTIVE (post-commit)
  Never:      bump revision itself (delegates entirely to commitState)
  Complexity: O(applyEvent) + O(commitState)
  Verified by: runCoreTests (applyEvent purity tests, #63-66)

computeScheduleSuggestions(state, calendarId, result)
  Input:      state, calendarId, a FRESH buildEngine result for that state
  Output:     Suggestion[] — every entry has concrete `changes`,
              `beforeMetrics`, `afterMetrics`, `validationStatus`
  Never:      return a suggestion without changes; return a suggestion that
              doesn't pass applyValidatedPlan + isPlanImprovement against a
              fresh buildEngine run
  Complexity: O(tasks × suggestion-types × bounded-candidate-search) —
              each type/task pair does a capped search, not exhaustive
  Verified by: runCoreTests (#67-76), runUserScenarios (#13-17)

assertEngineInvariants(state, calendarId, result)
  Input:      state, calendarId, a buildEngine result for that state
  Output:     {passed, violations}
  Never:      throw on its own (violations are reported, not thrown);
              mutate anything
  Complexity: O(assignments + tasks) — single pass per invariant
  Verified by: runCoreTests (#88-90)

runCoreTests() / runUserScenarios() / runArchitectureAudit() / runFullSystemAudit()
  Input:      none (operate on STATE_ACTIVE / their own isolated freshState())
  Output:     {passed, failed, ...} or {passed, ...sub-audits}
  Never:      leave STATE_ACTIVE mutated after returning (save/restore
              around any test that touches it)
  Complexity: runFullSystemAudit ≈ O(core) + O(scenarios) + O(2×buildEngine)
              — this is the expensive one; don't call it in a hot path
```

## 13. `assertEngineInvariants(state, calendarId, result)` — structural guarantees, checked automatically

Runs **unconditionally, non-blocking** inside `recalcAndRender()` (reuses the result it just built — no extra `buildEngine` cost). A violation never crashes the live app; it's a loud `console.error` signal that the engine itself broke one of its own guarantees:

1. Every lock in `lockedAssignments` agrees with what `result.assignments` actually shows for that slot.
2. `remainingUnits` is never negative for any task.
3. `hardViolationCount` / `maxPerWeekViolationCount` / `maxConsecutiveViolationCount` / `totalRemainingUnits` are never negative.
4. A `strict_contiguous` task's assignments are actually contiguous in the current result — the exact class of bug this whole priority list originated from.
5. No task has the same `nth` on two different slots.

Signature is `(state, calendarId, result)` — matches every other engine function's argument order (`buildEngine`, `applyValidatedPlan`, `computePlanQualityMetrics`, ...). **Keep it that way** — see the process note below for why this matters.

## 14. `runFullSystemAudit()` — one call, whole-system health

Wraps `runArchitectureAudit()` + `runCoreTests()` + `runUserScenarios()` + `assertEngineInvariants()` (on a fresh live snapshot) into one `{passed, architecture, core, scenarios, invariants}` result. This is the single command to run before declaring "the engine is stable" — don't trust a partial check.

## 15. Process note: how to avoid rebuilding what already exists

**This happened once already and cost real time to untangle:** `assertEngineInvariants` and `runFullSystemAudit` were built in an earlier session, then silently dropped from context after a conversation compaction. They were rebuilt from scratch with a **different parameter order** for the same function name — which doesn't error at parse time (the later `function` declaration just silently wins), only surfaces as a confusing runtime crash somewhere else entirely.

**Before adding any new top-level function, grep for it first:**
```bash
grep -n "^function <name>" study_product_v14_improved.html
```
If it already exists, read it before assuming it doesn't. This file (`ARCHITECTURE.md`) is the second line of defense — keep it updated whenever a new top-level system (not a small helper) is added, specifically so this check is fast even without shell access.


## 16. מאיה — פרופיל, כללים ותובנות (שכבת AI רכה)

- **זיכרון קבוע של ה-AI** (לא חלק מ-State התכנון): `AI_PREFS` (`ai:prefs`), `AI_PROFILE` (`ai:profile`), `AI_RULES` (`ai:rules`), `AI_ADDED_TASK_IDS`. היסטוריית שיחה היא session בלבד.
- **פרופיל היכרות** — חמישה נושאים: `work`, `freeDays`, `peak`, `sacred`, `routines`. ה-AI רק *מציע* ערכים בבלוק `PROFILE_UPDATE`; `applyProfileUpdate` (טהורה) מאמתת: טווחים/ימים חוקיים, שעות קדושות רק עם ציטוט מילה-במילה שמכיל את שם היום, וכלל שמשאיר פחות מ-2 שעות פנויות בשבוע לא נאכף. `nextIntakeTopic` קובע שאלה אחת בכל פעם; ההיכרות נסגרת אחרי חמשת הנושאים.
- **כללים נלמדים** — בלוק `LEARN_RULE` `{add, remove}` → `applyRuleUpdate` (ניקוי, ללא כפילויות, remove קודם כדי שהעדפה חדשה תחליף סותרת; תקרה 40 כללים × 140 תווים).
- **תובנות חיות** — `computeMayaInsights(state)` טהורה: משימות בסיכון (דרך `getRiskPresentation`), שעות פנויות השבוע אחרי קיבולת יומית, העדפות מגרירות (`getLearnedInsights`). נשלחות בכל הודעה יחד עם הפרופיל וכל הכללים (`_aiInsightsContext`). **שים לב:** `allFreeSlots[i].date` הוא אובייקט `Date` — משווים לפי `sid.split('T')[0]`.
- **אכיפה אמיתית במנוע (בלי שינוי במנוע):**
  - שעות קדושות → `SET_SACRED_HOURS` → רשומות `sacred:true` ב-`constraintsGlobal.weeklyClosed` (אותו מנגנון של שבת; חוסם את שני הלוחות).
  - שעות עבודה / ימים חופשיים → `SET_DEFAULT_WORK_WINDOWS` (`weeklyWorkPlan.defaultWorkWindows`). תשובה "אין" לעבודה לא מוחקת חלונות קיימים.
  - שעות שיא וכללים נלמדים הם **הקשר רך** בלבד (משפיעים על מה שמאיה אומרת ומציעה, לא על המנוע). פער ידוע.

## 17. אישור הצעה ואפשרויות שיבוץ

- אחרי אישור: "✅ בוצע" → (רק אם משימה חדשה `critical` לפי Risk Engine) שורת אזהרה → כפתור "📅 הצג בלוח". `_aiAppendActionBubble` הוא מנגנון הבועה היחיד.
- `findCandidatePlacements(state, calId, taskId, N, {peak})` — טהורה וקריאה-בלבד. אלטרנטיבות = בלוקים רצופים באורך המשימה מתוך `allFreeSlots` של המנוע (לכן שעות סגורות נשמרות), נבדקות ב-`applyValidatedPlan` + סימולציית `buildEngine` (חייבת לשבץ בדיוק שם ולא להחמיר סיכון/הפרות/איחור). דירוג: סיכון → שעות שיא → מוקדם; יום אחד לכל אפשרות. רק למשימות בלי נעילות ועד 4 שעות. הבחירה: `applyPlacementOption` (אטומי, `commitState` יחיד).
- `_aiApplyPayload` / `_aiApplyPlan` — מסומנים כ-legacy/נתיב מת (נקראים רק מבדיקה); לא נמחקו.

## 18. מסך מאיה

`#mayaInsights` מעל הצ'אט: כרטיס "דחוף" לכל משימה קריטית (עד 3) עם "איך מסדרים?" (שולח הודעה ל-`sendAIMessage` על המשימה), שורות תובנה, ושאלת היכרות בפתיחה (`_aiRefreshGreeting`). כל הטקסט דרך `textContent`. במסך זה הכפתור הצף ➕ מוסתר (`body.ai-mode`).

## 19. בדיקות

`node tests/run.js` — מריץ את כל הסוויטות ב-jsdom (חייב `npm install`). `runFullSystemAudit()` כולל: ארכיטקטורה, ליבה, תרחישים, קומפיילר, pipeline, invariants וכל סוויטות ה-UI/AI (block, approvalCTA, aiProfile, mayaInsights, sacredEnforcement, profileEnforcement, placementOptions, mayaScreen). `runAIBootTests` אסינכרונית ורצה בנפרד. **הערת TZ:** בדיקות תאריכים חייבות להיות בלתי-תלויות באזור זמן (UTC); הרצה בירושלים חשפה בעבר באג בעוזר-בדיקה.

## 20. ערוץ נסתר: למידה בכל הודעה, פלט גלוי פרקטי בלבד

- **נכנס ל-AI בכל הודעה (נבנה מחדש, לא זיכרון שיחה):** נתוני לוח עדכניים, הפרופיל, **כל** הכללים (`AI_RULES`), העדפות מגרירות, ו-`AI_SIGNALS` — תגובות המשתמש להצעות (אישור / דחייה / בחירת מקום אחר), עד 10 אחרונות.
- **שלב הסקה נסתר (פריט 6 בהנחיה):** ה-AI עובר על הכללים, מסיק מההודעה והתגובות מה חדש/השתנה/נסתר, ומעדכן דרך בלוק `LEARN_RULE` (`add`/`remove`).
- **יוצא לאתר:** רק תשובה פרקטית (פריט 7 בהנחיה אוסר לדבר על כללים/למידה). `_aiStripHidden` מסיר בקוד כל בלוק נסתר (כולל כמה בלוקים, אותיות מעורבות ובלוק לא סגור בתשובה שנקטעה); גדרות קוד רגילות נשארות.
- **היסטוריית השיחה** שומרת `SEMANTIC_PLAN` (מה הוצע) אבל לא בלוקי למידה — הכללים נשלחים טריים כל פעם, ולכן אין כפילויות.


## 21. Accounts, sync and reset

- **Client**: a thin fetch-based Supabase client inside `index.html` (section "ACCOUNTS"). `CLOUD_CONFIG={url,anonKey}` is empty by default → the app is local-only and the account window says so. The anon key is public by design; `cloud/setup.sql` enables row-level security so each user can only touch their own `user_state` row.
- **Auth**: `cloudSignUp` (handles "confirm e-mail" → `needsConfirm`), `cloudSignIn`, token refresh (`_cloudEnsureFresh`), `cloudRecover` (+ `#…type=recovery` link → new-password form → `PUT /auth/v1/user`), `cloudSignOut`. Session lives in `localStorage['maya_cloud_session']`.
- **Sync**: `saveState` and the AI-memory savers call `_cloudSchedulePush` (1.5 s debounce). Push = upsert of `{state, ai:{prefs,rules,profile}}`; API keys and chat history are never uploaded. On login `cloudSyncOnLogin` pulls: no remote row → push local; remote only/identical → apply remote; both differ → the user chooses. Remote state enters **only** through `migrateState` + `commitState` (flag `_cloudApplying` prevents push loops); the engine is untouched.
- **Reset** (`resetUserData`, with confirmation): deletes the cloud row first (abort if that fails, so the next login can't resurrect old data), wipes `planner_state_v1` and Maya's memory (keeps the device's BYOK settings), stays signed in, reloads into a clean onboarding. **Sign-out** wipes everything local including API keys so a shared browser never leaks data. `_cloudResetting` freezes `saveState` during both.
- **Tests**: `runAccountTests` (44, mocked fetch) in `tests/run.js`.
- **CSP** (meta tag): `connect-src` allow-list (Supabase only) so injected code cannot ship the session token to another server; `object-src`/`base-uri`/`form-action` locked. `script-src` still needs `'unsafe-inline'` because the app is one file with inline handlers, so CSP limits exfiltration, it does not make XSS impossible. Test 37 scans that every `fetch('https://…')` host is allowed.
- **Google sign-in**: `cloudSignInWithGoogle` redirects to Supabase `/auth/v1/authorize?provider=google`; on return `_cloudHandleOAuthHash` takes `#access_token…`, verifies it with `GET /auth/v1/user` (a forged fragment is rejected), stores the session and syncs. Recovery links are routed separately.

## 22. Work days, rolling horizon, day override

- **No date-range question.** Onboarding step 3 is now "ימי עבודה" (day chips + hours; skipped in personal mode). `wFinish` sets `meta.startDate = meta.today` and `endDate = today + 365`. `extendPlanningHorizon(meta, today)` (pure) is applied at boot and moves `endDate` to today+365 whenever it is closer than 120 days.
- **Day off / shorter day on the fly**: tapping a day header in the board opens `#dayModal` (regular / 🏖 day off / ⏱ shorter hours). `computeDayOverride` (pure) builds the week's window list and the existing `SET_WEEK_WORK_WINDOWS` event stores it — nothing new in the engine. A result identical to the default clears the override; an all-days-off week is stored with a harmless Saturday 00–01 sentinel because `[]` means "default". Headers show 🏖/⏱ badges. Past days can't be edited.
- **Tests**: `runDayOverrideTests` (23), including that the real engine stops scheduling on a day marked off.
- **Onboarding ends in Maya.** The task-entry step and the "all set" screen were removed; the last question step's button ("כניסה") calls `wFinish`, which lands on the Maya screen (she opens with the intake question). For a not-yet-onboarded (new or reset) user `wFinish` first applies `_stripSeedData` — the built-in fixture (demo exams, one-off block, someone's work hours) never reaches a real user. A re-opened tour by an onboarded user is not stripped.
- **Reset does not depend on a reload.** `resetUserData` swaps the live state for an empty one through `commitState` (`save:false`), clears the deadline bar / Maya log, and shows the welcome flow immediately; `_reloadApp()` follows as belt-and-braces (sandboxed hosts may ignore it). A brand-new user also boots with `_stripSeedData(STATE)` instead of the demo fixture.
- **Vacation ranges**: the day editor has an optional "עד תאריך". `applyDayRange` (pure) applies the chosen mode to every default work day in the range (weekends, non-work days and past days skipped, max 120 days) by chaining `SET_WEEK_WORK_WINDOWS` per week, and a single `commitState` stores the result (one revision bump).

## 23. Real AI: routes and the shared proxy

`_aiCallModel` order: Claude `sample` (inside claude.ai) → **shared proxy** for signed-in users (`_aiCallProxy` → Edge Function `maya-ai`) → Anthropic direct (fails with `noKey`). The proxy keeps the Gemini key server-side, verifies the user with `auth.getUser`, caps each account per day (`bump_ai_usage`), validates sizes, and only answers the configured origins. `_aiRoute()` and `testAIConnection()` power the "🤖 חיבור AI" block in the account window. Tests: 11 mocked-fetch cases in `runAccountTests` (P1–P11), `tests/proxy.test.mjs` (function logic with mocked Supabase/Gemini), and static checks in `tests/run.js` (no key material in the repo).

## 24. Mandatory login gate
- `_cloudGate()` runs at the end of `_cloudBoot()` (and after a dead refresh token): if cloud is configured, the user is not signed in, not in password recovery, it calls `openAccount({forced:true})`.
- The forced modal has no close button, `closeAccount()` is ignored until signed in, reset and AI blocks are hidden; it closes itself after sign-in / sign-up / new password.
- The Google button is shown only when `CLOUD_CONFIG.google` is true (currently false).
- Tests: `runAccountTests` G1–G8.

## 25. Display name
Sign-up asks for a name (the "הרשמה" button first reveals the `accName` field); it is sent as `data:{name}` (Supabase `user_metadata`), kept in the session (`CLOUD_SESSION.user.name`) and returned on every sign-in, so e-mail + password is enough later. `cloudDisplayName()` feeds the header chip `#hnAcc` ("👤 שלום <שם>" / "👤 התחבר", opens the account modal), the home greeting and the wizard name prefill. Tests N1–N5.

## 26. Boot-order rule (TDZ)
Module-level `let` state used by `saveState`/`openAccount` (`_cloudResetting`, `_accForced`, `CLOUD_SESSION`, …) is declared at the very top of the script. Boot code can call `saveState()` (migrated stored state) before the ACCOUNTS section runs, and reading a `let` before its declaration throws and aborts the whole script. `tests/run.js` boots a second jsdom with an existing user whose plan needs migration and asserts no errors and a working account button.

Addendum: `CLOUD_CONFIG` also moved to the top (saveState → cloudConfigured read it before declaration; saveState swallowed the error, so only the console showed it — the boot test now also fails on `console.warn` containing "failed"/"before initialization"). Personal AI keys must be printable ASCII (`_aiKeyValid`); a stored key with other characters is ignored with a clear Hebrew message instead of crashing `fetch` headers.


## 27. AI route: proxy only
No personal keys, no direct Anthropic/Gemini from the browser (CSP allows only Supabase). Outside claude.ai every message goes through the `maya-ai` Edge Function for signed-in users, after a one-time legal consent (`maya_ai_consent` in localStorage). Rules learning is unchanged: `AI_RULES` are re-sent on every message and the model updates them through the hidden `LEARN_RULE` block (see system prompt step 6).

## 28. One-time demo-seed purge
Older versions stored the demo fixture (6 exams, 3 reserves, a one-off block) inside real users' saved state. `_purgeDemoSeed` (called from `loadState` and the cloud pull) removes entries that still match the fixture exactly (id+title / name+note), once per state (`meta.demoPurged`), and flags `window.__demoPurged` so boot persists the cleaned state (which then syncs to the cloud). Tests D1–D3; signed-in users without a name get a name field in the account window (E1).

## 29. Simplified UI + weekly briefing
Header = 📅 יומן / 🤖 מאיה / 📋 משימות / 👤 חשבון only (week controls + חיים/עבודה toggle only on the calendar). Removed from the header: home, add-task, settings (now inside the account window), the floating ➕. Tasks are added from Maya or the Tasks page ("➕ משימה חדשה", `boardAddBtn`). A returning user lands on Maya (`_checkOnboarding` → `switchTab('ai')`); `paneHome` still exists but is unreachable. `computeWeekBriefing(state)` is pure and deterministic (no AI call): rest of the current week (next week on Saturday) grouped by day kind (work / life / free / day-off), load label, and reminders for deadlines ≤21 days (⚠️ for exams/big tasks) + critical at-risk. Rendered as the top card (`mayaWeekCard`) in `renderMayaScreen`; omitted when nothing is planned. Tests S1–S7.

## 30. Google Calendar import + microphone
`gcalItemsToBlocks` (pure) maps timed Google events to hour blocks (all-day / cancelled / transparent / declined skipped; multi-day split; rounded outward; titles replaced by "תפוס (יומן גוגל)" in times-only mode). `REPLACE_GCAL_EVENTS` swaps every `constraintsGlobal.events` entry whose id starts with `gcal_` in one state update, leaving the user's own events. Auth = Google Identity Services token client (access token only, never stored); scope `calendar.events.readonly`; CSP allows `accounts.google.com/gsi/client`, `www.googleapis.com`, `accounts.google.com`. Consent (`maya_gcal` in localStorage) is required before any Google call; sign-out/reset wipe it. Microphone: `micToggle` (Web Speech API, `he-IL`), consent `maya_mic_consent`, result goes to the input box only. Tests GC1–GC11, MIC1–MIC3.
