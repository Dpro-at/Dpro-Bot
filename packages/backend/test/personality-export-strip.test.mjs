// The generated Personality block is removed by plain index search, so a file full of line breaks stays fast.
// Run: node --import tsx --test test/personality-export-strip.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { stripPersonalityExport as strip, upsertPersonalityExport as upsert, EXPORT_BEGIN as B, EXPORT_END as E } from '../src/services/personality.ts';

test('the generated block is removed, hand-written text kept, and long inputs stay fast', () => {
  const block = `${B}\n| a |\n${E}`;
  assert.equal(strip(`intro\n\n${block}\n\nmore`), 'intro\n\nmore');
  assert.equal(strip(block), '');
  assert.equal(strip(`a\n${block}\nb\n${block}\nc`), 'a\n\nb\n\nc');
  assert.equal(strip('x <!-- personality-settings:begin no end'), 'x <!-- personality-settings:begin no end');
  assert.equal(upsert(`intro\n\n${block}`, 'NEW'), 'intro\n\nNEW\n');
  const started = Date.now();
  strip('\n'.repeat(200000) + '<!-- personality-settings:begin');
  assert.ok(Date.now() - started < 500);
});
