# Bounded fanout rehearsal

This self-contained SQLite example demonstrates a relationship failure. It uses fictional data and requires only a local in-memory database. It does not model currency conversion, historical dimensions or warehouse-specific SQL.

```sql
CREATE TABLE orders(id INTEGER PRIMARY KEY, total INTEGER NOT NULL);
CREATE TABLE lines(id INTEGER PRIMARY KEY, order_id INTEGER NOT NULL);
CREATE TABLE payments(id INTEGER PRIMARY KEY, order_id INTEGER NOT NULL, amount INTEGER NOT NULL);
INSERT INTO orders VALUES (1,100),(2,60);
INSERT INTO lines VALUES (11,1),(12,1),(21,2);
INSERT INTO payments VALUES (101,1,40),(102,1,60),(201,2,60);

-- Incorrect for order-level revenue: independent child details multiply rows.
SELECT SUM(o.total) AS inflated_total
FROM orders o JOIN lines l ON l.order_id=o.id
JOIN payments p ON p.order_id=o.id;

-- Correct grain for this question: independently aggregate payments before joining.
WITH paid AS (SELECT order_id,SUM(amount) AS paid FROM payments GROUP BY order_id)
SELECT SUM(o.total) AS revenue,SUM(p.paid) AS payments
FROM orders o LEFT JOIN paid p ON p.order_id=o.id;
```

Expected first result: 460. Expected second result: revenue 160, payments 160. The inflated total is an intentionally incorrect query, not a recommended solution. A separate fixture with equal-valued orders would expose why SUM(DISTINCT total) is not a reliable repair. Production validation must use the actual contract and engine.
