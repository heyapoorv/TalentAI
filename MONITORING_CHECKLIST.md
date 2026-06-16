# TalentAI Monitoring Checklist

## Daily Checks
- [ ] Review the Observability Dashboard.
- [ ] Check `p95_latency_ms` to ensure it is below 1500ms.
- [ ] Check `error_rate` to ensure it is below 1%.
- [ ] Check Gemini Spend to ensure it aligns with the budget.
- [ ] Check Active Users and ensure matching processes are completing successfully.

## Weekly Checks
- [ ] Review slow query logs in MongoDB and add necessary indexes.
- [ ] Review ChromaDB memory usage.
- [ ] Check available disk space on the database volumes.

## Monthly Checks
- [ ] Perform a test restore from backup.
- [ ] Update frontend and backend dependencies for security patches.
