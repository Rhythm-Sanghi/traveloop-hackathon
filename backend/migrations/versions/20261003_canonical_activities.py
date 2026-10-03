"""add canonical itinerary activities

Revision ID: 20261003_canonical_activities
Revises: 20261003_trip_currency
"""
from alembic import op
import sqlalchemy as sa
import json

revision = "20261003_canonical_activities"
down_revision = "20261003_trip_currency"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("activities") as batch:
        batch.add_column(sa.Column("trip_stop_id", sa.Integer(), nullable=True))
        batch.add_column(sa.Column("position", sa.Integer(), nullable=False, server_default="0"))
        batch.add_column(sa.Column("activity_date", sa.String(), nullable=True))
        batch.add_column(sa.Column("timezone", sa.String(), nullable=True))
        batch.create_index("ix_activities_trip_stop_id", ["trip_stop_id"])
        batch.create_foreign_key(
            "fk_activities_trip_stop_id",
            "trip_stops",
            ["trip_stop_id"],
            ["id"],
            ondelete="CASCADE",
        )

    bind = op.get_bind()
    rows = bind.execute(sa.text("SELECT id, activities FROM trip_stops ORDER BY id")).mappings()
    for row in rows:
        raw = row["activities"]
        if not raw:
            continue
        try:
            activities = json.loads(raw) if isinstance(raw, str) else raw
        except (TypeError, ValueError) as exc:
            raise RuntimeError(f"Cannot migrate malformed activities for trip_stop {row['id']}") from exc
        if not isinstance(activities, list):
            raise RuntimeError(f"Cannot migrate non-list activities for trip_stop {row['id']}")
        for position, activity in enumerate(activities):
            if isinstance(activity, str):
                activity = {"name": activity}
            if not isinstance(activity, dict) or not activity.get("name"):
                raise RuntimeError(f"Cannot migrate malformed activity at trip_stop {row['id']} position {position}")
            bind.execute(
                sa.text(
                    "INSERT INTO activities (name, cost, category, trip_stop_id, position, activity_date, timezone) "
                    "VALUES (:name, :cost, :category, :trip_stop_id, :position, :activity_date, :timezone)"
                ),
                {
                    "name": str(activity["name"]),
                    "cost": float(activity.get("cost") or 0),
                    "category": str(activity.get("category") or "Uncategorized"),
                    "trip_stop_id": row["id"],
                    "position": position,
                    "activity_date": activity.get("activity_date"),
                    "timezone": activity.get("timezone"),
                },
            )


def downgrade() -> None:
    with op.batch_alter_table("activities") as batch:
        batch.drop_constraint("fk_activities_trip_stop_id", type_="foreignkey")
        batch.drop_index("ix_activities_trip_stop_id")
        batch.drop_column("timezone")
        batch.drop_column("activity_date")
        batch.drop_column("position")
        batch.drop_column("trip_stop_id")
