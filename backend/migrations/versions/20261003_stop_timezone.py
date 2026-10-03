"""add destination timezone

Revision ID: 20261003_stop_timezone
Revises: 20261003_canonical_activities
"""
from alembic import op
import sqlalchemy as sa

revision = "20261003_stop_timezone"
down_revision = "20261003_canonical_activities"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("trip_stops", sa.Column("timezone", sa.String(length=64), nullable=True))


def downgrade() -> None:
    op.drop_column("trip_stops", "timezone")
