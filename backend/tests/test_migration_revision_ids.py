import re
from pathlib import Path

from migrations.version_table import VERSION_TABLE_MAX_LENGTH


def test_revision_ids_fit_version_table_capacity():
    revisions_dir = Path(__file__).parents[1] / "migrations" / "versions"
    revision_ids = []
    for path in revisions_dir.glob("*.py"):
        revision_ids.extend(re.findall(
            r'^revision\s*=\s*["\']([^"\']+)',
            path.read_text(),
            flags=re.MULTILINE,
        ))

    assert revision_ids
    assert max(map(len, revision_ids)) <= VERSION_TABLE_MAX_LENGTH
