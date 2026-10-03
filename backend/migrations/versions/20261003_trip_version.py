"""add optimistic trip version

Revision ID: 20261003_trip_version
Revises: 20261003_expenses
"""
from alembic import op
import sqlalchemy as sa

revision = "20261003_trip_version"
down_revision = "20261003_expenses"
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.add_column("trips", sa.Column("version", sa.Integer(), nullable=False, server_default="1"))

def downgrade() -> None:
    op.drop_column("trips", "version")
