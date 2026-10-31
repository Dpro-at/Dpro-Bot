'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');

const LOCKFILES = ['packages/backend/package-lock.json', 'packages/core-ui/package-lock.json', 'packages/desktop/package-lock.json'];
const packageUrl = (name, version) => `pkg:npm/${name.split('/').map(encodeURIComponent).join('/')}@${encodeURIComponent(version)}`;

/** Publish resolved lock versions, including overrides and every optional platform package. */
function manifest(lock, name, digest) {
  if (lock.lockfileVersion !== 3 || !lock.packages?.['']) throw new Error(`Unsupported lockfile: ${name}`);
  const entries = lock.packages;
  const urls = new Map();
  for (const [location, entry] of Object.entries(entries)) {
    if (!location) continue;
    if (!location.includes('node_modules/') || entry.link || typeof entry.version !== 'string') throw new Error(`Unresolved package: ${name}:${location}`);
    const packageName = entry.name || location.split('node_modules/').pop();
    urls.set(location, packageUrl(packageName, entry.version));
  }
  const find = (parent, dependency) => {
    let directory = parent;
    while (true) {
      const candidate = `${directory ? directory + '/' : ''}node_modules/${dependency}`;
      if (urls.has(candidate)) return urls.get(candidate);
      if (!directory) return null;
      const ancestor = directory.lastIndexOf('/node_modules/');
      directory = ancestor < 0 ? '' : directory.slice(0, ancestor);
    }
  };
  const root = entries[''];
  const direct = new Set(Object.keys({ ...root.dependencies, ...root.devDependencies, ...root.optionalDependencies }));
  for (const dependency of direct) {
    if (!find('', dependency) && !Object.hasOwn(root.optionalDependencies || {}, dependency)) throw new Error(`Missing direct dependency: ${name}:${dependency}`);
  }
  const resolved = {};
  for (const [location, url] of urls) {
    const entry = entries[location];
    const children = new Set();
    const names = new Set(Object.keys({ ...entry.dependencies, ...entry.optionalDependencies, ...entry.peerDependencies }));
    for (const dependency of names) {
      const child = find(location, dependency);
      if (child) children.add(child);
      else if (Object.hasOwn(entry.dependencies || {}, dependency) && !Object.hasOwn(entry.optionalDependencies || {}, dependency)) throw new Error(`Missing dependency: ${name}:${location}:${dependency}`);
    }
    const isDirect = [...direct].some(dependency => location === `node_modules/${dependency}`);
    const prior = resolved[url];
    resolved[url] = {
      package_url: url,
      relationship: isDirect || prior?.relationship === 'direct' ? 'direct' : 'indirect',
      scope: entry.dev === true && prior?.scope !== 'runtime' ? 'development' : 'runtime',
      dependencies: [...new Set([...(prior?.dependencies || []), ...children])].sort(),
    };
  }
  return { name, file: { source_location: name }, metadata: { lockfile_sha256: digest }, resolved };
}

function snapshot(root, env, now = new Date()) {
  if (!/^[a-f0-9]{40}$/.test(env.GITHUB_SHA || '') || env.GITHUB_REF !== 'refs/heads/main') throw new Error('Dependency snapshots require an exact main revision');
  const manifests = {};
  for (const file of LOCKFILES) {
    const bytes = fs.readFileSync(path.join(root, file));
    manifests[file] = manifest(JSON.parse(bytes), file, createHash('sha256').update(bytes).digest('hex'));
  }
  return {
    version: 0, sha: env.GITHUB_SHA, ref: env.GITHUB_REF,
    job: { id: env.GITHUB_RUN_ID || env.GITHUB_SHA, correlator: 'Security Scanning/resolved-npm-lockfiles' },
    detector: { name: 'girru-resolved-npm-lockfiles', version: '1.0.0', url: 'https://github.com/Dpro-at/Girru' },
    scanned: now.toISOString(), manifests,
  };
}

if (require.main === module) process.stdout.write(JSON.stringify(snapshot(path.resolve(__dirname, '..'), process.env)) + '\n');
module.exports = { manifest, snapshot, packageUrl };
