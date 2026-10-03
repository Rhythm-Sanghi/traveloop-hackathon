"""add trip base currency

Revision ID: 20261003_trip_currency
Revises: 20261003_trip_version
"""
from alembic import op
import sqlalchemy as sa

revision = "20261003_trip_currency"
down_revision = "20261003_trip_version"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "trips",
        sa.Column("currency", sa.String(length=3), nullable=False, server_default="USD"),
    )


def downgrade() -> None:
    op.drop_column("trips", "currency")
