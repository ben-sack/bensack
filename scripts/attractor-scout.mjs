#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'

function mkRng(seed) {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6D2B79F5) >>> 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function parseIntArg(value, fallback) {
  if (value === undefined) return fallback
  const parsed = value.startsWith('0x') || value.startsWith('0X')
    ? Number.parseInt(value, 16)
    : Number.parseInt(value, 10)
  return Number.isFinite(parsed) ? parsed : fallback
}

function parseSeedArg(value, fallback) {
  if (value === undefined) return fallback
  const normalized = value.trim()
  const looksHex = /^[0-9a-fA-F]{6}$/.test(normalized)
  const parsed = looksHex || normalized.startsWith('0x') || normalized.startsWith('0X')
    ? Number.parseInt(normalized.replace(/^0x/i, ''), 16)
    : Number.parseInt(normalized, 10)
  return Number.isFinite(parsed) ? parsed : fallback
}

function parseArgs(argv) {
  const opts = {
    count: 500,
    shortlist: 60,
    baseSeed: 0xc0ffee,
    targetSeed: null,
    width: 160,
    height: 160,
    iterations: 180000,
    outDir: 'out/attractor-scout',
  }

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    const next = argv[i + 1]
    if (arg === '--count') opts.count = parseIntArg(next, opts.count)
    if (arg === '--shortlist') opts.shortlist = parseIntArg(next, opts.shortlist)
    if (arg === '--base-seed') opts.baseSeed = parseSeedArg(next, opts.baseSeed)
    if (arg === '--target-seed') opts.targetSeed = parseSeedArg(next, opts.targetSeed ?? 0)
    if (arg === '--width') opts.width = parseIntArg(next, opts.width)
    if (arg === '--height') opts.height = parseIntArg(next, opts.height)
    if (arg === '--iterations') opts.iterations = parseIntArg(next, opts.iterations)
    if (arg === '--out') opts.outDir = next || opts.outDir
  }

  opts.count = Math.max(1, opts.count)
  opts.shortlist = Math.max(1, Math.min(opts.shortlist, opts.count))
  opts.width = Math.max(48, opts.width)
  opts.height = Math.max(48, opts.height)
  opts.iterations = Math.max(20000, opts.iterations)
  return opts
}

function sampleSeeds(count, baseSeed) {
  const rng = mkRng(baseSeed)
  const seen = new Set()
  const seeds = []
  while (seeds.length < count) {
    const seed = Math.floor(rng() * 0x1000000)
    if (seen.has(seed)) continue
    seen.add(seed)
    seeds.push(seed)
  }
  return seeds
}

function analyzeSeed(seed, width, height, iterations) {
  const rng = mkRng(seed)
  const TYPES = ['clifford', 'dejong', 'svensson']
  const type = TYPES[Math.floor(rng() * TYPES.length)]
  const rv = (lo, hi) => lo + rng() * (hi - lo)

  let a
  let b
  let c
  let d

  if (type === 'clifford') {
    a = rv(-2, 2); b = rv(-2, 2); c = rv(-2, 2); d = rv(-2, 2)
  } else {
    a = rv(-3, 3); b = rv(-3, 3); c = rv(-3, 3); d = rv(-3, 3)
  }

  const iterate = (x, y) => {
    if (type === 'clifford') {
      return [Math.sin(a * y) + c * Math.cos(a * x), Math.sin(b * x) + d * Math.cos(b * y)]
    }
    if (type === 'dejong') {
      return [Math.sin(a * y) - Math.cos(b * x), Math.sin(c * x) - Math.cos(d * y)]
    }
    return [d * Math.sin(a * x) - Math.sin(b * y), c * Math.cos(a * x) + Math.cos(b * y)]
  }

  let x = rv(-0.2, 0.2)
  let y = rv(-0.2, 0.2)
  for (let i = 0; i < 300; i++) [x, y] = iterate(x, y)

  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity
  let wx = x
  let wy = y

  for (let i = 0; i < 5000; i++) {
    ;[wx, wy] = iterate(wx, wy)
    if (!Number.isFinite(wx) || !Number.isFinite(wy)) continue
    if (wx < minX) minX = wx
    if (wx > maxX) maxX = wx
    if (wy < minY) minY = wy
    if (wy > maxY) maxY = wy
  }

  if (!Number.isFinite(minX) || maxX - minX < 0.01 || maxY - minY < 0.01) {
    return { seed, valid: false, reason: 'collapsed' }
  }

  const padX = (maxX - minX) * 0.12
  const padY = (maxY - minY) * 0.12
  minX -= padX
  maxX += padX
  minY -= padY
  maxY += padY

  const hist = new Float32Array(width * height)
  let maxCount = 1
  let accepted = 0

  const toGX = (ax) => Math.round(((ax - minX) / (maxX - minX)) * (width - 1))
  const toGY = (ay) => Math.round(((ay - minY) / (maxY - minY)) * (height - 1))

  for (let i = 0; i < iterations; i++) {
    ;[x, y] = iterate(x, y)
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      x = 0.1
      y = 0.1
      continue
    }
    const gx = toGX(x)
    const gy = toGY(y)
    if (gx >= 0 && gx < width && gy >= 0 && gy < height) {
      const idx = gy * width + gx
      const next = ++hist[idx]
      if (next > maxCount) maxCount = next
      accepted++
    }
  }

  if (accepted < iterations * 0.35) {
    return { seed, valid: false, reason: 'sparse' }
  }

  const metrics = computeMetrics(hist, width, height, maxCount, accepted)
  const score = computeScore(metrics)

  return {
    seed,
    seedHex: seed.toString(16).padStart(6, '0'),
    valid: true,
    type,
    params: { a, b, c, d },
    score,
    metrics,
    signature: makeSignature(hist, width, height, maxCount),
  }
}

function computeMetrics(hist, width, height, maxCount, accepted) {
  let occupied = 0
  let edgeHits = 0
  let sumX = 0
  let sumY = 0
  let mass = 0
  let entropy = 0
  let minOccX = width
  let maxOccX = 0
  let minOccY = height
  let maxOccY = 0
  let rowTransitions = 0
  let colTransitions = 0
  const border = Math.max(2, Math.floor(Math.min(width, height) * 0.05))
  const logMax = Math.log(maxCount + 1)

  const density = new Float32Array(hist.length)

  for (let y = 0; y < height; y++) {
    let prevOn = false
    for (let x = 0; x < width; x++) {
      const idx = y * width + x
      const cnt = hist[idx]
      const on = cnt > 0
      if (on) {
        occupied++
        minOccX = Math.min(minOccX, x)
        maxOccX = Math.max(maxOccX, x)
        minOccY = Math.min(minOccY, y)
        maxOccY = Math.max(maxOccY, y)
        if (x < border || x >= width - border || y < border || y >= height - border) {
          edgeHits++
        }
      }

      const normalized = cnt === 0 ? 0 : Math.pow(Math.log(cnt + 1) / logMax, 0.55)
      density[idx] = normalized
      if (normalized > 0) {
        mass += normalized
        sumX += (x + 0.5) * normalized
        sumY += (y + 0.5) * normalized
      }

      if (cnt > 0) {
        const p = cnt / accepted
        entropy -= p * Math.log(p)
      }

      if (x > 0 && on !== prevOn) rowTransitions++
      prevOn = on
    }
  }

  for (let x = 0; x < width; x++) {
    let prevOn = false
    for (let y = 0; y < height; y++) {
      const on = hist[y * width + x] > 0
      if (y > 0 && on !== prevOn) colTransitions++
      prevOn = on
    }
  }

  const occupiedRatio = occupied / hist.length
  const bboxWidth = occupied ? maxOccX - minOccX + 1 : 0
  const bboxHeight = occupied ? maxOccY - minOccY + 1 : 0
  const bboxArea = occupied ? (bboxWidth * bboxHeight) / hist.length : 0
  const entropyNorm = occupied > 1 ? entropy / Math.log(occupied) : 0
  const edgeRatio = occupied ? edgeHits / occupied : 1

  const cx = mass ? sumX / mass : width / 2
  const cy = mass ? sumY / mass : height / 2
  const dx = (cx - width / 2) / (width / 2)
  const dy = (cy - height / 2) / (height / 2)
  const centerBias = Math.max(0, 1 - Math.sqrt(dx * dx + dy * dy))

  let verticalDiff = 0
  let horizontalDiff = 0
  let verticalMass = 0
  let horizontalMass = 0

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const v = density[y * width + x]
      const mv = density[y * width + (width - 1 - x)]
      const mh = density[(height - 1 - y) * width + x]
      verticalDiff += Math.abs(v - mv)
      horizontalDiff += Math.abs(v - mh)
      verticalMass += v + mv
      horizontalMass += v + mh
    }
  }

  const verticalSymmetry = verticalMass ? 1 - verticalDiff / verticalMass : 0
  const horizontalSymmetry = horizontalMass ? 1 - horizontalDiff / horizontalMass : 0
  const transitionRatio = (rowTransitions + colTransitions) / Math.max(1, width * height)
  const peakRatio = maxCount / accepted

  return {
    accepted,
    occupiedRatio,
    bboxArea,
    entropy: entropyNorm,
    edgeRatio,
    centerBias,
    verticalSymmetry,
    horizontalSymmetry,
    transitionRatio,
    peakRatio,
  }
}

function computeScore(metrics) {
  const occupancyFit = 1 - Math.min(1, Math.abs(metrics.occupiedRatio - 0.13) / 0.13)
  const areaFit = 1 - Math.min(1, Math.abs(metrics.bboxArea - 0.4) / 0.4)
  const symmetry = Math.max(metrics.verticalSymmetry, metrics.horizontalSymmetry)
  const antiPeak = 1 - Math.min(1, metrics.peakRatio * 18)
  return (
    metrics.entropy * 0.22 +
    occupancyFit * 0.18 +
    areaFit * 0.16 +
    (1 - metrics.edgeRatio) * 0.12 +
    metrics.centerBias * 0.12 +
    metrics.transitionRatio * 0.08 +
    symmetry * 0.06 +
    antiPeak * 0.06
  )
}

function makeSignature(hist, width, height, maxCount) {
  const sw = 16
  const sh = 16
  const sig = []
  const logMax = Math.log(maxCount + 1)

  for (let sy = 0; sy < sh; sy++) {
    const y0 = Math.floor((sy * height) / sh)
    const y1 = Math.floor(((sy + 1) * height) / sh)
    for (let sx = 0; sx < sw; sx++) {
      const x0 = Math.floor((sx * width) / sw)
      const x1 = Math.floor(((sx + 1) * width) / sw)
      let sum = 0
      let count = 0
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          const v = hist[y * width + x]
          sum += v === 0 ? 0 : Math.pow(Math.log(v + 1) / logMax, 0.55)
          count++
        }
      }
      sig.push(count ? sum / count : 0)
    }
  }

  return sig
}

function signatureDistance(a, b) {
  let sum = 0
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i]
    sum += d * d
  }
  return Math.sqrt(sum / a.length)
}

function buildShortlist(candidates, count) {
  const sorted = [...candidates].sort((a, b) => b.score - a.score)
  const chosen = []
  let threshold = 0.11

  while (chosen.length < count && threshold >= 0.03) {
    chosen.length = 0
    for (const candidate of sorted) {
      const minDist = chosen.length === 0
        ? Infinity
        : Math.min(...chosen.map((item) => signatureDistance(item.signature, candidate.signature)))
      if (minDist >= threshold) {
        chosen.push({ ...candidate, novelty: Number.isFinite(minDist) ? minDist : 1 })
      }
      if (chosen.length >= count) break
    }
    threshold -= 0.015
  }

  if (chosen.length < count) {
    for (const candidate of sorted) {
      if (chosen.some((item) => item.seed === candidate.seed)) continue
      const minDist = chosen.length === 0
        ? Infinity
        : Math.min(...chosen.map((item) => signatureDistance(item.signature, candidate.signature)))
      chosen.push({ ...candidate, novelty: Number.isFinite(minDist) ? minDist : 1 })
      if (chosen.length >= count) break
    }
  }

  return chosen
    .map((candidate, index) => ({ ...candidate, rank: index + 1 }))
    .sort((a, b) => (b.score + b.novelty * 0.35) - (a.score + a.novelty * 0.35))
    .map((candidate, index) => ({ ...candidate, rank: index + 1 }))
}

function toSerializableCandidate(candidate) {
  return {
    seed: candidate.seed,
    seedHex: candidate.seedHex,
    type: candidate.type,
    score: Number(candidate.score.toFixed(4)),
    metrics: Object.fromEntries(
      Object.entries(candidate.metrics).map(([key, value]) => [key, Number(value.toFixed(4))]),
    ),
    params: Object.fromEntries(
      Object.entries(candidate.params).map(([key, value]) => [key, Number(value.toFixed(4))]),
    ),
    novelty: candidate.novelty === undefined ? undefined : Number(candidate.novelty.toFixed(4)),
    similarity: candidate.similarity === undefined ? undefined : Number(candidate.similarity.toFixed(4)),
    distanceToTarget: candidate.distanceToTarget === undefined ? undefined : Number(candidate.distanceToTarget.toFixed(4)),
    rank: candidate.rank,
  }
}

function makeHtml({ generatedAt, options, summary, shortlist, candidates }) {
  const payload = JSON.stringify({
    generatedAt,
    options,
    summary,
    shortlist,
    candidates,
  })

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Strange Attractor Scout</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #f4f1ea;
      --panel: #fbfaf7;
      --line: rgba(25, 25, 25, 0.14);
      --text: #171717;
      --muted: rgba(23, 23, 23, 0.62);
      --accent: #202020;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
      background: linear-gradient(180deg, #f8f6f1 0%, var(--bg) 100%);
      color: var(--text);
    }
    .wrap {
      max-width: 1480px;
      margin: 0 auto;
      padding: 32px 20px 56px;
    }
    h1, h2, p { margin: 0; }
    .top {
      display: grid;
      gap: 16px;
      margin-bottom: 28px;
    }
    .meta {
      color: var(--muted);
      font-size: 12px;
      line-height: 1.6;
    }
    .summary {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-top: 8px;
    }
    .chip {
      border: 1px solid var(--line);
      border-radius: 999px;
      padding: 8px 10px;
      font-size: 12px;
      background: rgba(255, 255, 255, 0.55);
    }
    .section {
      margin-top: 28px;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 14px;
      margin-top: 14px;
    }
    .card {
      border: 1px solid var(--line);
      background: rgba(255, 255, 255, 0.72);
      border-radius: 18px;
      padding: 12px;
      backdrop-filter: blur(8px);
    }
    canvas {
      display: block;
      width: 100%;
      aspect-ratio: 1 / 1;
      border-radius: 12px;
      background: #f3f3f3;
      border: 1px solid rgba(0, 0, 0, 0.06);
    }
    .seed {
      margin-top: 10px;
      font-size: 13px;
      display: flex;
      justify-content: space-between;
      gap: 8px;
    }
    .sub {
      margin-top: 6px;
      color: var(--muted);
      font-size: 11px;
      line-height: 1.6;
    }
    .controls {
      display: flex;
      gap: 8px;
      margin-top: 8px;
      flex-wrap: wrap;
    }
    button {
      border: 1px solid var(--line);
      background: rgba(255, 255, 255, 0.82);
      border-radius: 999px;
      padding: 8px 10px;
      font: inherit;
      font-size: 12px;
      cursor: pointer;
    }
    button.active {
      background: var(--accent);
      color: white;
      border-color: var(--accent);
    }
    .hidden { display: none; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="top">
      <div>
        <h1>strange-attractor scout</h1>
        <p class="meta">generated ${generatedAt} · ${summary.validCount}/${summary.totalCount} valid seeds · shortlist ${summary.shortlistCount}</p>
      </div>
      <div class="summary">
        <div class="chip">base seed ${summary.baseSeedHex}</div>
        <div class="chip">sample size ${summary.totalCount}</div>
        <div class="chip">iterations ${summary.iterations}</div>
        <div class="chip">grid ${summary.width}×${summary.height}</div>
        <div class="chip">types ${summary.typeBreakdown}</div>
      </div>
      <div class="controls" id="filters"></div>
    </div>

    <section class="section">
      <h2>shortlist</h2>
      <div class="grid" id="shortlist"></div>
    </section>

    <section class="section">
      <h2>all valid candidates</h2>
      <div class="grid" id="all"></div>
    </section>
  </div>

  <script>
    const data = ${payload};

    function mkRng(seed) {
      let s = seed >>> 0;
      return () => {
        s = (s + 0x6D2B79F5) >>> 0;
        let t = Math.imul(s ^ (s >>> 15), 1 | s);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    }

    function renderAttractor(canvas, seed) {
      const ctx = canvas.getContext('2d');
      const W = canvas.width = 220;
      const H = canvas.height = 220;
      const rng = mkRng(seed);
      const types = ['clifford', 'dejong', 'svensson'];
      const type = types[Math.floor(rng() * types.length)];
      const rv = (lo, hi) => lo + rng() * (hi - lo);
      let a, b, c, d;
      if (type === 'clifford') {
        a = rv(-2, 2); b = rv(-2, 2); c = rv(-2, 2); d = rv(-2, 2);
      } else {
        a = rv(-3, 3); b = rv(-3, 3); c = rv(-3, 3); d = rv(-3, 3);
      }
      const iterate = (x, y) => {
        if (type === 'clifford') return [Math.sin(a * y) + c * Math.cos(a * x), Math.sin(b * x) + d * Math.cos(b * y)];
        if (type === 'dejong') return [Math.sin(a * y) - Math.cos(b * x), Math.sin(c * x) - Math.cos(d * y)];
        return [d * Math.sin(a * x) - Math.sin(b * y), c * Math.cos(a * x) + Math.cos(b * y)];
      };

      let x = rv(-0.2, 0.2), y = rv(-0.2, 0.2);
      for (let i = 0; i < 300; i++) [x, y] = iterate(x, y);

      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      let wx = x, wy = y;
      for (let i = 0; i < 5000; i++) {
        [wx, wy] = iterate(wx, wy);
        if (!Number.isFinite(wx) || !Number.isFinite(wy)) continue;
        if (wx < minX) minX = wx;
        if (wx > maxX) maxX = wx;
        if (wy < minY) minY = wy;
        if (wy > maxY) maxY = wy;
      }

      if (!Number.isFinite(minX) || maxX - minX < 0.01 || maxY - minY < 0.01) {
        ctx.fillStyle = '#f3f3f3';
        ctx.fillRect(0, 0, W, H);
        return type;
      }

      const padX = (maxX - minX) * 0.12;
      const padY = (maxY - minY) * 0.12;
      minX -= padX; maxX += padX; minY -= padY; maxY += padY;

      const gW = 180;
      const gH = 180;
      const hist = new Float32Array(gW * gH);
      let maxCount = 1;
      const toGX = (ax) => Math.round(((ax - minX) / (maxX - minX)) * (gW - 1));
      const toGY = (ay) => Math.round(((ay - minY) / (maxY - minY)) * (gH - 1));

      for (let i = 0; i < 140000; i++) {
        [x, y] = iterate(x, y);
        if (!Number.isFinite(x) || !Number.isFinite(y)) {
          x = 0.1; y = 0.1;
          continue;
        }
        const gx = toGX(x);
        const gy = toGY(y);
        if (gx >= 0 && gx < gW && gy >= 0 && gy < gH) {
          const idx = gy * gW + gx;
          const next = ++hist[idx];
          if (next > maxCount) maxCount = next;
        }
      }

      const img = ctx.createImageData(gW, gH);
      const logMax = Math.log(maxCount + 1);
      for (let i = 0; i < hist.length; i++) {
        const cnt = hist[i];
        const j = i * 4;
        let v = 243;
        if (cnt > 0) {
          const t = Math.pow(Math.log(cnt + 1) / logMax, 0.55);
          v = Math.round(243 - t * (243 - 10));
        }
        img.data[j] = v;
        img.data[j + 1] = v;
        img.data[j + 2] = v;
        img.data[j + 3] = 255;
      }

      const off = document.createElement('canvas');
      off.width = gW;
      off.height = gH;
      off.getContext('2d').putImageData(img, 0, 0);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(off, 0, 0, W, H);
      return type;
    }

    function card(candidate) {
      const el = document.createElement('article');
      el.className = 'card';
      el.dataset.type = candidate.type;
      el.innerHTML = \`
        <canvas></canvas>
        <div class="seed">
          <span>\${candidate.seedHex}</span>
          <span>#\${candidate.rank ?? '-'}</span>
        </div>
        <div class="sub">
          <div>\${candidate.type} · score \${candidate.score.toFixed(4)}</div>
          <div>entropy \${candidate.metrics.entropy.toFixed(3)} · bbox \${candidate.metrics.bboxArea.toFixed(3)} · occ \${candidate.metrics.occupiedRatio.toFixed(3)}</div>
          \${candidate.novelty !== undefined ? \`<div>novelty \${candidate.novelty.toFixed(3)}</div>\` : ''}
        </div>
      \`;

      const canvas = el.querySelector('canvas');
      const render = () => {
        if (canvas.dataset.ready === '1') return;
        canvas.dataset.ready = '1';
        renderAttractor(canvas, candidate.seed);
      };

      const io = new IntersectionObserver((entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            render();
            io.disconnect();
          }
        }
      }, { rootMargin: '250px' });
      io.observe(el);

      return el;
    }

    const shortlistRoot = document.getElementById('shortlist');
    const allRoot = document.getElementById('all');
    const filtersRoot = document.getElementById('filters');
    const allTypes = ['all', ...new Set(data.candidates.map((item) => item.type))];
    let activeType = 'all';

    function renderFilters() {
      filtersRoot.innerHTML = '';
      for (const type of allTypes) {
        const btn = document.createElement('button');
        btn.textContent = type;
        btn.className = activeType === type ? 'active' : '';
        btn.onclick = () => {
          activeType = type;
          renderFilters();
          applyFilter();
        };
        filtersRoot.appendChild(btn);
      }
    }

    function applyFilter() {
      for (const node of document.querySelectorAll('.card')) {
        node.classList.toggle('hidden', activeType !== 'all' && node.dataset.type !== activeType);
      }
    }

    data.shortlist.forEach((item) => shortlistRoot.appendChild(card(item)));
    data.candidates.forEach((item) => allRoot.appendChild(card(item)));
    renderFilters();
    applyFilter();
  </script>
</body>
</html>`
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  const outDir = path.resolve(process.cwd(), options.outDir)
  await fs.mkdir(outDir, { recursive: true })

  const seeds = sampleSeeds(options.count, options.baseSeed)
  const analyzed = []

  for (let i = 0; i < seeds.length; i++) {
    const result = analyzeSeed(seeds[i], options.width, options.height, options.iterations)
    analyzed.push(result)
    if ((i + 1) % 50 === 0 || i === seeds.length - 1) {
      process.stdout.write(`processed ${i + 1}/${seeds.length}\n`)
    }
  }

  const valid = analyzed.filter((item) => item.valid)
  const shortlist = buildShortlist(valid, Math.min(options.shortlist, valid.length))
  const target = options.targetSeed === null
    ? null
    : valid.find((item) => item.seed === options.targetSeed) ?? analyzeSeed(
      options.targetSeed,
      options.width,
      options.height,
      options.iterations,
    )
  const sortedValid = [...valid]
    .sort((a, b) => b.score - a.score)
    .map((candidate, index) => ({ ...candidate, rank: index + 1 }))
  const targetMatches = target && target.valid
    ? [...valid]
      .filter((item) => item.seed !== target.seed)
      .map((item) => {
        const distanceToTarget = signatureDistance(item.signature, target.signature)
        const metricDelta = Math.abs(item.metrics.occupiedRatio - target.metrics.occupiedRatio)
          + Math.abs(item.metrics.bboxArea - target.metrics.bboxArea)
          + Math.abs(item.metrics.entropy - target.metrics.entropy)
          + Math.abs(item.metrics.transitionRatio - target.metrics.transitionRatio)
        const typeBonus = item.type === target.type ? 0.04 : 0
        const similarity = Math.max(
          0,
          1 - distanceToTarget * 2.6 - metricDelta * 0.55 + typeBonus,
        )
        return { ...item, distanceToTarget, similarity }
      })
      .sort((a, b) => {
        const aRank = a.similarity * 0.72 + a.score * 0.28
        const bRank = b.similarity * 0.72 + b.score * 0.28
        return bRank - aRank
      })
      .slice(0, Math.min(options.shortlist, valid.length))
      .map((candidate, index) => ({ ...candidate, rank: index + 1 }))
    : []

  const typeCounts = valid.reduce((acc, item) => {
    acc[item.type] = (acc[item.type] || 0) + 1
    return acc
  }, {})

  const summary = {
    totalCount: analyzed.length,
    validCount: valid.length,
    shortlistCount: shortlist.length,
    targetSeedHex: target && target.valid ? target.seedHex : null,
    baseSeedHex: options.baseSeed.toString(16).padStart(6, '0'),
    iterations: options.iterations,
    width: options.width,
    height: options.height,
    typeBreakdown: Object.entries(typeCounts).map(([key, value]) => `${key}:${value}`).join(' · '),
  }

  const generatedAt = new Date().toISOString()
  const serializableShortlist = shortlist.map(toSerializableCandidate)
  const serializableCandidates = sortedValid.map(toSerializableCandidate)
  const serializableTarget = target && target.valid ? toSerializableCandidate(target) : null
  const serializableTargetMatches = targetMatches.map(toSerializableCandidate)
  const report = {
    generatedAt,
    options,
    summary,
    target: serializableTarget,
    targetMatches: serializableTargetMatches,
    shortlist: serializableShortlist,
    candidates: serializableCandidates,
    rejected: analyzed.filter((item) => !item.valid),
  }

  await fs.writeFile(path.join(outDir, 'report.json'), JSON.stringify(report, null, 2))
  await fs.writeFile(path.join(outDir, 'shortlist.txt'), serializableShortlist.map((item) => item.seedHex).join('\n') + '\n')
  if (serializableTargetMatches.length > 0) {
    await fs.writeFile(
      path.join(outDir, 'target-matches.txt'),
      serializableTargetMatches.map((item) => item.seedHex).join('\n') + '\n',
    )
  }
  await fs.writeFile(path.join(outDir, 'index.html'), makeHtml({
    generatedAt,
    options,
    summary,
    shortlist: serializableShortlist,
    candidates: serializableCandidates,
  }))

  process.stdout.write(`wrote report to ${path.join(outDir, 'index.html')}\n`)
  process.stdout.write(`top seeds: ${serializableShortlist.slice(0, 12).map((item) => item.seedHex).join(', ')}\n`)
  if (serializableTargetMatches.length > 0) {
    process.stdout.write(`closest to ${serializableTarget.seedHex}: ${serializableTargetMatches.slice(0, 12).map((item) => item.seedHex).join(', ')}\n`)
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
