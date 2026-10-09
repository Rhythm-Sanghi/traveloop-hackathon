# Traveloop

A hackathon app for planning trip stops and tracking planned costs and actual
expenses. The frontend uses React and Vite; the backend uses FastAPI,
SQLAlchemy and SQLite.

## Features

- Create trips and organize day-by-day stops and activities.
- Compare planned costs with actual expenses by category and currency.
- Share itineraries, export calendar entries, and keep trip notes.
- Manage profiles and image uploads with JWT-based authentication.
- View the last saved trip snapshot in read-only offline Travel Mode.

The trip-creation page offers static example ideas. Optional place discovery
uses the configured provider; it is separate from those examples.

## Architecture

React Router handles navigation, Tailwind supplies styling, and Recharts
renders the budget charts. FastAPI exposes the API with Pydantic validation;
SQLAlchemy models and Alembic migrations manage storage. See
[architecture](docs/architecture.md) and [deployment](docs/DEPLOYMENT.md).

## Installation and Setup

### Prerequisites

* Node.js 22.19+ or 24
* Python 3.10 or higher

### Backend Setup

1. Navigate to the backend directory: `cd backend`
2. Create a virtual environment: `python -m venv venv`
3. Activate the environment:
   * Windows: `venv\Scripts\activate`
   * macOS/Linux: `source venv/bin/activate`
4. Install dependencies: `pip install -r requirements.txt`
5. Copy `backend/.env.example` to `.env` and configure a strong `SECRET_KEY` for deployed environments.
6. Apply database migrations: `alembic upgrade head`
7. Start the server: `uvicorn main:app --reload`

### Frontend Setup

1. Navigate to the frontend directory: `cd frontend`
2. Install dependencies: `npm ci`
3. Copy `frontend/.env.example` to `.env` and update `VITE_API_BASE_URL` for your backend host.
4. Start the development server: `npm run dev`

### Environment Configuration

- `VITE_API_BASE_URL` tells the frontend where the FastAPI backend is hosted.
- `CORS_ORIGINS` lets the backend accept a comma-separated list of frontend origins for local or deployed environments.
- `DATABASE_URL` selects SQLite or a production SQLAlchemy-compatible database.
- `UPLOAD_DIR` and `MAX_UPLOAD_SIZE` configure server-side image storage and upload limits.
- Uploaded images are content-validated and stored under generated safe names, but EXIF/GPS
  metadata is not stripped; callers should remove sensitive metadata before uploading public
  images.
- `PLACES_PROVIDER` and `PLACES_API_KEY` optionally enable server-side Geoapify place discovery. If
  unset or unavailable, the API returns an explicit unavailable response and manual activity entry
  remains available; no fabricated search results are returned.
- Trips store a three-letter base currency (default `USD`); actual expenses retain their own
  currency code and budget displays use locale-aware formatting.
- Authenticated trip owners can export itinerary stops as an `.ics` calendar from the budget page.
- Itinerary activities are canonical `Activity` rows linked to `TripStop`. Migration
  `20261003_canonical_activities` imports legacy JSON activity arrays and
  `20261003_backfill_legacy_activities` maps legacy relational activities where their stop can
  be identified. Current writes use canonical rows. Destination-local scheduling accepts IANA
  identifiers such as `Asia/Tokyo`.
- Trip detail and budget pages retain the last authenticated snapshot in browser storage for
  read-only Travel Mode. Offline snapshots are explicitly labeled and never used for editing,
  publishing, or other mutating actions.
- CI is defined in `.github/workflows/ci.yml` for backend compilation/tests/migrations and
  frontend lint/component tests/build, plus a browser job that installs Chromium and runs the
  Playwright smoke/accessibility suite at desktop and mobile widths. Live PostgreSQL/provider
  validation remain external checks.

### Validation commands

From `backend`, run `python -m pytest -q tests` for the backend regression suite. From
`frontend`, run `npm test` for the Vitest/jsdom behavior suite, `npm run lint`, and `npm run
build`. Authentication, registration, place search, uploads, and password changes have bounded
per-client rate limits; community feeds and comments accept bounded `page` and `page_size`
parameters (while preserving the existing array response shape).
Run `npm run test:e2e` from `frontend` after `npx playwright install chromium` to execute the
browser suite locally. The current browser suite intentionally covers the authentication entry
point, serious axe violations, and mobile horizontal overflow; deeper authenticated multi-user
flows still require a seeded test environment.

### Database migrations

Schema changes are managed with Alembic rather than application startup schema surgery. Run
`alembic upgrade head` from `backend` for a new database. Existing databases created before
migrations can be preserved by stamping the matching baseline revision once, then upgrading:

```powershell
alembic stamp f9012e3d1227
alembic upgrade head
```

The current head includes canonical activities, destination timezone support, and the normalized
decimal `expenses` table. Planned activity costs remain separate from actual expense records.
