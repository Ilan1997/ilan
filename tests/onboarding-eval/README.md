# onboarding-eval

תשובה חופשית → **חילוץ של Gemini** (`mode:"onboarding"`, אותה סכמה כמו בפרודקשן) → השוואה לעובדות הצפויות. 40 תשובות ב־`cases.json`: מסודרת, brain dump, "לא יודע", סתירה, כמה נושאים בבת אחת, שינוי דעה, זמן עמום, workload חוזר, maintenance של עבודה וחיים, דבר שכבר ביומן, follow-ups, שפה מעורבת, פטפוט.

```
node tests/onboarding-eval/run.js --dry                                   # prompt לדוגמה + גודל הסכמה
node tests/onboarding-eval/run.js --mock-expected                         # בדיקת הכלי: השמעת הציפיות חוזרת צריכה לתת 40/40
node tests/onboarding-eval/selftest.js                                    # ה־comparator חייב לסמן 19 כשלים מוכרים
node tests/onboarding-eval/run.js --function --jwt <JWT> --out r.json --md report.md   # Gemini אמיתי דרך maya-ai (אחרי פריסה!)
node tests/onboarding-eval/run.js --gemini --out r.json --md report.md                 # Gemini ישירות (GEMINI_API_KEY)
node tests/onboarding-eval/e2e.js yuval --function --jwt <JWT>            # שיחה מלאה אמיתית → state אחרי אישור
```

**חומרה.** critical = עובדה *consequential* שהומצאה או שגויה (שעה, יום, שעות עבודה, סכום שעות, deadline, שעת גבול, זמן נסיעה); major = עובדה שהוחמצה/הומצאה, תחום שגוי, חומרה שגויה (protected/maybe), MVW שהוחמץ, "לא יודע" שלא נקלט, follow-up מיותר/חסר; minor = פרט/כיסוי.
**Gate:** כל critical → תיקון prompt/schema/normalizer. אין מעבר ל־UI.
