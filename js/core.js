// Pure helpers (no DOM). Used by the app and by node tests.
(function (G) {
  function slug(name) {
    const s = String(name || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^A-Za-z0-9 _-]+/g, '').trim().replace(/[\s_]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    return s.slice(0, 60) || 'untitled';
  }
  const pad = (n, w = 2) => String(n).padStart(w, '0');
  // 2026-10-15T23-40-05-123 (local time; filesystem/URL safe, sorts chronologically)
  function stamp(d) {
    d = d instanceof Date ? d : new Date(d);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}-${pad(d.getMilliseconds(), 3)}`;
  }
  function scanPath(collection, date) { return `scans/${slug(collection)}/${stamp(date)}.jpg`; }
  function fileName(collection, date) { return `${slug(collection)}-${stamp(date)}.jpg`; }
  function parseRepo(s) {
    const m = String(s || '').trim().replace(/^https?:\/\/github\.com\//, '').replace(/\.git$/, '').match(/^([A-Za-z0-9-]+)\/([A-Za-z0-9._-]+)$/);
    return m ? { owner: m[1], repo: m[2], full: `${m[1]}/${m[2]}` } : null;
  }
  function contentsUrl(repoFull, path) {
    const r = parseRepo(repoFull); if (!r) throw new Error('Bad repo: ' + repoFull);
    return `https://api.github.com/repos/${r.owner}/${r.repo}/contents/${path.split('/').map(encodeURIComponent).join('/')}`;
  }
  const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  function bytesToBase64(bytes) {
    bytes = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes); let out = '', i = 0;
    for (; i + 2 < bytes.length; i += 3) { const n = bytes[i] << 16 | bytes[i + 1] << 8 | bytes[i + 2];
      out += B64[n >> 18 & 63] + B64[n >> 12 & 63] + B64[n >> 6 & 63] + B64[n & 63]; }
    const r = bytes.length - i;
    if (r === 1) { const n = bytes[i] << 16; out += B64[n >> 18 & 63] + B64[n >> 12 & 63] + '=='; }
    else if (r === 2) { const n = bytes[i] << 16 | bytes[i + 1] << 8; out += B64[n >> 18 & 63] + B64[n >> 12 & 63] + B64[n >> 6 & 63] + '='; }
    return out;
  }
  function putBody(collection, date, b64) { return { message: `Add scan ${scanPath(collection, date)}`, content: b64 }; }
  // Order arbitrary 4 points as TL,TR,BR,BL
  function orderCorners(pts) {
    const s = pts.map(([x, y]) => x + y), d = pts.map(([x, y]) => x - y), idx = a => a.indexOf(Math.max(...a)), idn = a => a.indexOf(Math.min(...a));
    return [pts[idn(s)], pts[idx(d)], pts[idx(s)], pts[idn(d)]];
  }
  G.Core = { slug, stamp, scanPath, fileName, parseRepo, contentsUrl, bytesToBase64, putBody, orderCorners };
  if (typeof module !== 'undefined') module.exports = G.Core;
})(typeof self !== 'undefined' ? self : globalThis);
