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

## 31. Simple tasks page, account deletion, legal
Tasks page: header + "➕ משימה חדשה" + search/filter + one table per world (a world with no tasks is hidden; both empty → one friendly line `boardEmpty`). Reserves, micro-tasks, alerts and global events moved into a collapsed `<details id="boardMore">` (ids unchanged, so the renderers keep working). The clock/anchor status bar shows only in simulation mode (`body.sim-mode`). `deleteAccount()` → RPC `delete_my_account` (cloud/delete_account.sql); local data is wiped only after the server confirms. Tests DA1–DA6 + static check for `privacy.html`/SQL.

## 32. Error log + sacred-lock rule
`window.__mayaErrors` (last 8 uncaught errors / rejections, registered at the top of the script) feeds a red dot on the 👤 button and a "🐞 פרטי תקלה" button in the account window that shows copyable text — so a user without a console can report a problem. Engine rule now covered by a test (Sacred #8): a lock created before the hours became sacred never overrides them; the task is replanned elsewhere. The legacy `_aiApplyPayload/_aiApplyPlan` were kept on purpose (still used for AI delete requests and by tests).

## 33. אירועים ברמת הדקה
אירוע גלובלי יכול לשאת `startMin`/`endMin` (דקות מתחילת היום). המנוע נשאר בגרנולריות של שעה: `startH=floor`, `endH=ceil`, והדקות משמשות לתצוגה בלבד (בלוק ממוקם בתוך התא לפי אחוזים + טקסט `HH:MM–HH:MM`). `_cleanEvMinutes` מנקה דקות לא עקביות. ייבוא יומן גוגל שומר דקות. בדיקות ME1–ME5.

## 34. יומן גוגל: סקירה חכמה וכתיבה
- **סקירה:** `computeWeekBriefing(state, extra)` (טהורה) מוסיפה `events` (עד 5 אירועים קרובים עם שם) ותזכורות "📌 … כדאי להתכונן" לאירועים מרכזיים (`_KEY_EVENT_RE`) תוך 14 יום. אירועי כל-היום (`gcalAllDayFromItems`) נשמרים רק ב-localStorage (`maya_gcal_allday`), לא חוסמים שעות, ורק כששמות האירועים מוצגים. כששמות מוסתרים — רמז להפעיל.
- **כתיבה:** הרשאה נפרדת (`scopeWrite = calendar.events`), `prefs.write`, חלון אישור עם תיבת סימון. יצירה/עדכון/מחיקה דרך `_gcalCall` (יומן ראשי בלבד), כולן עוברות ולידציה (`_gcalValidateEv`), ואחריהן סנכרון מחדש (בלוקי `gcal_` מוחלפים — אין כפילות). אירועים נושאים `gid`.
- **אישור בכל פעולה:** שמירה/מחיקה בעורך (`openGcalEditor`, אירועי יום אחד בלבד), כרטיס אישור בשיחה להצעת מאיה (`CAL_CREATE` בלוק נסתר → `_aiOfferCalCreate`; שום דבר לא נכתב לפני לחיצה).
- ניתוק מוחק גם את הרשאת הכתיבה. בדיקות GB1–6, WR1–20.

## 35. מאיה כמזכירה: כללים, סיווג וסקירה עניינית
- **כללי מזכירה (`MAYA_CORE_RULES`, 13):** כללים רגילים לכל דבר — נזרעים פעם אחת ל-`AI_RULES` (דגל `ai:rules_seeded`, נמחק באיפוס חשבון ונקבע בשחזור מהענן), נשלחים מחדש בכל הודעה, ומאיה יכולה להחליף/להסיר/לחדד אותם דרך `LEARN_RULE` כמו כל כלל. "אפס מה שנלמד" מחזיר לברירת המחדל ולא מרוקן.
- **סיווג:** `taskCategory(task,calId)` (טהורה): `task.cat` מאיה → יומן עבודה = עבודה → הסקה ממילות מפתח → "אחר". קטגוריות: עבודה, לימודים, משפחה, בריאות, כספים, סידורים, מנוחה ופנאי. `category` ב-intent של `create_task` אופציונלי; ערך לא חוקי נזרק בשקט. תג הסוג מוצג בעמוד המשימות ונשלח למאיה בהקשר.
- **מסך מאיה:** נתונים פנימיים (שעות פנויות, "למדתי N העדפות") לא מוצגים. הסקירה = כותרת, משפט סיכום אחד, ועד 3 שורות (תזכורות קודם, אחר כך אירועים קרובים). בדיקות CR1–8.

## §36 Conversational add-task, task cards, themeV2

- **Add-task sheet** (`#qaModal .qa-sheet[data-step]`): Maya-persona flow in 3 steps (name → duration → deadline). Category is auto-inferred (`taskCategory`) and cyclable by chip; `_qCat` overrides. Payload gets `cat` only when not `other`.
- **Deterministic Hebrew parsers**: `parseDurationHe`, `parseDeadlineHe`, `estimateTaskHours` (keyword/category heuristic — *not* a live AI call), `hoursLabelHe`, `dlRelativeHe`. The engine is hour-granular, so sub-hour durations round up to 1h.
- **Tasks page**: `renderTaskBoard()` builds `.tk-card` articles grouped by urgency, with category chips (`_boardCat`, declared at script top for TDZ safety), progress derived from engine state, and a remove button.
- **themeV2** (`<style id="themeV2">`): Google-Calendar-like grid (hairlines, today pill, red now-line) and springy motion/confetti; respects `prefers-reduced-motion`. `.blk:hover` must not use `transform` (guarded by BlockRender test 11).
- Tests: QA1–QA15 in `runAccountTests`.

## §37 Profession-aware rules and work-hours commitment

- New intake topic `role` (first in `AI_PROFILE_TOPICS`): free text in the user's own words (2–80 chars). Soft context only.
- `ROLE_PROFILES` / `roleTimeRules` / `applyRoleRules`: deterministic starter rules per profession (student, project manager, developer, teacher, medical, freelancer, manager). Rules start with "מקצוע", so a changed profession replaces them. Unknown professions yield no invented rules; the model may add up to two via `LEARN_RULE` from general knowledge (no web search is available).
- `workHoursAck(profile)`: when work hours are accepted, Maya posts a deterministic confirmation of exactly what was recorded plus a commitment not to exceed it. `_aiProfileContext` re-sends the hours with the same commitment on every message. Enforcement for scheduling remains the engine's work windows (`SET_DEFAULT_WORK_WINDOWS`).
- Tests: R1–R12 in `runAIProfileTests`.

## §38 Overlapping events and recurring-event scope

- **Overlaps**: `evaluateEvLayout(evs)` (pure) assigns each event a column inside its overlapping cluster. The grid draws minute events — and any event that overlaps another — once, from its first hour, side by side (`inset-inline-start`/`width` in %). Events that overlap nothing and have no minutes keep the legacy per-hour label. `gEvents` entries now carry `gid`.
- **Recurring Google events**: `gcalDeleteScoped(g,scope)` (`one` = DELETE the instance; `all` = DELETE the series master `recurringEventId`; `following` = PATCH the master's RRULE with `UNTIL` one second before the instance via `rruleUntilBefore`, or DELETE the master when the instance is the first). `gcalUpdateScoped(g,ev,scope)` (`one` / `all`; `all` changes title and times only, and refuses a date change). The editor asks via `_gcalPick` (tests set `window._gcalPickHook`). Non-recurring events keep the single confirmation.
- Tests: OV1–OV6, RS1–RS11 in `runAccountTests`. Real Google behavior is unverified (the sandbox cannot reach Google).

## §39 "מה מאיה יודעת עליי" — soft, learned preferences

- `AI_SOFT` (persisted `ai:soft`, synced in the cloud blob as `soft`, wiped by reset/delete): `{id, what, pol: avoid|prefer, strength: try|usually|firm, kind: value|boundary|rhythm, exc, src}`. Declared at the top of the script (TDZ rule). Soft context only: it never touches `buildEngine`; hard enforcement remains sacred hours / work windows.
- Wording follows strength (`softPhrase`): "אשתדל לא…" / "בדרך כלל לא…" / firm; values read "חשוב לך: …". Exceptions are recorded (`exc`) and never delete a rule; a firm rule that keeps getting exceptions relaxes to "usually" (`applySoftUpdate`). `firm` is accepted from the model only with a verbatim `quote` of the user's message.
- Model channel: hidden `SOFT_RULE` block (`{add, exception, soften, remove}`), stripped from the visible reply. Prompt item 6ב tells Maya to ASK first ("רוצה שאנסה לא להכניס לך דברים בשישי?"), never use "אסור/חובה", accept one-off exceptions without arguing, and offer to soften when exceptions repeat. `_aiSoftContext` re-sends the rules on every message.
- UI: collapsible card on the Maya screen (`renderKnowCard`): groups "מה חשוב לך" / "גבולות והעדפות" / "איך אתה עובד" (profile items are shown in plain words too). Each soft rule has a strength chip (tap to soften/harden) and "✕ כבר לא נכון"; profile items can be removed (`none`, so she doesn't re-ask) or "שנה" (opens the topic in chat). The user can add their own.
- Tests: SF1–SF13 (`runAIProfileTests`), K1–K9 (`runMayaScreenTests`), SP1–SP4 (`runAccountTests`). Not yet built: learning rules automatically from behaviour (moves/removals) without the model; the model-driven proposals are untested against real Gemini.

## §40 Automatic Google sync and live briefing

- Root cause of "the briefing doesn't update": Google Calendar was imported only when the user pressed sync, and the Maya screen rendered only on tab switch. Now `gcalAutoSync()` runs on open (+3s), on tab focus/visibility, and every 5 minutes while visible, throttled to once per 2 minutes (`gcalAutoSyncDue`), skipped while the login gate is up.
- `gcalSync({auto:true})`: silent (no error UI; token failures return `{ok:false,silent:true}`), reuses a still-valid cached token, and skips the state dispatch when the imported events are identical (`_gcalSig`, declared at the top of the script). Manual sync always refreshes. A silent refresh relies on Google's own session; if Google needs interaction it fails quietly and the manual button remains.
- `recalcAndRender` now re-renders the Maya screen when it is the active tab, so the weekly briefing follows any calendar change. The week card shows "יומן גוגל עודכן לפני …" (`agoHe`) with a "↻ סנכרן עכשיו" button.
- Briefing polish: a leading time in an event title that repeats the displayed time is stripped; events more than 6 days away show the date (22/10) instead of "(בעוד N ימים)".
- Tests: AS1–AS12 in `runAccountTests`. Real Google behaviour is unverified (sandbox cannot reach Google).

## §41 The AI never waits forever

- Cause of a permanent "חושב/ת…": no request had a time limit, so a stalled server or Gemini call left the bubble waiting indefinitely.
- Client: `_cloudFetch` aborts after `timeoutMs` (default 30s; the AI call uses 75s) and returns `{network:true,timeout:true}`; `_aiCallProxy` turns that into "מאיה לא ענתה בזמן…". `sendAIMessage` also wraps the whole model call in `_aiWithTimeout(…, 90s)`, which covers every route (including the in-claude.ai capability).
- Server (`maya-ai`): each Gemini call has `AbortSignal.timeout(28s)` and the whole chain a 60s budget (`TOTAL_BUDGET_MS`); a timeout with no response returns 504 `timeout`.
- Tests: TO1–TO6 (`runAccountTests`) and a static check of the function source.

## 42. צבעי גוגל ומראה יומן

- `GCAL_COLORS` ממפה `colorId` של אירוע בגוגל (1–11) לצבעי הפלטה של Google Calendar; בלי `colorId` נבחר כחול ברירת המחדל (`#039be5`). `gcalColorOf` טהורה.
- `gcalItemsToBlocks` מוסיפה `color` לכל בלוק; `REPLACE_GCAL_EVENTS` שומר את השדה, ו-`buildEngine` מעביר אותו ל-`gEvents`. המנוע לא משתמש בצבע (תצוגה בלבד).
- `gcalTextOn` בוחרת טקסט כהה/לבן לפי בהירות. הצ'יפ מרונדר עם `background` inline בשני מסלולי הרינדור (חופפים + legacy).
- CSS ב-`themeV3`: צ'יפים אטומים עם פינות 6px וצל דק, כותרות ימים בסגנון גוגל.
- מגבלה: מותר רק scope קריאה לאירועים, לכן צבע היומן עצמו (calendar-level) לא נקרא; אירוע ללא `colorId` מקבל כחול ברירת מחדל.
- בדיקה: `gcal colour mapping` ב-`tests/run.js`.

### 42.1 themeV4 — רשת בסגנון גוגל
`<style id="themeV4">` (CSS בלבד, אחרי themeV3): רשת שטוחה עם קווים `#dadce0`, תוויות שעה על הקו (`top:-7px`, מיושרות לסוף), כותרות ימים שקטות, תאי עבר/חסומים `#f8f9fa`, וקו "עכשיו" אדום עם נקודה בעמודת היום בלבד (`tr.tr-now td.td-today.td-now-line` — הסלקטור חייב specificity גבוה מהכלל הישן). תאי "פנוי/לא זמין" הכתומים של האפליקציה נשארו (משמעות פנימית). אין שינוי בלוגיקה.

## 43. מסך מאיה — זרימה רגועה יותר
- שיחה ריקה: ארבעה צ'יפים להתחלה מהירה (`_aiQuick`; 'send' שולח מיד, 'fill' משאיר פתיח להשלמה). נעלמים אחרי ההודעה הראשונה של המשתמש.
- אחרי שהשיחה התחילה, כרטיסי הסקירה מתקפלים מאחורי כפתור (`_aiToggleInsights`) כדי שהצ'אט יקבל מקום; `_aiSyncChatState` קובע את המצב (`has-chat` על `#paneAI`) ונקרא מ-`renderMayaScreen`, `_aiRenderHistory` ו-`sendAIMessage`.
- אינדיקטור הקלדה עם נקודות מונפשות; אחרי 12 שניות מופיע "עוד רגע…".
- שגיאה (שאינה noKey): כפתור "נסה שוב" (`_aiOfferRetry`) שולח שוב את אותה הודעה בלי לשכפל אותה בצ'אט או בהיסטוריה.
- עיצוב תשובות: `_aiFormatInto` תומך רק ב-`**מודגש**` וברשימות "- ", נבנה בצמתי DOM (לא innerHTML) ולכן אין הזרקת HTML.
- תיבת הקלט גדלה עם הטקסט. CSS ב-`themeV5`. בדיקה: `maya screen flow` ב-`tests/run.js`. אין שינוי בפרומפט, בשרת או במנוע.

### 43.1 themeV6 — פריסת צ'אט נקייה
`<style id="themeV6">`, CSS בלבד (+ החלפת ➤ ב-↑ ושינוי placeholder ל"כתוב למאיה…"): תשובות מאיה כטקסט על רקע לבן בלי בועה, הודעות המשתמש כגלולה אפורה בהירה, צ'יפי ההתחלה כרשת 2×2, שדה קלט מעוגל עם כפתור שליחה עגול כהה. בועות עם כפתורים (`.ai-proposal`) נשארו כרטיס קל. אין שינוי בלוגיקה.

## 44. אישור יומן גוגל אחד + תפריט ⋯ במאיה
- **חיבור באישור אחד:** חלון ההסכמה האחד (`_gcalConsentDialog`) מכסה קריאה וגם יצירה/עריכה/מחיקה (תיבת סימון "אפשר למאיה ליצור ולערוך", מסומנת כברירת מחדל). `gcalConnect` שומר `write`+`writeConsent` לפי הבחירה, ולכן בקשת גוגל היחידה כבר עם `calendar.events` — בלי חלון "אפשר כתיבה" נוסף ובלי הסכמה שנייה מול גוגל. כל פעולה בפועל עדיין דורשת אישור מפורש (כרטיס בשיחה/כפתור; מחיקה בחלון אישור).
- משתמשים ותיקים (קריאה בלבד): בפעם הראשונה שפעולת כתיבה נדרשת מופיע חלון `gcalEnableWrite` החד-פעמי, ואז זה נשמר.
- הוסרה השאלה "להציג שמות אירועים?" בלחיצה על בלוק "תפוס"; העריכה נפתחת ישירות וההעדפה לא משתנה.
- טוקן הגישה נשמר גם ב-`sessionStorage` (`maya_gcal_tok`, לפי תוקף) ונטען רק בעליית הדף, כך שרענון באותה לשונית לא מבקש מגוגל שוב; נמחק בניתוק/כיבוי כתיבה.
- **מאיה:** ארבעת צ'יפי ההתחלה הוסרו מהמסך והועברו לתפריט `⋯` ליד תיבת הקלט (`_aiToggleMore`, נסגר בלחיצה בחוץ/Esc).
- בדיקות: GC7b, WR22 (עודכן), WR1 (מתחבר בלי כתיבה), ו-`maya screen flow`.

### 44.1 themeV7 — מסך מאיה רספונסיבי
כותרת עם כדור ושם ("מאיה · המזכירה האישית שלך"), הודעות משתמש בגרדיאנט סגול, `100dvh` + `safe-area` + גופן 16px בקלט (בלי זום ב-iOS), `.ai-log>*{flex:none}` (מונע חפיפת הודעות בגובה קבוע). טלפון: על כל הרוחב, אזורי לחיצה 40px, בלי אפשרויות מיקרופון/רמז מקלדת. מחשב (≥1024px): רשת של שתי עמודות — צ'אט + פאנל צד קבוע עם הסקירה וההעדפות (כפתור הקיפול מוסתר). טאבלט: עמודה אחת עד 720px. CSS בלבד (+ שורת כותרת ב-HTML).

## 45. הקלטה קולית — אבחון ושורת סטטוס
- ההודעות על המיקרופון הופיעו רק ב-`#aiHint` (קטן, ומוסתר בטלפון), ולכן "היא לא שומעת" נראה כשתיקה. נוספה שורת סטטוס בולטת `#aiMicStatus` (`on` = מקשיבה + נקודה אדומה, `err` = שגיאה, נעלמת אחרי 9 שניות).
- לפני `SpeechRecognition` נעשית בקשת `getUserMedia({audio:true})` מפורשת (הזרם נסגר מיד): היא מקפיצה את חלון ההרשאה ומבדילה בין אין הרשאה / אין מיקרופון / מיקרופון תפוס. `_micErrText` ממפה גם שגיאות של זיהוי הדיבור (`no-speech`, `network`, `audio-capture`), ומזהה שהאפליקציה בתוך iframe (מסגרת חוסמת מיקרופון) ומנחה לפתוח בלשונית נפרדת.
- `onaudiostart` / `onspeechstart` מעדכנים "המיקרופון פעיל" / "שומעת אותך…". כפתור ההקלטה הפעילה אדום (התנגשות עם סגנון V6 נפתרה).
- בדיקות: MIC6–MIC8 (ב-`runAccountTests`). הדפדפן עצמו (זיהוי הדיבור) לא נבדק בסביבה — רק עם mocks.

## 46. תיחום עבודה/חיים בלוח + הוספה בזמן קבוע + סנכרון תחום לגוגל
- **תיחום בלוח (`themeV9`):** תאים פנויים לבנים בשני המבטים (כמו גוגל). בתצוגת "חיים", שעות העבודה (`status==='work'` מחלונות העבודה השבועיים) הן אזור ברור `td.zone-work` — רקע טורקיז בהיר, פס צד וכיתוב "💼 עבודה" בתחילת כל חלון — במקום תא אפור שנראה כמו "סגור". בתצוגת "עבודה", מחוץ לשעות העבודה = אפור שטוח `zone-nonwork`. פס עליון בצבע המצב (סגול=חיים, טורקיז=עבודה) וכפתור המצב הפעיל בצבעו.
- **תחום לאירוע:** שדה `domain:'work'` על אירוע (ברירת מחדל = חיים, בלי שדה). בגוגל נשמר ב-`extendedProperties.private.maya_domain` (נכתב ביצירה/עדכון דרך `_gcalBody`, `null` מנקה בעדכון), ו-`gcalItemsToBlocks` קורא אותו; מועבר ל-`gEvents` ומוצג כ-💼 בשם. בעריכת אירוע גוגל יש תיבה "💼 זה זמן עבודה".
- **חלון הוספה:** מתג "משימה לשיבוץ | בזמן קבוע". במצב קבוע: תאריך, שעת התחלה/סיום (קפיצות של 30 דקות), תחום חיים/עבודה, ו"הוסף גם ליומן גוגל" (מופיע כשגוגל מחובר). `_qaGoFixed`: עם גוגל → נוצר רק בגוגל (`gcalCreateEvent`, חוזר דרך סנכרון — בלי כפילות); בלי גוגל → `ADD_GLOBAL_EVENT` מקומי עם `startMin/endMin`. לחיצה על תא ריק בלוח פותחת את החלון במצב קבוע עם התאריך והשעה של התא.
- בדיקות: `work/life + fixed-time add`, `fixed-time add -> Google` ב-`tests/run.js`. הנחה שלא נבדקה מול גוגל אמיתית: ש-`extendedProperties.private` מתקבל ב-POST/PATCH (תואם לתיעוד).

## 47. ניקוי כותרת היומן
- הוסר הבאנר "הלוח הזה עדיין ריק" (`#emptyCalendarHint`) — הוא הופיע כל עוד אין משימות, גם כשהיומן מלא באירועי גוגל. במקומו `#gcalSyncHint`: שורה "יומן גוגל עוד לא מסונכרן" + כפתור "סנכרן עם יומן גוגל", שמוצגת רק כשגוגל זמין ועדיין לא מחובר/מסונכרן (`_gcalHintSync`, מתעדכנת אחרי סנכרון/ניתוק/רינדור). הכפתור מחבר (חלון האישור האחד) או מסנכרן, לפי המצב (`gcalHintGo`).
- הוסר "שבוע X/Y" מהכותרת ומשורת `navRange`; נשארים רק טווח התאריכים. בדיקה: `header + gcal sync hint`.

## 48. מאגר "לא לשכוח" — משימות קטנות עם ציון פנימי
- **מקום אחד:** סקשן "🧷 לא לשכוח" בראש מסך המשימות (הוספה בהקלדה, ✓ בוצע, ★ חשוב, ✕ הסר לארכיון, ארכיון עם "החזר"). הנתונים ב-`microTasks.tasks`; שדות חדשים: `createdAt, important, due, lastAskedAt, lastKeptAt, snoozedUntil, deferrals, archived, doneAt`. משימות ישנות מקבלות `createdAt` פעם אחת (`smallEnsureMeta`, ב-`renderMayaScreen`).
- **ציון פנימי (0–100, לא מוצג):** `smallScore` — בסיס 20; חשוב +40 (סימון ★ או מילה כמו "חשוב/דחוף" בטקסט); תאריך יעד קרוב עד +35; "השבוע" +15; כספים/בירוקרטיה ונושאי בריאות/משפחה/תשלומים +8; כל דחייה −6 (עד −18). הגורמים אינם נחשפים למשתמש.
- **התנהגות:** `smallReminders` (ציון ≥55, עד 3) → כרטיס "כדאי לא לשכוח" במסך מאיה עם "מתי?" (פותח שיחה לשיבוץ) ו-✓. `smallCheckIn` → כרטיס "עדיין רלוונטי?" אחד ליום, עד 3 משימות פתוחות ≥10 ימים, לא חשובות, שלא נשאלו ב-7 הימים האחרונים; תשובות: להשאיר / לדחות (שבוע) / להוריד (ארכיון, לא מחיקה) / כבר עשיתי; "לא עכשיו" מבטל את הכרטיס עד מחר (`maya_small_batch`). לא נשאלות משימות חשובות.
- **שיחה:** בלוק מוסתר חדש `SMALL_ADD` (`_aiExtractSmallAdd`, עד 6, ללא כפילויות) מוסיף למאגר דברים קטנים שהוזכרו; הפרומפט מבדיל בין אירוע בזמן קבוע (CAL_CREATE) למשימה קטנה, ומשימות קטנות מופיעות בהקשר של מאיה (כולל "מסומנת כחשובה").
- **החלטה מודעת:** אין ארכוב אוטומטי — מאיה רק מציעה. בדיקה: `small-task pool` ב-`tests/run.js`. לא נבדק מול Gemini אמיתי (האם המודל באמת פולט `SMALL_ADD`).
