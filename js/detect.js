// Lightweight page (quad) detector + perspective warp. Pure JS, no dependencies. MIT (same as app).
(function (G) {
  function gray(img, W) { // img: {data,width,height}; downsample to width W
    const s = img.width / W, H = Math.max(1, Math.round(img.height / s)), g = new Uint8Array(W * H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = (Math.min(img.height - 1, Math.floor(y * s)) * img.width + Math.min(img.width - 1, Math.floor(x * s))) * 4;
      g[y * W + x] = (img.data[i] * 77 + img.data[i + 1] * 150 + img.data[i + 2] * 29) >> 8;
    }
    return { g, W, H };
  }
  function otsu(g) {
    const h = new Array(256).fill(0); for (const v of g) h[v]++;
    let sum = 0; for (let i = 0; i < 256; i++) sum += i * h[i];
    let sB = 0, wB = 0, best = 0, t = 128;
    for (let i = 0; i < 256; i++) { wB += h[i]; if (!wB) continue; const wF = g.length - wB; if (!wF) break;
      sB += i * h[i]; const mB = sB / wB, mF = (sum - sB) / wF, v = wB * wF * (mB - mF) ** 2; if (v > best) { best = v; t = i; } }
    return t;
  }
  // Returns {corners:[[x,y]x4 normalized 0..1 TL,TR,BR,BL], score} or null
  function detectQuad(img) {
    const { g, W, H } = gray(img, 160), t = otsu(g), N = W * H;
    const lab = new Int32Array(N), stack = new Int32Array(N); let bestPix = null, bestN = 0, id = 0;
    for (let p = 0; p < N; p++) {
      if (lab[p] || g[p] <= t) continue; id++; let sp = 0, n = 0; stack[sp++] = p; lab[p] = id; const pix = [];
      while (sp) { const q = stack[--sp]; pix.push(q); n++; const x = q % W, y = (q / W) | 0;
        if (x > 0 && !lab[q - 1] && g[q - 1] > t) { lab[q - 1] = id; stack[sp++] = q - 1; }
        if (x < W - 1 && !lab[q + 1] && g[q + 1] > t) { lab[q + 1] = id; stack[sp++] = q + 1; }
        if (y > 0 && !lab[q - W] && g[q - W] > t) { lab[q - W] = id; stack[sp++] = q - W; }
        if (y < H - 1 && !lab[q + W] && g[q + W] > t) { lab[q + W] = id; stack[sp++] = q + W; } }
      if (n > bestN) { bestN = n; bestPix = pix; }
    }
    if (!bestPix || bestN < N * 0.12 || bestN > N * 0.97) return null;
    let tl, tr, br, bl, a = 1e9, b = -1e9, c = -1e9, d = -1e9;
    for (const q of bestPix) { const x = q % W, y = (q / W) | 0;
      if (x + y < a) { a = x + y; tl = [x, y]; } if (x - y > b) { b = x - y; tr = [x, y]; }
      if (x + y > c) { c = x + y; br = [x, y]; } if (y - x > d) { d = y - x; bl = [x, y]; } }
    const pts = [tl, tr, br, bl], area = polyArea(pts), rect = bestN / Math.max(1, area);
    if (area < N * 0.12 || rect < 0.82 || rect > 1.2) return null;
    return { corners: pts.map(([x, y]) => [(x + 0.5) / W, (y + 0.5) / H]), score: rect };
  }
  function polyArea(p) { let s = 0; for (let i = 0; i < 4; i++) { const [x1, y1] = p[i], [x2, y2] = p[(i + 1) % 4]; s += x1 * y2 - x2 * y1; } return Math.abs(s) / 2; }
  // Homography mapping unit square (u,v) -> quad
  function squareToQuad(q) {
    const [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] = q, dx1 = x1 - x2, dx2 = x3 - x2, dy1 = y1 - y2, dy2 = y3 - y2,
      sx = x0 - x1 + x2 - x3, sy = y0 - y1 + y2 - y3, den = dx1 * dy2 - dx2 * dy1;
    const g = (sx * dy2 - dx2 * sy) / den, h = (dx1 * sy - sx * dy1) / den;
    return [x1 - x0 + g * x1, x3 - x0 + h * x3, x0, y1 - y0 + g * y1, y3 - y0 + h * y3, y0, g, h];
  }
  // src: ImageData-like; corners in pixel coords TL,TR,BR,BL. Returns {data,width,height}
  function warp(src, corners, maxSide, contrast) {
    const dist = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]);
    let w = Math.max(dist(corners[0], corners[1]), dist(corners[3], corners[2])),
      h = Math.max(dist(corners[0], corners[3]), dist(corners[1], corners[2]));
    const k = Math.min(1, (maxSide || 2000) / Math.max(w, h)); w = Math.max(1, Math.round(w * k)); h = Math.max(1, Math.round(h * k));
    const [A, B, C, D, E, F, Gg, Hh] = squareToQuad(corners), out = new Uint8ClampedArray(w * h * 4), sd = src.data, SW = src.width, SH = src.height;
    for (let y = 0; y < h; y++) { const v = (y + 0.5) / h; for (let x = 0; x < w; x++) { const u = (x + 0.5) / w, z = Gg * u + Hh * v + 1;
      let sx = (A * u + B * v + C) / z - 0.5, sy = (D * u + E * v + F) / z - 0.5;
      sx = Math.max(0, Math.min(SW - 1.001, sx)); sy = Math.max(0, Math.min(SH - 1.001, sy));
      const ix = sx | 0, iy = sy | 0, fx = sx - ix, fy = sy - iy, i00 = (iy * SW + ix) * 4, i10 = i00 + 4, i01 = i00 + SW * 4, i11 = i01 + 4, o = (y * w + x) * 4;
      for (let c = 0; c < 3; c++) out[o + c] = (sd[i00 + c] * (1 - fx) + sd[i10 + c] * fx) * (1 - fy) + (sd[i01 + c] * (1 - fx) + sd[i11 + c] * fx) * fy;
      out[o + 3] = 255; } }
    if (contrast !== false) stretch(out);
    return { data: out, width: w, height: h };
  }
  function stretch(d) { // mild contrast: map 2nd..98th percentile luminance to 0..255, blended 60%
    const h = new Array(256).fill(0), n = d.length / 4; for (let i = 0; i < d.length; i += 4) h[(d[i] + d[i + 1] + d[i + 2]) / 3 | 0]++;
    let lo = 0, hi = 255, acc = 0; for (; lo < 255; lo++) { acc += h[lo]; if (acc > n * 0.02) break; }
    acc = 0; for (; hi > 0; hi--) { acc += h[hi]; if (acc > n * 0.02) break; }
    if (hi - lo < 20) return; const s = 255 / (hi - lo);
    for (let i = 0; i < d.length; i += 4) for (let c = 0; c < 3; c++) d[i + c] = d[i + c] * 0.4 + ((d[i + c] - lo) * s) * 0.6;
  }
  function signature(img) { return gray(img, 24).g; }
  function sigDiff(a, b) { if (!a || !b || a.length !== b.length) return 255; let s = 0; for (let i = 0; i < a.length; i++) s += Math.abs(a[i] - b[i]); return s / a.length; }
  function quadMove(a, b) { if (!a || !b) return 1; let m = 0; for (let i = 0; i < 4; i++) m = Math.max(m, Math.hypot(a[i][0] - b[i][0], a[i][1] - b[i][1])); return m; }
  G.Detect = { detectQuad, warp, signature, sigDiff, quadMove };
  if (typeof module !== 'undefined') module.exports = G.Detect;
})(typeof self !== 'undefined' ? self : globalThis);
