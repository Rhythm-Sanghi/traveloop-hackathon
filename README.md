# Traveloop: Context-Aware Itinerary and Budget Intelligence

Traveloop is a full-stack travel management platform designed to bridge the gap between creative itinerary planning and disciplined financial tracking. Built during a high-stakes hackathon environment, it provides a seamless experience for users to build, manage, and audit their travel plans within a unified, high-performance interface.

## Problem Statement

Most travel tools are fragmented; users often plan itineraries in one app while tracking expenses in a spreadsheet. This leads to data silos and a lack of real-time visibility into how schedule changes impact the total trip cost. Traveloop solves this by creating a single source of truth where every itinerary stop is a data point in a broader financial model.

## Core Functionalities

### Unified Dashboard

A centralized hub where users can manage multiple travel projects. Each trip is represented with high-fidelity visual cards and quick-action navigation to specialized planning modules.

### Itinerary Builder

A custom-built interface for day-by-day scheduling. It supports dynamic activity entry, location tagging, and real-time state persistence to ensure no data is lost during the planning process.

### Budget Breakdown and Analytics

A dedicated financial module that aggregates cost data from the itinerary. Using a responsive data visualization engine, it categorizes spending (Food, Transport, Lodging, etc.) and provides a real-time "Remaining vs. Spent" analysis against the user-defined trip limit.

### Profile and Authentication

A secure user management system using JWT-based authentication. Users can manage their personal profiles, including image uploads and account settings, ensuring their travel data remains private and personalized.

## Technical Architecture

### Frontend

* **React and Vite** : Utilized for an optimized development workflow and fast Hot Module Replacement.
* **Tailwind CSS v4** : Implemented for a custom "Traveloop Dark" design system, utilizing a utility-first approach for responsive and performant styling.
* **Recharts** : Integrated for the budget visualization layer to provide clear, interactive data insights.
* **Lucide React** : Used for consistent, scalable iconography across the interface.

### Backend

* **FastAPI (Python)** : Selected for its high performance, asynchronous capabilities, and automatic documentation generation.
* **SQLAlchemy ORM** : Used for robust database abstraction and relationship management.
* **SQLite** : Employed as a lightweight, reliable relational database for portable data storage.
* **Pydantic** : Utilized for strict data validation and type safety between the frontend and backend.

## Installation and Setup

### Prerequisites

* Node.js (v18 or higher)
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
2. Install dependencies: `npm install`
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
