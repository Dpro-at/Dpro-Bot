# Bounded concurrent reservation rehearsal

This self-contained Python standard-library example uses a temporary SQLite database and two competing connections. It checks the conditional update invariant for this engine, not PostgreSQL isolation or a distributed external effect. It creates no persistent project data.

```python
import concurrent.futures
from pathlib import Path
import sqlite3
import tempfile
import threading

with tempfile.TemporaryDirectory() as folder:
    database = Path(folder) / "reservation.db"
    connection = sqlite3.connect(database)
    connection.execute("CREATE TABLE stock(id INTEGER PRIMARY KEY, quantity INTEGER NOT NULL CHECK(quantity>=0))")
    connection.execute("INSERT INTO stock VALUES(1,1)")
    connection.commit()
    connection.close()
    start = threading.Barrier(2)

    def reserve(_):
        connection = sqlite3.connect(database, timeout=5)
        try:
            start.wait(timeout=5)
            result = connection.execute("UPDATE stock SET quantity=quantity-1 WHERE id=1 AND quantity>0")
            changed = result.rowcount
            connection.commit()
            return changed
        finally:
            connection.close()

    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        effects = sorted(pool.map(reserve, range(2)))
    connection = sqlite3.connect(database)
    remaining = connection.execute("SELECT quantity FROM stock WHERE id=1").fetchone()[0]
    connection.close()
    assert effects == [0, 1]
    assert remaining == 0
    print({"successful_effects": sum(effects), "remaining": remaining})
```

Expected result: one successful effect and zero remaining stock. The unsuccessful conditional update is a conflict/empty-stock outcome, not a second successful reservation. A production operation also needs its own identity, authorization, recovery and surrounding business contract. Do not infer those guarantees from this illustration.
