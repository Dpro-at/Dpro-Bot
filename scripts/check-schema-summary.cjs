const Database = require('../packages/backend/node_modules/better-sqlite3');
const db = new Database('../packages/backend/.data/agent-player.db');

console.log('╔════════════════════════════════════════════════════════════════════════╗');
console.log('║          📊 قاعدة بيانات Dpro Bot - ملخص الجداول                 ║');
console.log('╚════════════════════════════════════════════════════════════════════════╝\n');

// Get all tables
const tables = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`).all();

console.log(`\n📋 إجمالي الجداول: ${tables.length}\n`);
console.log('─'.repeat(80));
console.log('اسم الجدول'.padEnd(40) + 'عدد السجلات'.padEnd(20) + 'حجم الجدول');
console.log('─'.repeat(80));

let totalRecords = 0;

tables.forEach(table => {
  try {
    const count = db.prepare(`SELECT COUNT(*) as count FROM ${table.name}`).get();
    const cols = db.prepare(`PRAGMA table_info(${table.name})`).all();

    totalRecords += count.count;

    const emoji = count.count > 0 ? '✅' : '⚪';
    const countStr = count.count.toLocaleString('en-US');
    const colsStr = `(${cols.length} columns)`;

    console.log(`${emoji} ${table.name.padEnd(37)} ${countStr.padEnd(18)} ${colsStr}`);
  } catch (e) {
    console.log(`❌ ${table.name.padEnd(37)} ERROR`);
  }
});

console.log('─'.repeat(80));
console.log(`\n📊 إجمالي السجلات في جميع الجداول: ${totalRecords.toLocaleString('en-US')}\n`);

// Show tables with most data
console.log('\n🏆 الجداول الأكثر استخداماً (Top 10):');
console.log('─'.repeat(80));

const tablesWithCounts = tables.map(t => {
  try {
    const count = db.prepare(`SELECT COUNT(*) as count FROM ${t.name}`).get();
    return { name: t.name, count: count.count };
  } catch {
    return { name: t.name, count: 0 };
  }
}).sort((a, b) => b.count - a.count).slice(0, 10);

tablesWithCounts.forEach((t, i) => {
  console.log(`${i + 1}. ${t.name.padEnd(40)} ${t.count.toLocaleString('en-US')} سجل`);
});

console.log('\n' + '═'.repeat(80) + '\n');

db.close();
