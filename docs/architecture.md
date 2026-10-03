# Traveloop architecture

## Core data model

```text
User -> Trip -> TripStop -> Activity
              |       |-> Note
              |       |-> Expense
              |       `-> PackingItem
              `-> Community publication
```

`TripStop` is the canonical itinerary stop. `Activity.trip_stop_id` and
`Activity.position` are the canonical activity representation. The migration
`20261003_canonical_activities` deterministically copies legacy JSON activities
into rows and current writes no longer mutate the JSON field.

## Money and time

Planned activity costs and recorded `Expense` rows are separate. Expenses use
`NUMERIC(12, 2)` and retain their currency code. Trips have a base currency.
Activities belong to destination-local time. Stops and activities accept IANA
timezone identifiers such as `Asia/Tokyo`; missing values remain explicitly
unknown rather than being guessed.

## Boundaries

- Authentication remains a signed-token boundary backed by the existing user
  store; production requires a configured strong secret.
- Places discovery is an optional server-side provider boundary. Missing
  credentials produce an explicit unavailable response and never fabricated data.
- Private itinerary and budget snapshots are browser-controlled Travel Mode
  data. Keys include the authenticated user identity and trip ID; logout removes
  private snapshots.
- Public community and trip serializers intentionally expose only public data.

## Migration strategy

Alembic owns schema evolution. Existing pre-Alembic databases are stamped at
the baseline and upgraded. The canonical activity migration fails explicitly
on malformed legacy content rather than silently dropping records.

## Operational limitations

Live Geoapify and PostgreSQL deployment testing require external credentials or
infrastructure. The repository validates the provider boundary and SQLite
migration path without requiring either.
