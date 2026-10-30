'use strict';
const path = require('node:path');
try {
  const Database = require(require.resolve('better-sqlite3', { paths: [process.argv[2]] }));
  const db = new Database(path.join(process.argv[3], 'agent-player.db'), { readonly: true, fileMustExist: true });
  const owner = db.prepare("SELECT id FROM users WHERE role IN ('owner', 'admin') AND id NOT IN ('mock-user', '1') LIMIT 1").get();
  if (!owner) {
    db.close();
    process.stdout.write(JSON.stringify({ state: 'unconfigured' }));
    process.exit(0);
  }
  let ownerName;
  try {
    const row = db.prepare("SELECT COALESCE(NULLIF(full_name, ''), NULLIF(username, ''), email) AS name FROM users WHERE id = ?").get(owner.id);
    if (typeof row?.name === 'string' && row.name.trim()) ownerName = row.name.trim().slice(0, 100);
  } catch { /* An older database may not have all display fields. */ }
  let agents;
  try { agents = Number(db.prepare('SELECT COUNT(*) AS count FROM agents_config').get().count); } catch { /* Optional for older workspaces. */ }
  let lastUsed;
  try {
    const row = db.prepare('SELECT MAX(updated_at) AS value FROM chat_sessions WHERE user_id = ?').get(owner.id);
    if (typeof row?.value === 'string') lastUsed = row.value.slice(0, 40);
  } catch { /* Optional for older workspaces. */ }
  db.close();
  process.stdout.write(JSON.stringify({ state: 'existing', ...(ownerName ? { ownerName } : {}), ...(Number.isSafeInteger(agents) && agents >= 0 ? { agents } : {}), ...(lastUsed ? { lastUsed } : {}) }));
} catch (error) { process.stdout.write(JSON.stringify({ state: 'unreadable', reason: typeof error.code === 'string' ? error.code : error.name })); }
