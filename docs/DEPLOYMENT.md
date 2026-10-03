# Traveloop deployment runbook

This runbook deploys the existing FastAPI and Vite application without adding
runtime infrastructure. Use a staging environment and disposable PostgreSQL
database before production.

## Topology

Use any provider that supports:

- a Python web service running FastAPI;
- a static Vite site with SPA fallback rewrites;
- managed PostgreSQL;
- persistent disk mounted at `UPLOAD_DIR`, or an object-storage integration
  implemented separately.

The frontend calls the backend directly through `VITE_API_BASE_URL`. The
backend never receives the frontend bundle through an API fallback.

## Backend release

From `backend`, install the locked runtime dependencies and apply migrations
as a release step before starting the web service:

```text
python -m pip install -r requirements.txt
alembic upgrade head
uvicorn main:app --host 0.0.0.0 --port $PORT
```

The service health check is `GET /api/health`. A successful response includes
`"status": "ok"` and `"database": "connected"`.

The database layer accepts both `postgres://` and `postgresql://` provider
URLs and uses the psycopg 3 driver. PostgreSQL connections use pre-ping and a
30-minute recycle interval to handle managed-database connection expiry.

## Backend environment names

Configure these names in the host's secret/environment facility. Never commit
their values:

```text
APP_ENV=production
DATABASE_URL=<staging-or-production-postgresql-url>
SECRET_KEY=<at-least-32-character-random-secret>
ACCESS_TOKEN_EXPIRE_MINUTES=30
CORS_ORIGINS=<exact-https-frontend-origin>
UPLOAD_DIR=<persistent-mounted-upload-directory>
MAX_UPLOAD_SIZE=5242880
PLACES_PROVIDER=
PLACES_API_KEY=
```

`PLACES_PROVIDER` and `PLACES_API_KEY` may remain unset. The application must
then use its tested manual-entry/provider-unavailable behavior.

`CORS_ORIGINS` must contain only the deployed frontend origin(s). Do not use
`*` with credentials. `UPLOAD_DIR` must be on persistent storage; the current
local filesystem upload design is not durable on an ephemeral web-service
filesystem.

## Frontend release

From `frontend`:

```text
npm ci
npm run build
```

Set `VITE_API_BASE_URL` to the HTTPS backend origin before building. Configure
the static host to serve `frontend/dist` and rewrite non-file routes to
`index.html`, including `/dashboard`, `/community`, `/profile`, and trip
routes. Do not rewrite `/api` requests to the frontend.

## PostgreSQL staging validation

Use a disposable staging database and do not print the URL or credentials:

```text
alembic upgrade head
alembic current
alembic check
```

Run the backend smoke flow against that database: register/login, create a
trip, set INR and `Asia/Tokyo`, create an activity, create/read `0.10` and
`0.20` expenses, exercise packing and notes, publish, clone, and delete the
test records. Verify the canonical tables, foreign keys, unique constraints,
numeric expense columns, timezone fields, and trip version column.

## Security and operations

The backend emits CSP, `X-Content-Type-Options`, `X-Frame-Options`,
`Referrer-Policy`, and `Permissions-Policy`. Verify the deployed response
retains them and that the frontend/backend are both HTTPS with no mixed
content.

Use the provider's deployment logs and basic HTTP health monitoring. Logs
must not include authorization headers, JWTs, passwords, secret values,
database URLs, provider keys, private notes, or uploaded contents.

Enable managed PostgreSQL automated backups before production. Record the
provider's retention and restore procedure, and retain a manual SQL export
procedure. For a release rollback, roll back application code independently;
restore the database from backup for destructive schema changes rather than
blindly downgrading live data.

## Go/no-go evidence

Do not declare production readiness until staging proves migrations, health,
HTTPS, CORS, authentication, User A workflow, User B privacy/IDOR denial,
upload persistence, SPA deep links, mobile core flow, offline behavior, and
safe error responses. Geoapify is optional when manual entry remains
available.
