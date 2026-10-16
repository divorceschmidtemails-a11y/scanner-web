const test = require('node:test'), assert = require('node:assert');
const C = require('../js/core.js'), GH = require('../js/github.js');
test('slug', () => { assert.equal(C.slug('Notebook #3: Café/Box'), 'Notebook-3-CafeBox'); assert.equal(C.slug('  '), 'untitled'); assert.equal(C.slug('a  b__c'), 'a-b-c'); });
test('stamp + paths', () => { const d = new Date(2026, 9, 5, 7, 8, 9, 12);
  assert.equal(C.stamp(d), '2026-10-05T07-08-09-012'); assert.equal(C.scanPath('My Notes', d), 'scans/My-Notes/2026-10-05T07-08-09-012.jpg');
  assert.equal(C.fileName('My Notes', d), 'My-Notes-2026-10-05T07-08-09-012.jpg'); });
test('parseRepo + contentsUrl', () => { assert.equal(C.parseRepo('https://github.com/a-b/scans.git').full, 'a-b/scans'); assert.equal(C.parseRepo('nope'), null);
  assert.equal(C.contentsUrl('o/r', 'scans/x y/1.jpg'), 'https://api.github.com/repos/o/r/contents/scans/x%20y/1.jpg'); assert.throws(() => C.contentsUrl('bad', 'x')); });
test('base64 matches Buffer', () => { for (const n of [0, 1, 2, 3, 4, 5, 255, 1000]) { const b = new Uint8Array(n).map((_, i) => (i * 37 + 11) & 255);
  assert.equal(C.bytesToBase64(b), Buffer.from(b).toString('base64')); } });
test('orderCorners', () => assert.deepEqual(C.orderCorners([[10, 10], [0, 10], [10, 0], [0, 0]]), [[0, 0], [10, 0], [10, 10], [0, 10]]));
test('uploadScan builds the right request', async () => { let seen; const r = await GH.uploadScan({ token: 'T', repo: 'o/r', collection: 'C', date: new Date(2026, 0, 1), bytes: new Uint8Array([1, 2, 3]),
  fetchImpl: async (u, o) => { seen = { u, o }; return { ok: true, json: async () => ({ content: { sha: 's', html_url: 'h' } }) }; } });
  assert.equal(seen.o.method, 'PUT'); assert.equal(seen.o.headers.Authorization, 'Bearer T'); assert.equal(JSON.parse(seen.o.body).content, 'AQID');
  assert.match(seen.u, /contents\/scans\/C\/2026-01-01T00-00-00-000\.jpg$/); assert.equal(r.sha, 's'); });
