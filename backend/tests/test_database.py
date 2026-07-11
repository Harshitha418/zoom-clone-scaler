import tempfile
import unittest
from pathlib import Path

from app.database import create_engine_for_database_url


class DatabaseEngineTests(unittest.TestCase):
    def test_sqlite_engine_creates_missing_parent_directory(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            db_path = Path(tmpdir) / "nested" / "db" / "app.db"
            database_url = f"sqlite:///{db_path}"

            engine = create_engine_for_database_url(database_url)

            self.assertTrue(db_path.parent.exists())
            engine.dispose()


if __name__ == "__main__":
    unittest.main()
