"""backfill legacy activity rows into canonical stops

Revision ID: 20261003_backfill_legacy_activities
Revises: 20261003_stop_timezone
"""
from alembic import op
import sqlalchemy as sa

revision = "20261003_backfill_legacy_activities"
down_revision = "20261003_stop_timezone"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    rows = bind.execute(sa.text("""
        SELECT a.id, a.name, a.cost, a.category, s.trip_id, s.city_name,
               s.arrival_date, s.departure_date
        FROM activities a
        JOIN stops s ON s.id = a.stop_id
        WHERE a.trip_stop_id IS NULL
        ORDER BY a.id
    """)).mappings().all()
    for row in rows:
        canonical_stop = bind.execute(sa.text("""
            SELECT id
            FROM trip_stops
            WHERE trip_id = :trip_id
              AND city_name = :city_name
              AND COALESCE(arrival_date, '') = COALESCE(:arrival_date, '')
              AND COALESCE(departure_date, '') = COALESCE(:departure_date, '')
            ORDER BY id
            LIMIT 1
        """), row).scalar()
        if canonical_stop is None:
            bind.execute(sa.text("""
                INSERT INTO trip_stops
                    (trip_id, city_name, arrival_date, departure_date, budget, description, activities)
                VALUES
                    (:trip_id, :city_name, :arrival_date, :departure_date, 0, NULL, '[]')
            """), row)
            canonical_stop = bind.execute(sa.text("""
                SELECT id
                FROM trip_stops
                WHERE trip_id = :trip_id
                  AND city_name = :city_name
                  AND COALESCE(arrival_date, '') = COALESCE(:arrival_date, '')
                  AND COALESCE(departure_date, '') = COALESCE(:departure_date, '')
                ORDER BY id DESC
                LIMIT 1
            """), row).scalar()
        duplicate = bind.execute(sa.text("""
            SELECT id FROM activities
            WHERE trip_stop_id = :trip_stop_id
              AND name = :name
              AND COALESCE(cost, 0) = COALESCE(:cost, 0)
            LIMIT 1
        """), {"trip_stop_id": canonical_stop, "name": row["name"], "cost": row["cost"]}).scalar()
        if duplicate is not None:
            continue
        position = bind.execute(sa.text(
            "SELECT COALESCE(MAX(position), -1) + 1 FROM activities WHERE trip_stop_id = :trip_stop_id"
        ), {"trip_stop_id": canonical_stop}).scalar()
        bind.execute(sa.text("""
            INSERT INTO activities (name, cost, category, trip_stop_id, position)
            VALUES (:name, :cost, :category, :trip_stop_id, :position)
        """), {
            "name": row["name"],
            "cost": row["cost"] or 0,
            "category": row["category"] or "Uncategorized",
            "trip_stop_id": canonical_stop,
            "position": position,
        })


def downgrade() -> None:
    # Backfilled rows cannot be distinguished safely from later canonical rows.
    pass
