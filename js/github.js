(function (G) {
  const C = G.Core || require('./core.js');
  // Upload one JPEG (Uint8Array/ArrayBuffer) to scans/<collection>/<stamp>.jpg via the GitHub Contents API.
  async function uploadScan({ token, repo, collection, date, bytes, fetchImpl }) {
    const f = fetchImpl || G.fetch.bind(G), path = C.scanPath(collection, date);
    const res = await f(C.contentsUrl(repo, path), { method: 'PUT',
      headers: { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'Content-Type': 'application/json' },
      body: JSON.stringify(C.putBody(collection, date, C.bytesToBase64(bytes))) });
    if (!res.ok) { let msg = res.status + ''; try { msg += ' ' + (await res.json()).message; } catch (e) {} throw new Error('GitHub upload failed: ' + msg); }
    const j = await res.json(); return { path, sha: j.content && j.content.sha, url: j.content && j.content.html_url };
  }
  G.GH = { uploadScan };
  if (typeof module !== 'undefined') module.exports = G.GH;
})(typeof self !== 'undefined' ? self : globalThis);
