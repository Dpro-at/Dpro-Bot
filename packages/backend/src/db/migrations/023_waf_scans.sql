-- Migration 023: WAF Security Scan History (no longer made here)
-- The WAF Security scanner is a Girru Store app now (APPS-06) and makes its own
-- app_waf_security__waf_scans table when it is added. Data folders that already have
-- waf_scans keep it; it is moved to the app's name at startup for owners who used the app
-- (src/services/legacy-app-tables.ts).

SELECT 1;
