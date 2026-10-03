from logging.config import fileConfig
import os
from alembic import context
from sqlalchemy import engine_from_config, inspect, pool, text

from database import SQLALCHEMY_DATABASE_URL
import models
from migrations.version_table import VERSION_TABLE_MAX_LENGTH

config = context.config
config.set_main_option("sqlalchemy.url", os.getenv("DATABASE_URL", SQLALCHEMY_DATABASE_URL).replace("%", "%%"))
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = models.Base.metadata


def ensure_version_table_capacity(connection):
    """Ensure PostgreSQL can store all current and future revision identifiers."""
    if connection.dialect.name != "postgresql":
        return

    inspector = inspect(connection)
    if not inspector.has_table("alembic_version"):
        connection.execute(text(
            "CREATE TABLE alembic_version ("
            f"version_num VARCHAR({VERSION_TABLE_MAX_LENGTH}) NOT NULL PRIMARY KEY"
            ")"
        ))
        return

    version_column = next(
        column for column in inspector.get_columns("alembic_version")
        if column["name"] == "version_num"
    )
    current_length = getattr(version_column["type"], "length", None)
    if current_length is None or current_length < VERSION_TABLE_MAX_LENGTH:
        connection.execute(text(
            "ALTER TABLE alembic_version "
            f"ALTER COLUMN version_num TYPE VARCHAR({VERSION_TABLE_MAX_LENGTH})"
        ))


def include_object(object_, name, type_, reflected, compare_to):
    # The legacy auth module owns the existing SQLite users table shape.
    # Keep it in the baseline migration without rewriting live auth records.
    if (
        (type_ == "table" and name == "users")
        or getattr(getattr(object_, "table", None), "name", None) == "users"
    ):
        return False
    return True

def include_name(name, type_, parent_names):
    if type_ == "table" and name == "users":
        return False
    if parent_names.get("table_name") == "users":
        return False
    return True

def run_migrations_offline():
    context.configure(
        url=config.get_main_option("sqlalchemy.url"),
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        include_object=include_object,
        include_name=include_name,
    )
    with context.begin_transaction():
        context.run_migrations()

def run_migrations_online():
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            include_object=include_object,
            include_name=include_name,
        )
        ensure_version_table_capacity(connection)
        with context.begin_transaction():
            context.run_migrations()

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
