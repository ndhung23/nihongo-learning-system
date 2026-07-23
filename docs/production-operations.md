# Production operations

This application is designed to keep learning data for at least three years. Do not add TTL indexes to users, payments, course progress, vocabulary, JLPT attempts, feedback, or content collections.

## Capacity target

- Run the Next.js standalone server behind a CDN/reverse proxy with compression and HTTP/2 or HTTP/3.
- Start with two application instances (1–2 vCPU and 1–2 GB RAM each), then autoscale on p95 latency above 500 ms or CPU above 70%.
- Set `MONGODB_MAX_POOL_SIZE=40` and `MONGODB_MIN_POOL_SIZE=5` per application instance. Keep total pool capacity below the connection limit of the MongoDB plan.
- Use a managed MongoDB replica set in the same region as the application. Enable connection metrics and slow-query profiling.
- Serve `/_next/static/*` and public media through a CDN. Keep large audio, image, PDF, and backup files in object storage rather than MongoDB.
- The application includes a per-instance safety rate limit. For multiple instances, enforce the same limits at the CDN/reverse proxy or replace it with a shared Redis-backed limiter.

## Three-year retention and recovery

- Enable continuous point-in-time recovery when the MongoDB plan supports it.
- Take daily database snapshots and retain them for 35 days.
- Export one encrypted snapshot each month to versioned object storage and retain monthly snapshots for 36 months.
- Enable object-lock/immutability on backup storage so application credentials cannot delete backups.
- Test a restore into a separate database every quarter. A backup is not considered valid until a restore has succeeded.
- Keep payment and audit records for at least 36 months. Redact or delete personal data only through an explicit administrator workflow.

## Monitoring and alerts

- Track p50, p95 and p99 response time, error rate, process memory, CPU, MongoDB connections, query latency and cache hit ratio.
- Alert when p95 exceeds 1 second for five minutes, 5xx exceeds 1%, MongoDB connections exceed 80%, or free storage drops below 20%.
- Run uptime checks against `/api/db/health` and the public `/flashcards` page from at least two regions.

## Release checklist

1. Run `npm run build`.
2. Apply model indexes with the database initialization/admin process.
3. Deploy at least two instances with rolling replacement.
4. Warm `/flashcards`, `/api/courses?sort=newest&limit=24`, and the most-used JLPT routes.
5. Verify cache headers, database health and one authenticated learning flow.
