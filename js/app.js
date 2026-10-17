(function () {
  const $ = id => document.getElementById(id), C = Core;
  let current = null, viewing = null;
  const SCREENS = ['home', 'notebook', 'adjust', 'view', 'settings'];
  function show(id) { SCREENS.forEach(s => $(s).classList.toggle('hidden', s !== id)); }
  function ask(msg, withInput, okText, value) { return new Promise(res => { $('modalMsg').textContent = msg; $('modalInput').value = value || '';
    $('modalInput').classList.toggle('hidden', !withInput); $('modalOk').textContent = okText || 'OK'; $('modal').classList.remove('hidden');
    const done = v => { $('modal').classList.add('hidden'); $('modalOk').onclick = $('modalCancel').onclick = null; res(v); };
    $('modalOk').onclick = () => done(withInput ? $('modalInput').value.trim() : true); $('modalCancel').onclick = () => done(null); }); }
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const status = t => $('nbStatus').textContent = t || '';
  const toBlob = (c, q) => new Promise(r => c.toBlob(r, 'image/jpeg', q || 0.88));

  async function renderHome() { show('home'); const list = await DB.listNotebooks();
    $('nbList').innerHTML = list.length ? list.map(n => `<li data-id="${n.id}"><b>${esc(n.name)}</b><span>${n.pageCount} scan${n.pageCount === 1 ? '' : 's'} · ${new Date(n.updated).toLocaleDateString()}</span></li>`).join('')
      : '<li><span>No collections yet. Tap New Collection.</span></li>';
    $('nbList').querySelectorAll('li[data-id]').forEach(li => li.onclick = () => openNotebook(li.dataset.id)); }
  async function openNotebook(id) { current = await DB.getNotebook(id); show('notebook'); $('nbTitle').textContent = current.name; status('');
    const pages = await DB.getPages(id); $('thumbs').querySelectorAll('img').forEach(i => URL.revokeObjectURL(i.src));
    $('thumbs').innerHTML = pages.length ? '' : '<p style="grid-column:1/-1;color:#999">No scans yet.</p>';
    pages.forEach((p, i) => { const d = document.createElement('div'); d.className = 'th';
      d.innerHTML = `<img src="${URL.createObjectURL(p.thumb || p.blob)}"><i>${i + 1}${p.uploaded ? ' ✓' : ''}</i>`;
      d.onclick = () => openView(p, i); $('thumbs').appendChild(d); }); }
  function openView(p, i) { viewing = p; show('view'); $('viewTitle').textContent = `${current.name} #${i + 1}`;
    if ($('viewImg').src) URL.revokeObjectURL($('viewImg').src); $('viewImg').src = URL.createObjectURL(p.blob); }
  const scanFile = p => new File([p.blob], C.fileName(current.name, p.created || p.order), { type: 'image/jpeg' });

  $('newNb').onclick = async () => { const name = await ask('Collection name', true); if (!name) return; const nb = await DB.createNotebook(name); openNotebook(nb.id); };
  $('backHome').onclick = renderHome; $('viewBack').onclick = () => openNotebook(current.id);
  $('delNb').onclick = async () => { if (await ask(`Delete "${current.name}" and all its scans from this phone?`, false, 'Delete')) { await DB.deleteNotebook(current.id); renderHome(); } };
  $('viewDel').onclick = async () => { if (await ask('Delete this scan from this phone?', false, 'Delete')) { await DB.deletePage(current.id, viewing.id); openNotebook(current.id); } };
  $('viewDl').onclick = () => { const f = scanFile(viewing); Export.download(f, f.name); };
  $('viewShare').onclick = () => Export.share([scanFile(viewing)], current.name);
  $('pdfBtn').onclick = async () => { const pages = await DB.getPages(current.id); if (!pages.length) return ask('No scans yet.');
    status('Building PDF…'); const blob = await Export.buildPdf(pages); status('');
    const f = new File([blob], C.slug(current.name) + '.pdf', { type: 'application/pdf' });
    if (await ask(`PDF ready: ${pages.length} page(s).`, false, 'Share / Save')) Export.share([f], current.name); }; // share needs a fresh tap on iOS
  $('shareBtn').onclick = async () => { const pages = await DB.getPages(current.id); if (!pages.length) return ask('No scans yet.'); Export.share(pages.map(scanFile), current.name); };
  $('uploadBtn').onclick = async () => {
    const token = localStorage.getItem('gh_token'), repo = localStorage.getItem('gh_repo') || 'divorceschmidtemails-a11y/scans';
    if (!token) { await ask('Add your GitHub token in Settings first.'); return openSettings(); }
    const pages = (await DB.getPages(current.id)).filter(p => !p.uploaded); if (!pages.length) return status('Everything is already uploaded.');
    let n = 0; try { for (const p of pages) { status(`Uploading ${++n}/${pages.length}…`);
        await GH.uploadScan({ token, repo, collection: current.name, date: new Date(p.created || p.order), bytes: new Uint8Array(await p.blob.arrayBuffer()) });
        p.uploaded = Date.now(); await DB.updatePage(p); }
      status(`Uploaded ${pages.length} to github.com/${repo}`); } catch (e) { status(e.message); }
    const keep = $('nbStatus').textContent; await openNotebook(current.id); status(keep); };

  // settings
  function openSettings() { show('settings'); $('setToken').value = localStorage.getItem('gh_token') || ''; $('setRepo').value = localStorage.getItem('gh_repo') || 'divorceschmidtemails-a11y/scans'; }
  $('openSettings').onclick = openSettings; $('setBack').onclick = renderHome;
  $('setSave').onclick = async () => { const r = C.parseRepo($('setRepo').value); if (!r) return ask('Repository must look like owner/name.');
    localStorage.setItem('gh_repo', r.full); const t = $('setToken').value.trim(); t ? localStorage.setItem('gh_token', t) : localStorage.removeItem('gh_token'); renderHome(); };

  // capture + corner adjust
  const cv = $('adjCanvas'), cx = cv.getContext('2d'); let src = null, corners = null, drag = -1, queue = [];
  async function onFiles(files) { queue = [...files]; next(); }
  let capturedAt = 0;
  async function next() { const f = queue.shift(); if (!f) return openNotebook(current.id); capturedAt = f.lastModified || Date.now();
    show('adjust'); $('adjMsg').textContent = 'Finding edges…';
    const bmp = await createImageBitmap(f, { imageOrientation: 'from-image' }), k = Math.min(1, 3000 / Math.max(bmp.width, bmp.height));
    src = document.createElement('canvas'); src.width = Math.round(bmp.width * k); src.height = Math.round(bmp.height * k);
    src.getContext('2d').drawImage(bmp, 0, 0, src.width, src.height);
    const small = document.createElement('canvas'), s = Math.min(1, 800 / Math.max(src.width, src.height)); small.width = Math.round(src.width * s); small.height = Math.round(src.height * s);
    small.getContext('2d').drawImage(src, 0, 0, small.width, small.height);
    const d = await CVDetect.detect(small), W = src.width, H = src.height;
    corners = d ? C.orderCorners(d.corners.map(([x, y]) => [x / s, y / s])) : [[W * .08, H * .08], [W * .92, H * .08], [W * .92, H * .92], [W * .08, H * .92]];
    $('adjMsg').textContent = d ? 'Drag corners if needed' : 'No edges found — drag corners or Use Original';
    cv.width = Math.min(W, 1200); cv.height = Math.round(H * cv.width / W); draw(); }
  function draw() { const k = cv.width / src.width; cx.drawImage(src, 0, 0, cv.width, cv.height);
    cx.strokeStyle = '#D9AE50'; cx.lineWidth = Math.max(3, cv.width / 200); cx.fillStyle = 'rgba(217,174,80,.15)'; cx.beginPath();
    corners.forEach(([x, y], i) => cx[i ? 'lineTo' : 'moveTo'](x * k, y * k)); cx.closePath(); cx.fill(); cx.stroke();
    const r = Math.max(14, cv.width / 30); cx.fillStyle = '#D9AE50'; corners.forEach(([x, y]) => { cx.beginPath(); cx.arc(x * k, y * k, r, 0, 7); cx.fill(); }); }
  const pt = e => { const b = cv.getBoundingClientRect(), k = src.width / b.width; return [(e.clientX - b.left) * k, (e.clientY - b.top) * k]; };
  cv.addEventListener('pointerdown', e => { const [x, y] = pt(e); let best = 1e18; corners.forEach(([a, b], i) => { const dd = (a - x) ** 2 + (b - y) ** 2; if (dd < best) { best = dd; drag = i; } }); cv.setPointerCapture(e.pointerId); });
  cv.addEventListener('pointermove', e => { if (drag < 0) return; const [x, y] = pt(e); corners[drag] = [Math.max(0, Math.min(src.width, x)), Math.max(0, Math.min(src.height, y))]; draw(); });
  cv.addEventListener('pointerup', () => drag = -1); cv.addEventListener('pointercancel', () => drag = -1);
  function stamp(canvas, when) { const o = document.createElement('canvas'); o.width = canvas.width; o.height = canvas.height;
    const g = o.getContext('2d'); g.drawImage(canvas, 0, 0);
    const txt = 'Captured ' + new Date(when).toLocaleString([], { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', second: '2-digit', timeZoneName: 'short' });
    const fs = Math.max(14, Math.round(o.width / 45)), pad = Math.round(fs * .5); g.font = `600 ${fs}px -apple-system, system-ui, sans-serif`;
    const tw = g.measureText(txt).width, x = o.width - tw - pad * 3, y = o.height - fs - pad * 3;
    g.fillStyle = 'rgba(0,0,0,.65)'; g.fillRect(x - pad, y - pad, tw + pad * 2, fs + pad * 2);
    g.fillStyle = '#fff'; g.textBaseline = 'top'; g.fillText(txt, x, y); return o; }
  async function save(raw) { const canvas = stamp(raw, capturedAt), blob = await toBlob(canvas), tc = document.createElement('canvas'), ts = 240 / canvas.width;
    tc.width = 240; tc.height = Math.max(1, Math.round(canvas.height * ts)); tc.getContext('2d').drawImage(canvas, 0, 0, tc.width, tc.height);
    await DB.addPage(current.id, blob, await toBlob(tc, 0.7), capturedAt); next(); }
  $('adjOriginal').onclick = () => save(src);
  $('adjSave').onclick = async () => { $('adjMsg').textContent = 'Straightening…'; await new Promise(r => setTimeout(r, 30));
    const w = Detect.warp(src.getContext('2d').getImageData(0, 0, src.width, src.height), C.orderCorners(corners), 2400, true), o = document.createElement('canvas');
    o.width = w.width; o.height = w.height; o.getContext('2d').putImageData(new ImageData(w.data, w.width, w.height), 0, 0); save(o); };
  $('adjCancel').onclick = () => { queue = []; openNotebook(current.id); };
  $('camInput').onchange = e => { onFiles(e.target.files); e.target.value = ''; };
  $('libInput').onchange = e => { onFiles(e.target.files); e.target.value = ''; };

  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
  setTimeout(() => CVDetect.loadCV(), 1500); // warm OpenCV in the background
  renderHome();
})();
