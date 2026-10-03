"""add normalized expenses

Revision ID: 20261003_expenses
Revises: f9012e3d1227
"""
from alembic import op
import sqlalchemy as sa

revision = "20261003_expenses"
down_revision = "f9012e3d1227"
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.create_table(
        "expenses",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("trip_id", sa.Integer(), nullable=False),
        sa.Column("stop_id", sa.Integer(), nullable=True),
        sa.Column("activity_id", sa.Integer(), nullable=True),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("category", sa.String(), nullable=False),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("currency", sa.String(3), nullable=False),
        sa.Column("expense_date", sa.String(), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.String(), nullable=False),
        sa.Column("updated_at", sa.String(), nullable=False),
        sa.ForeignKeyConstraint(["trip_id"], ["trips.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["stop_id"], ["trip_stops.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["activity_id"], ["activities.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_expenses_id", "expenses", ["id"], unique=False)
    op.create_index("ix_expenses_trip_id", "expenses", ["trip_id"], unique=False)
    op.create_index("ix_expenses_stop_id", "expenses", ["stop_id"], unique=False)
    op.create_index("ix_expenses_activity_id", "expenses", ["activity_id"], unique=False)
    op.create_index("ix_expenses_trip_date", "expenses", ["trip_id", "expense_date"], unique=False)

def downgrade() -> None:
    op.drop_index("ix_expenses_trip_date", table_name="expenses")
    op.drop_index("ix_expenses_activity_id", table_name="expenses")
    op.drop_index("ix_expenses_stop_id", table_name="expenses")
    op.drop_index("ix_expenses_trip_id", table_name="expenses")
    op.drop_index("ix_expenses_id", table_name="expenses")
    op.drop_table("expenses")
