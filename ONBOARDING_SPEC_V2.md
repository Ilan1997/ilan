# ONBOARDING_SPEC_V2 — שאלון הפתיחה של מאיה (קנוני)

מקור יחיד ללוגיקה ולבדיקות. נגזר מחלק ה־v2 של מסמך "שאלון הפתיחה של מאיה" + שלושת הדיוקים של 2026-11-18.
v1 אינו מקור לקוד: שלוש שיחות v1 נשמרות רק כארכיון (`tests/fixtures/onboarding/archive_v1.md`, אם נוסף) ואינן נבדקות.

היקף שלב 1: **Conversation state → extraction → OnboardingProfile → InitialWeeklyTemplate → confirmation.** בלי UI, בלי כתיבה ליומן, בלי שינוי במנוע התכנון.

## 1. עיקרון

מאיה מניחה פרטים קטנים כדי לא לחפור, ולא ממציאה פרט שמשנה את מבנה השבוע.
המודל מפרש תשובות למבנה (JSON); **הקוד** מחשב שעות, מחליט מה נשאל, ומנסח כל משפט שמאיה אומרת על התכנית.

## 2. סיווג ידיעה

| סוג | דוגמאות | טיפול |
| --- | --- | --- |
| **Assumption, risk=low** | 45 דק׳ לאימון, 60 דק׳ לתשלומים, 30 דק׳ למיילים, מרווח לבלת״מים | מניחה, מציגה כהנחה, נבדקת אחרי שבוע–שבועיים |
| **Assumption, risk=consequential** | שעת התחלה של טיפול, שעות עבודה, שעה מדויקת של פגישה קשיחה, זמן נסיעה, מה זה "ערב", כמה שעות דרוש ליעד | **לעולם לא נהיה constraint.** הופך ל־`Unknown` |
| **Proposal** | "אני מציעה ספורט פעמיים בשבוע" (תדירות או חלון שמאיה בוחרת) | הצעה של מאיה, לא הנחה על המציאות. דורשת אישור. **לא נהיית Routine לפני אישור** |
| **User fact / Routine** | "אני רץ 3 פעמים" | עובדה של המשתמש, Routine מיידי |

`Assumption {id, field, ref, value, source:"system_trial_default"|"user_default"|"learned", assumed:true, risk:"low"|"consequential", status:"shown"|"confirmed"|"unresolved"}`

`Unknown {field, ref, why, planningImpact:"blocking"|"nonblocking", handling:"asked"|"held"|"tentative_proposal", recheckAt:"weekly_review"|null}`

`Proposal {id, ref, value, reason, status:"pending"|"accepted"|"rejected"}` — נפרד מ־Assumption.

חוקים:
1. "לא יודע" / "אין לי מושג" / "לא משנה" → `Unknown`; השאלה לא חוזרת; אין המצאת constraint מרכזי (שעות עבודה, "ערב", מה מצטבר, minimumViableWeek).
2. unknown חוסם (blocking) → follow-up (ראו §4). לא חוסם → נשאר unknown ונבדק ב־review השבועי.
3. אם מאיה נמנעת משיבוץ בגלל חוסר ידיעה (למשל לא אחרי 17:00 עד שנגדיר "ערב"), היא אומרת זאת: `guard` — זהירות שלה, לא כלל של המשתמש.

## 3. מודל הנתונים

```
TimeFact { value, precision:"exact"|"approx"|"unknown", source:"calendar"|"user"|"user_estimate" }

AvailabilityRule { rule, source:"user_setting"|"user_said"|"calendar"|"system_default" }
// רק user_setting / user_said / calendar מחייבים. system_default לעולם לא חוסם שישי/שבת.
// מאיה לא מוסיפה חסימת שבת/שישי גלובלית. חסימה קיימת רק אם נאמרה או שכבר בהגדרות המשתמש.

Hold { from, to, reason, derivedFrom:"user_time_window"|"calendar_fact"|"known_travel_requirement"|"semantic_window", confidence }
// נוצר רק ממידע שהמשתמש נתן או חלון סמנטי מוצהר. אין בסיס → אין hold; היום מסומן "לא ניתן לתכנון מלא".

FixedConstraint { id, title, days[], start:TimeFact, end:TimeFact, travelBefore?:TimeFact, rigidity:"hard", origin:"calendar"|"user_said", needsApproval:false }
Boundary { rule, source:"user_said", definition:"known"|"undefined" }

Routine { id, title, domain:"work"|"life", kind, maintenanceClass:"workMaintenance"|"lifeMaintenance"|null,
          targetFrequency, targetDuration:{minutes, assumption?}, rigidity, importance, inMinimumViableWeek, confidence, source }

WorkloadGoal { id, title, kind, requiredTotalMinutes:number|null, requiredPerWeekMinutes?:number|null, deadline?:date|null,
               trialAllocationMinutes?:number|null, fillsRoutineId?:string|null, minSession, maxSession?, rigidity, importance, source }
// requiredTotalMinutes רק אם נאמר. trialAllocationMinutes = ניסוי של מאיה, אף פעם לא דרישה.
// fillsRoutineId: דקות היעד נספרות קודם בתוך בלוקי השגרה. newBlockMinutes = max(0, required − capacityOfRoutineBlocks). אין ספירה כפולה.

OnboardingProfile { successCriteria[], minimumViableWeek[]|unknown, fixedConstraints[], workMaintenance[]|unknown, lifeMaintenance[]|unknown,
                    protectedLife[], workloadGoals[], chaosTriggers[], boundaries[], availability[], proposals[], assumptions[], unknowns[], holds[], guards[] }

TemplateItem { origin:"calendar"|"proposal"|"hold", status:"existing"|"proposed"|"tentative" }
// אישור נדרש רק ל־proposed ול־tentative. existing (יומן) לא עובר אישור. hold מוצג ולא מבקש אישור.
```

### חלונות סמנטיים מוצהרים (semantic windows)
בוקר 06:00–12:00 · צהריים 12:00–15:00 · אחה״צ 13:00–18:00. **"ערב" לא מוגדר** (עד שהמשתמש יגדיר). חלון שאינו ברשימה → אין hold.

### ברירות מחדל לניסוי (Assumption, source=system_trial_default, risk=low)
תשלומים/חשבוניות 60 (שבועי) · סידורים/קניות 45–60 (שבועי) · מיילים 30 (יומי) · ריצה/אימון 45 · משוב 30 · לידים 45 · סגירת שבוע 30 (שבועי) · בלת״מים ≈10% משעות העבודה (או מרווח 15 דק׳ אחרי ישיבות). משך לא נשאל לעולם.

## 4. מכונת שיחה

- שאלה אחת בכל הודעה; **עד 7 שאלות ראשיות**, בסדר קבוע:
  1. שבוע מוצלח + minimumViableWeek (תת־שאלה: "ומה מתוך זה חשוב במיוחד שלא יאבד גם בשבוע עמוס?")
  2. קבוע וקשיח (עם יומן: "קראתי ביומן: …. חסר משהו שלא רשום שם?")
  3. "מה בעבודה או בחיים נוטה להצטבר אם לא קובעים לזה זמן?" → workMaintenance / lifeMaintenance
  4. חיים מוגנים
  5. יעדי שעות
  6. מה מפרק שבוע
  7. גבולות
- תשובה אחת יכולה לכסות נושאים. נושא שנענה כבר, או שהיומן ענה עליו → מדולג (לא נספר ב־7). שאלה 2 עם יומן מקוצרת.
- **follow-up**: ברירת מחדל 1. שניים רק אם שני ה־unknowns חוסמים. "לא יודע" לעולם לא מייצר follow-up חוזר על אותו שדה. follow-ups נספרים בנפרד.
- אם היומן מחובר — נקרא בתחילת השיחה (`calendar` events כ־FixedConstraint origin=calendar) ומאיה אומרת מה ראתה. שאלה 2 אז מקוצרת: "חוץ ממה שכבר ביומן — חסר משהו קבוע שלא רשום שם?".
- "לא יודע" על שדה חוסם → unknown (handling=held אם ניתן לגזור hold; אחרת `tentative_proposal`/nothing); לא follow-up שני על אותו שדה.

## 5. Hold
`makeHold` מחזיר `null` בלי `derivedFrom` תקף. דוגמה תקפה: "חמישי אחה״צ" → semantic_window אחה״צ → 13:00–18:00. דוגמה לא תקפה: "הטיפול ב׳ — לא יודע מתי מתחיל" → אין hold; היום "לא ניתן לתכנון מלא אחרי המידע הידוע" (בנועם: אם start unknown, ב׳ אחה״צ מסומן partial, לא נחסם 14:00–17:00).

## 6. תבנית שבועית ראשונית (InitialWeeklyTemplate)
- מושתת על היומן (existing), constraints שנאמרו (proposed), שגרות/מוגנים/יעדים (proposed), ניסויים (tentative), holds (tentative, מוצגים).
- שיבוץ בזמן פנוי בלבד: קבועים → מוגנים → תחזוקה → יעדים → ניסויים → סגירת שבוע. כבוד ל־Boundary ול־guards.
- יעד עם `fillsRoutineId`: הבלוקים הם בלוקי השגרה (לא נוספים מעליה). `newBlockMinutes=max(0, required − capacity)`.
- יעד עם requiredTotalMinutes=null: רק trialAllocation (tentative) + unknown.
- השבוע הקרוב = ראשון הבא אחרי today. התבנית נשמרת קבועה; ליומן נכתב רק השבוע הקרוב, ומתוכנן מחדש בסגירת כל שבוע.
- ההצעות של מאיה (Proposal) לא הופכות Routine לפני אישור.

## 7. אישור
- מאיה מציגה קודם "קיים ביומן, בלי אישור", אחר כך "הצעות לאישור", אחר כך "ניסויים", ובסוף holds/guards/unknowns.
- אפשר לאשר הכול או חלק. `onbApprove(profile, template, ids)` מחזיר רק proposed/tentative שנבחרו; proposals שאושרו → Routine; שנדחו → rejected; **שום דבר לא נכתב ליומן בשלב זה** (הפונקציה מחזירה פריטים, לא מבצעת כתיבה).
- אירוע `existing` אינו ניתן לאישור/דחייה (אין מה לאשר).

## 8. החלטות מימוש (שלב 1)
- המודל מחלץ בלבד (`ONB_EXTRACT_SCHEMA` → `onbNormalizeExtraction`, שדות שלא נאמרו נשמטים; תשובה לא תקינה → ניסיון תיקון אחד → חילוץ ריק, לעולם לא זורק). שאלות, follow-ups, הנחות, הצעות, מיקום וכל טקסט — קוד.
- gaps חוסמים: יום לא ידוע (קודם), התחלה/סיום חסרים בפגישה קשיחה שאין ממה לגזור hold, זמן נסיעה לא ידוע. סדר: יום → שעה → נסיעה. שדה נשאל פעם אחת בלבד.
- "סגירת שבוע" היא Proposal (`pr_review`); בקבלה היא עוברת materialization והופכת ל־Routine עם `source:"maya_proposal"`, בהתאם ל־Lifecycle שבסעיף 9. Proposal שהמשתמש אמר עליו "אולי" (ספורט) נשאר pending עד אישור.
- Routine בלי תדירות ("ערבים עם המשפחה") נשמר כמוגן ולא משובץ; לא נרשמת עליו הנחת משך.
- יעד שיש לו רק deadline בלי כמות: `trialAllocationMinutes=150` לשבוע (Proposal tentative) + Unknown. יעד עם `requiredTotalMinutes` ו־deadline רחוק מחולק לפי שבועות שנותרו.
- ימי א׳–ה׳ מועדפים בשיבוץ; שישי/שבת **לא** חסומים אלא אם יש `AvailabilityRule` מחייב (`user_setting` / `user_said` / `calendar`). `onbAvailabilityFromSnap` ממיר סגירות שכבר בהגדרות (freeHours) ל־`user_setting`, ולא נשען על ברירות המחדל של `ctxFreeIntervals`.
- חיבור ל־Gemini (פונקציית edge ל־extraction) **לא** חובר בשלב זה; `onbExtractWith` מקבל `callModel` מוזרק.

## 9. עדכון 2026-11-18 (אחרי סבב ראשון)
- **Lifecycle:** `Proposal(pending) → accepted → materialize() → Routine | Boundary | WorkloadGoal.trialAllocation`, `source:"maya_proposal"`. הצעה שנדחתה יוצאת מהפרופיל הפעיל (נשארת רק ב־`decisions`). "סגירת שבוע" מאושרת → Routine. provenance: `user_said | calendar | maya_proposal | learned`.
- **7 תחומי כיסוי, לא 7 תחנות:** `onbCovered(facts)` נגזר בקוד (לא רק מ־`answeredTopics` של המודל). נשאלים רק תחומים שלא כוסו. תשובה ראשונה שמכסה הכול → שיחה של שאלה אחת. הנוסח "מוגנים בקיצור" של שאלה 4 בוטל (אם כבר ידוע מה מוגן — לא שואלים).
- **MessageIntent:** כל משפט של מאיה נבנה כ־`{type,data}` (`ask_topic`, `ask_missing_constraint`, `present_template`, `show_existing`, `propose_items`, `propose_trial_items`, `state_*`, `ask_approval`) ו־`onbRender` דטרמיניסטי הוא V1. renderer עתידי רשאי רק לנסח מחדש, לא להוסיף עובדות/החלטות.
- **שיבוץ:** ההיוריסטיקה "היום הכי פנוי" היא fallback זמני (`template.placement==="fallback_greedy"`, TODO מפורש בקוד) — היעד הוא `scheduleSet / buildContextSnapshot / validatePlan`.
- **חילוץ אמיתי:** `mode:"onboarding"` ב־`maya-ai`; הערכה ב־`tests/onboarding-eval` (38 תשובות).

## 10. קבלה (acceptance)
שלושה פרופילים (נועם מסודר, יובל מבולגן, דני לא יודע) + בדיקות שליליות:
1. consequential unknown לא נהיה constraint.
2. proposal לא נהיה routine לפני אישור.
3. hold לא נוצר בלי מקור.
4. calendar event לא דורש אישור.
5. עומס שבועי לא נספר פעמיים כשיעד ממלא routine.
6. "לא יודע" לא ממציא שעות עבודה.


## Update 2026-11-18.8
- MaintenanceNeed (user_said) vs RoutineProposal (maya_proposal); Routine only after approval.
- workHours unknown = blocking; one short follow-up; if unknown, `templateStatus:'partially_placed'` with unscheduled time budgets, no invented availability.
- dayStart ("קם מאוחר") is a Proposal; becomes preference only on approval.


## Update 2026-11-22
- תדירות של Routine חייבת להיות grounded **לכל פריט בנפרד**. תדירות שנאמרה על ריצה לא יכולה לזלוג למיילים/תחזוקה אחרת באותה תשובה. `frequencyEvidence` הוא ציטוט קצר מהמשתמש; הקוד מאמת שהוא באמת מופיע בתשובה, עם fallback מקומי סמוך לשם/סוג הפריט.
