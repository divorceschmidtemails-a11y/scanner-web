// Corner detection: OpenCV.js + jscanify when loaded, else pure-JS Detect.detectQuad. Returns pixel corners TL,TR,BR,BL or null.
(function (G) {
  let cvReady = null;
  function loadCV() {
    if (cvReady) return cvReady;
    cvReady = new Promise(res => { const s = document.createElement('script'); s.src = 'vendor/opencv.js'; s.async = true;
      s.onload = () => { const done = () => res(true); if (G.cv && G.cv.Mat) done(); else if (G.cv) G.cv.onRuntimeInitialized = done; else res(false); };
      s.onerror = () => res(false); document.head.appendChild(s); setTimeout(() => res(!!(G.cv && G.cv.Mat)), 20000); });
    return cvReady;
  }
  async function detect(canvas) {
    const W = canvas.width, H = canvas.height;
    try { if (await loadCV() && G.jscanify) {
      const sc = new G.jscanify(), mat = G.cv.imread(canvas), cnt = sc.findPaperContour(mat);
      let out = null;
      if (cnt) { const area = G.cv.contourArea(cnt), p = sc.getCornerPoints(cnt, mat);
        if (area > W * H * 0.1 && p.topLeftCorner && p.topRightCorner && p.bottomRightCorner && p.bottomLeftCorner)
          out = [p.topLeftCorner, p.topRightCorner, p.bottomRightCorner, p.bottomLeftCorner].map(q => [q.x, q.y]); }
      mat.delete(); if (out) return { corners: out, engine: 'opencv' }; } } catch (e) { console.warn('cv detect failed', e); }
    const q = G.Detect.detectQuad(canvas.getContext('2d').getImageData(0, 0, W, H));
    return q ? { corners: q.corners.map(([x, y]) => [x * W, y * H]), engine: 'js' } : null;
  }
  G.CVDetect = { detect, loadCV };
})(self);
