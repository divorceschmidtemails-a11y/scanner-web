// IndexedDB storage: notebooks {id,name,created,updated,pageCount}, pages {id,nb,order,blob,thumb}
(function (G) {
  let dbp;
  function open() { return dbp || (dbp = new Promise((res, rej) => { const r = indexedDB.open('scanner-web', 1);
    r.onupgradeneeded = () => { const d = r.result; d.createObjectStore('notebooks', { keyPath: 'id' });
      const p = d.createObjectStore('pages', { keyPath: 'id' }); p.createIndex('nb', 'nb'); };
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); })); }
  async function tx(stores, mode, fn) { const d = await open(); return new Promise((res, rej) => { const t = d.transaction(stores, mode); let out;
    Promise.resolve(fn(t)).then(v => out = v); t.oncomplete = () => res(out); t.onerror = t.onabort = () => rej(t.error); }); }
  const req = r => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  G.DB = {
    async updatePage(p) { await tx(["pages"], "readwrite", t => t.objectStore("pages").put(p)); },
    listNotebooks: () => tx(['notebooks'], 'readonly', t => req(t.objectStore('notebooks').getAll())).then(a => a.sort((x, y) => y.updated - x.updated)),
    getNotebook: id => tx(['notebooks'], 'readonly', t => req(t.objectStore('notebooks').get(id))),
    async createNotebook(name) { const nb = { id: uid(), name, created: Date.now(), updated: Date.now(), pageCount: 0 };
      await tx(['notebooks'], 'readwrite', t => t.objectStore('notebooks').put(nb)); return nb; },
    getPages: nb => tx(['pages'], 'readonly', t => req(t.objectStore('pages').index('nb').getAll(nb))).then(a => a.sort((x, y) => x.order - y.order)),
    async addPage(nbId, blob, thumb, created) { const p = { id: uid(), nb: nbId, order: Date.now() + Math.random(), created: created || Date.now(), blob, thumb };
      await tx(['pages', 'notebooks'], 'readwrite', async t => { t.objectStore('pages').put(p);
        const s = t.objectStore('notebooks'), nb = await req(s.get(nbId)); nb.pageCount++; nb.updated = Date.now(); s.put(nb); }); return p; },
    async deletePage(nbId, pageId) { await tx(['pages', 'notebooks'], 'readwrite', async t => { t.objectStore('pages').delete(pageId);
      const s = t.objectStore('notebooks'), nb = await req(s.get(nbId)); nb.pageCount = Math.max(0, nb.pageCount - 1); nb.updated = Date.now(); s.put(nb); }); },
    async deleteNotebook(nbId) { const pages = await G.DB.getPages(nbId);
      await tx(['pages', 'notebooks'], 'readwrite', t => { pages.forEach(p => t.objectStore('pages').delete(p.id)); t.objectStore('notebooks').delete(nbId); }); }
  };
})(self);
