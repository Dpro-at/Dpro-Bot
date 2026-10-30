// MACICON-01: the app icon is the logo on the rounded macOS tile, drawn by our own script.
// The written files are checked by their headers; the committed build/ files must match
// what the script draws, so the icon can always be made again from the script.
const test = require('node:test'); const assert = require('node:assert/strict'); const fs = require('node:fs'); const os = require('node:os'); const path = require('node:path'); const zlib = require('node:zlib');
const { main, insideTile } = require('../scripts/make-icons.cjs');

// Compare pixels, not bytes: another zlib may pack the same pixels differently.
const pixels = buffer => { const parts = []; for (let at = 8; at < buffer.length;) { const len = buffer.readUInt32BE(at); if (buffer.subarray(at + 4, at + 8).toString('ascii') === 'IDAT') parts.push(buffer.subarray(at + 8, at + 8 + len)); at += 12 + len; } return zlib.inflateSync(Buffer.concat(parts)); };
const pngSize = buffer => { assert.equal(buffer.subarray(1, 4).toString('ascii'), 'PNG'); return [buffer.readUInt32BE(16), buffer.readUInt32BE(20)]; };

test('tile shape: clear edge, rounded corners, full middle', () => {
  assert.equal(insideTile(512, 512), true);
  assert.equal(insideTile(110, 512), true);
  assert.equal(insideTile(90, 512), false);
  assert.equal(insideTile(110, 110), false);
  assert.equal(insideTile(180, 180), true);
});

test('writes png, icns and ico with every size, the same as the committed files', t => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'girru-icons-'));
  t.after(() => fs.rmSync(out, { recursive: true, force: true }));
  main(['--out', out]);
  const png = fs.readFileSync(path.join(out, 'icon.png'));
  assert.deepEqual(pngSize(png), [1024, 1024]);
  assert.equal(png[25], 6, 'RGBA, so the edge stays transparent');

  const icns = fs.readFileSync(path.join(out, 'icon.icns'));
  assert.equal(icns.subarray(0, 4).toString('ascii'), 'icns');
  assert.equal(icns.readUInt32BE(4), icns.length);
  const entries = {};
  for (let at = 8; at < icns.length;) { const len = icns.readUInt32BE(at + 4); entries[icns.subarray(at, at + 4).toString('ascii')] = pngSize(icns.subarray(at + 8, at + len))[0]; at += len; }
  assert.deepEqual(entries, { icp4: 16, icp5: 32, ic07: 128, ic08: 256, ic09: 512, ic10: 1024, ic11: 32, ic12: 64, ic13: 256, ic14: 512 });

  const ico = fs.readFileSync(path.join(out, 'icon.ico'));
  assert.equal(ico.readUInt16LE(2), 1); assert.equal(ico.readUInt16LE(4), 5);
  const sizes = [0, 1, 2, 3, 4].map(i => pngSize(ico.subarray(ico.readUInt32LE(6 + 16 * i + 12)))[0]);
  assert.deepEqual(sizes, [16, 32, 64, 128, 256]);

  const committed = fs.readFileSync(path.join(__dirname, '..', 'build', 'icon.png'));
  assert.ok(pixels(png).equals(pixels(committed)), 'build/icon.png is out of date: run node scripts/make-icons.cjs');
  for (const name of ['icon.icns', 'icon.ico']) assert.ok(fs.existsSync(path.join(__dirname, '..', 'build', name)), `build/${name} is missing`);
});
