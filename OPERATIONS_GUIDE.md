# TalentAI Operations Guide

## Monitoring
- Access the Observability Dashboard at `/admin` on the frontend (must be logged in as a Recruiter with admin privileges, or passing `X-Admin-Key`).
- Check metrics for Gemini usage, API latencies, and error rates.

## Logs
To view backend logs:
```bash
docker logs talentai-backend -f
```

## Scaling
- Backend scaling: Adjust the `--workers` flag in the Dockerfile, or increase container replicas in a swarm/Kubernetes environment.
- DB scaling: Ensure MongoDB has sufficient RAM to hold the working set, and create indexes as recommended by the slow query logs.
