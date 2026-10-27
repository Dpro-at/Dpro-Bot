'use strict';
/** Attach an existing Electron app to the local Girru development checkout. No downloads. */
const fs = require('node:fs');
const path = require('node:path');
const { compatibleRuntime, loopbackOrigin } = require('../src/nabu-editor.cjs');

function initializeSettings(settings, origin) {
  try {
    fs.writeFileSync(settings, JSON.stringify({ mode: 'remote', remoteUrl: origin }), { mode: 0o600, flag: 'wx' });
    return true;
  } catch (error) { if (error.code === 'EEXIST') return false; throw error; }
}

function configure({ appDir, runtimeRoot, node, profile, origin }) {
  if (process.platform !== 'darwin') throw Error('This local preview launcher requires macOS');
  if (!loopbackOrigin(origin)) throw Error('The preview requires a loopback Girru address');
  if (!compatibleRuntime(runtimeRoot)) throw Error('Compatible editor runtime not found');
  for (const value of [appDir, runtimeRoot, node, profile]) if (!value || !path.isAbsolute(value)) throw Error('Absolute paths required');
  if (!fs.statSync(node).isFile()) throw Error('Node runtime not found');
  const resources = path.join(appDir, 'Contents', 'Resources');
  if (!fs.statSync(resources).isDirectory()) throw Error('Existing Electron app not found');
  const destination = path.join(resources, 'app');
  if (fs.existsSync(destination) || fs.existsSync(path.join(resources, 'app.asar'))) throw Error('Refusing to replace an existing application');
  const main = path.resolve(__dirname, '../src/main.cjs');
  fs.mkdirSync(profile, { recursive: true, mode: 0o700 });
  const settings = path.join(profile, 'desktop.json');
  initializeSettings(settings, origin);
  fs.mkdirSync(destination);
  fs.writeFileSync(path.join(destination, 'package.json'), JSON.stringify({ name: 'dpro-local-preview', productName: 'Girru', version: require('../package.json').version, main: 'bootstrap.cjs', private: true }));
  fs.writeFileSync(path.join(destination, 'bootstrap.cjs'), `'use strict';\nObject.assign(process.env,${JSON.stringify({ DPRO_NABU_ROOT: runtimeRoot, DPRO_DESKTOP_NODE: node, DPRO_DESKTOP_PROFILE_DIR: profile })});\nrequire(${JSON.stringify(main)});\n`);
  return appDir;
}

if (require.main === module) {
  const keys = { '--app': 'appDir', '--runtime-root': 'runtimeRoot', '--node': 'node', '--profile': 'profile', '--origin': 'origin' };
  const options = {};
  try {
    for (let i = 2; i < process.argv.length; i += 2) {
      const key = keys[process.argv[i]];
      if (!key || !process.argv[i + 1] || key in options) throw Error('Unknown, duplicate or incomplete option');
      options[key] = process.argv[i + 1];
    }
    console.log(configure(options));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
module.exports = { configure, initializeSettings };
