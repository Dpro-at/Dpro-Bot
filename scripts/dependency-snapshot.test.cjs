'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { manifest, packageUrl, snapshot } = require('./dependency-snapshot.cjs');

test('reports overridden resolved versions and keeps scoped, development and optional platform packages', () => {
  const result = manifest({ lockfileVersion: 3, packages: {
    '': { dependencies: { parent: '1.0.0' }, devDependencies: { '@build/tool': '2.0.0' } },
    'node_modules/parent': { version: '1.0.0', dependencies: { minimatch: '9.0.9' }, optionalDependencies: { 'platform-helper': '1.0.0' } },
    'node_modules/minimatch': { version: '11.0.1' },
    'node_modules/parent/node_modules/platform-helper': { version: '1.0.0', optional: true, os: ['win32'] },
    'node_modules/@build/tool': { version: '2.0.0', dev: true, dependencies: { minimatch: '^10' } },
  } }, 'fixture/package-lock.json', 'hash');
  const p = packageUrl('parent', '1.0.0');
  const mm = packageUrl('minimatch', '11.0.1');
  assert.equal(Object.keys(result.resolved).length, 4);
  assert.deepEqual(result.resolved[p].dependencies, [mm, packageUrl('platform-helper', '1.0.0')].sort());
  assert.equal(result.resolved[p].relationship, 'direct');
  assert.equal(result.resolved[packageUrl('@build/tool', '2.0.0')].scope, 'development');
  assert.equal(result.resolved[mm].scope, 'runtime');
  assert.equal(result.resolved[mm].relationship, 'indirect');
  assert.equal(Object.keys(result.resolved).some(url => url.includes('9.0.9')), false);
  assert.equal(result.file.source_location, 'fixture/package-lock.json');
});

test('nested copies retain their own resolution and duplicate package nodes merge without losing runtime scope', () => {
  const result = manifest({ lockfileVersion: 3, packages: {
    '': { dependencies: { first: '1', second: '1' } },
    'node_modules/first': { version: '1', dependencies: { shared: '1' } },
    'node_modules/first/node_modules/shared': { version: '2', dev: true },
    'node_modules/second': { version: '1', dependencies: { shared: '1' } },
    'node_modules/shared': { version: '2' },
  } }, 'fixture', 'hash');
  const shared = packageUrl('shared', '2');
  assert.deepEqual(result.resolved[packageUrl('first', '1')].dependencies, [shared]);
  assert.deepEqual(result.resolved[packageUrl('second', '1')].dependencies, [shared]);
  assert.equal(result.resolved[shared].scope, 'runtime');
  assert.equal(Object.keys(result.resolved).length, 3);
});

test('fails rather than silently omitting unresolved required packages or another branch', () => {
  assert.throws(() => manifest({ lockfileVersion: 2 }, 'fixture', ''), /Unsupported/);
  assert.throws(() => manifest({ lockfileVersion: 3, packages: { '': { dependencies: { missing: '1' } } } }, 'fixture', ''), /Missing direct/);
  assert.throws(() => manifest({ lockfileVersion: 3, packages: { '': {}, 'node_modules/a': { link: true } } }, 'fixture', ''), /Unresolved/);
  assert.throws(() => manifest({ lockfileVersion: 3, packages: { '': {}, 'node_modules/a': { version: '1', dependencies: { missing: '1' } } } }, 'fixture', ''), /Missing dependency/);
  assert.throws(() => snapshot('.', { GITHUB_SHA: 'a'.repeat(40), GITHUB_REF: 'refs/heads/develop' }), /exact main/);
});
