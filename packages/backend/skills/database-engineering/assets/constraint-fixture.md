# Local constraint rehearsal

This fictional SQLite in-memory fixture illustrates why nullable uniqueness alone does not enforce a required business identity. It is an illustration, not a cross-engine migration recipe.

```sql
CREATE TABLE weak_identity(id INTEGER PRIMARY KEY, external_id TEXT UNIQUE);
INSERT INTO weak_identity VALUES (1,NULL),(2,NULL);
SELECT COUNT(*) AS rows_without_identity FROM weak_identity WHERE external_id IS NULL;

CREATE TABLE required_identity(id INTEGER PRIMARY KEY, external_id TEXT NOT NULL UNIQUE);
INSERT INTO required_identity VALUES (1,'entity-a');
SELECT COUNT(*) AS valid_rows FROM required_identity;
```

Expected results: two rows without identity in the weak table; one valid row in the required table. In a local rehearsal, attempts to insert a null or duplicate external_id into required_identity must fail while the valid row remains. Verify the exact engine behavior for the actual task; collation, temporal keys and other identity semantics require their own contract.
