import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9333;
const URL = 'http://localhost:3000/play';
const OUTDIR = '/Users/ben.sack/Workspace/GitHub/bensack/.torus-screens';
mkdirSync(OUTDIR, { recursive: true });

const chrome = spawn(CHROME, [
  '--headless=new',
  `--remote-debugging-port=${PORT}`,
  '--no-first-run',
  '--no-default-browser-check',
  '--disable-gpu',
  '--hide-scrollbars',
  '--user-data-dir=/tmp/cdp-torus-profile',
  'about:blank',
], { stdio: 'ignore' });

const cleanup = () => { try { chrome.kill('SIGKILL'); } catch {} };
process.on('exit', cleanup);

async function getWsUrl() {
  for (let i = 0; i < 50; i++) {
    try {
      const r = await fetch(`http://localhost:${PORT}/json/version`);
      const j = await r.json();
      if (j.webSocketDebuggerUrl) return j.webSocketDebuggerUrl;
    } catch {}
    await sleep(200);
  }
  throw new Error('Chrome did not expose debugger');
}

const wsUrl = await getWsUrl();
const ws = new WebSocket(wsUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });

let msgId = 0;
const pending = new Map();
const consoleLogs = [];
let sessionId = null;

ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) {
    const { res, rej } = pending.get(m.id);
    pending.delete(m.id);
    if (m.error) rej(new Error(JSON.stringify(m.error)));
    else res(m.result);
  } else if (m.method === 'Runtime.consoleAPICalled') {
    const args = (m.params.args || []).map(a => a.value ?? a.description ?? JSON.stringify(a.preview ?? '')).join(' ');
    consoleLogs.push(`[${m.params.type}] ${args}`);
  } else if (m.method === 'Runtime.exceptionThrown') {
    const e = m.params.exceptionDetails;
    consoleLogs.push(`[exception] ${e.exception?.description || e.text}`);
  } else if (m.method === 'Log.entryAdded') {
    const e = m.params.entry;
    consoleLogs.push(`[log.${e.level}] ${e.text}`);
  }
};

function send(method, params = {}, useSession = true) {
  const id = ++msgId;
  const payload = { id, method, params };
  if (useSession && sessionId) payload.sessionId = sessionId;
  return new Promise((res, rej) => {
    pending.set(id, { res, rej });
    ws.send(JSON.stringify(payload));
  });
}

// Create a target/tab and attach
const { targetId } = await send('Target.createTarget', { url: 'about:blank' }, false);
const att = await send('Target.attachToTarget', { targetId, flatten: true }, false);
sessionId = att.sessionId;

await send('Page.enable');
await send('Runtime.enable');
await send('Log.enable');

async function setSize(w, h) {
  await send('Emulation.setDeviceMetricsOverride', {
    width: w, height: h, deviceScaleFactor: 1, mobile: false,
  });
}

async function navigate() {
  await send('Page.navigate', { url: URL });
  // wait for load event
  await sleep(1500);
}

async function shot(path) {
  const { data } = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(path, Buffer.from(data, 'base64'));
  return path;
}

const results = {};

// Desktop 1200x800
await setSize(1200, 800);
await navigate();
await sleep(1000);
results.desktop1 = await shot(`${OUTDIR}/menu-desktop-1.png`);
await sleep(1200);
results.desktop2 = await shot(`${OUTDIR}/menu-desktop-2.png`);

// Mobile 390x844
await setSize(390, 844);
await navigate();
await sleep(1200);
results.mobile = await shot(`${OUTDIR}/menu-mobile.png`);

// Inspect DOM for canvas / torus element
const inspect = await send('Runtime.evaluate', {
  expression: `(() => {
    const out = {};
    const canvases = [...document.querySelectorAll('canvas')];
    out.canvasCount = canvases.length;
    out.canvases = canvases.map(c => {
      const r = c.getBoundingClientRect();
      return { w: c.width, h: c.height, rect: {x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height)}, style: c.getAttribute('style')||'' };
    });
    const titleEl = [...document.querySelectorAll('*')].find(e => e.children.length===0 && /buddy run/i.test(e.textContent||''));
    if (titleEl) { const r = titleEl.getBoundingClientRect(); out.title = { text: titleEl.textContent.trim().slice(0,40), rect: {x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height)} }; }
    // look for pre / ascii torus
    const pres = [...document.querySelectorAll('pre')];
    out.preCount = pres.length;
    out.pres = pres.slice(0,3).map(p => { const r=p.getBoundingClientRect(); return {rect:{x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height)}, sample:(p.textContent||'').slice(0,60)}; });
    out.bodyText = (document.body.innerText||'').slice(0,200);
    return out;
  })()`,
  returnByValue: true,
}, true);

results.inspect = inspect.result.value;
results.console = consoleLogs;

console.log(JSON.stringify(results, null, 2));

ws.close();
cleanup();
process.exit(0);
