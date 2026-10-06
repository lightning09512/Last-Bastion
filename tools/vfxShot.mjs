// Temporary: render the three VFX gallery rows at full 1280×720 and write raw
// PNGs through the Chrome DevTools protocol (no downscaling of the art).
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';

const PORT = 9333;
const URL = process.argv[2] ?? 'http://localhost:4184/tools/vfxTest.html?freeze=1';
const OUT_DIR = process.argv[3] ?? 'shots/vfx';
const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
  '--headless=new', '--disable-gpu', '--no-sandbox', '--hide-scrollbars',
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${process.env.TEMP}\\dsh-cdp-vfx`,
  '--window-size=1280,720', 'about:blank',
], { stdio: 'ignore' });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitForDevTools() {
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/version`);
      if (res.ok) return await res.json();
    } catch { /* not up */ }
    await sleep(250);
  }
  throw new Error('DevTools never came up');
}

function connect(wsUrl) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    let id = 0;
    const pending = new Map();
    ws.addEventListener('message', (e) => {
      const msg = JSON.parse(e.data);
      if (msg.id && pending.has(msg.id)) {
        const { resolve: res, reject: rej } = pending.get(msg.id);
        pending.delete(msg.id);
        if (msg.error) rej(new Error(JSON.stringify(msg.error)));
        else res(msg.result);
      }
    });
    ws.addEventListener('error', reject);
    ws.addEventListener('open', () => resolve({
      send(method, params = {}) {
        return new Promise((res, rej) => {
          const msgId = ++id;
          pending.set(msgId, { resolve: res, reject: rej });
          ws.send(JSON.stringify({ id: msgId, method, params }));
        });
      },
      close: () => ws.close(),
    }));
  });
}

const ROWS = [
  ['arrowImpact', 'magicImpact', 'bloodSpray', 'explosion', 'frostBurst', 'lightning'],
  ['coinPop', 'healGlow', 'shieldBreak', 'stunStars', 'spawnPuff', 'poisonCloud'],
  ['dust', 'debris', 'shockwave', 'smokePuff', 'fireLick', 'holySmite'],
];

const sleep2 = (ms) => new Promise((r) => setTimeout(r, ms));
void sleep2;

try {
  const v = await waitForDevTools();
  console.log(`DevTools: ${v.Browser}`);
  const targets = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
  const page = targets.find((t) => t.type === 'page');
  const cdp = await connect(page.webSocketDebuggerUrl);
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Page.navigate', { url: URL });
  await sleep(4500);

  mkdirSync(OUT_DIR, { recursive: true });
  const frames = Number(process.argv[4] ?? 22);

  for (let r = 0; r < ROWS.length; r++) {
    const row = ROWS[r];
    const expr = `(() => {
      window.__vfxClear();
      const row = ${JSON.stringify(row)};
      for (let i = 0; i < row.length; i++) {
        window.__vfxSpawn(row[i], 150 + i * 196, 360, 1.25);
      }
      return 'active=' + window.__vfxStage(${frames});
    })()`;
    const res = await cdp.send('Runtime.evaluate', { expression: expr, returnByValue: true });
    console.log(`row ${r} → ${JSON.stringify(res.result.value ?? res.result)}`);
    await sleep(500);
    const shot = await cdp.send('Page.captureScreenshot', {
      format: 'png',
      clip: { x: 0, y: 0, width: 1280, height: 720, scale: 1 },
    });
    const file = `${OUT_DIR}/row${r}.png`;
    writeFileSync(file, Buffer.from(shot.data, 'base64'));
    console.log(`wrote ${file}`);
  }

  cdp.close();
} catch (err) {
  console.error('FAILED:', err);
  process.exitCode = 1;
} finally {
  chrome.kill();
}
