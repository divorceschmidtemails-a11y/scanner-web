(function (G) {
  const blobToDataURL = b => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(b); });
  const dims = b => createImageBitmap(b).then(i => { const d = [i.width, i.height]; i.close && i.close(); return d; });
  async function buildPdf(scans) {
    const { jsPDF } = G.jspdf; let doc;
    for (const p of scans) { const [w, h] = await dims(p.blob), pw = 612, ph = pw * h / w, o = ph > pw ? 'p' : 'l';
      if (!doc) doc = new jsPDF({ unit: 'pt', format: [pw, ph], orientation: o, compress: true }); else doc.addPage([pw, ph], o);
      doc.addImage(await blobToDataURL(p.blob), 'JPEG', 0, 0, pw, ph, undefined, 'FAST'); }
    return doc.output('blob');
  }
  function download(blob, name) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000); }
  async function share(files, title) {
    if (navigator.canShare && navigator.canShare({ files })) { try { await navigator.share({ files, title }); return 'shared'; } catch (e) { if (e.name === 'AbortError') return 'cancelled'; } }
    files.forEach(f => download(f, f.name)); return 'downloaded';
  }
  G.Export = { buildPdf, download, share };
})(self);
