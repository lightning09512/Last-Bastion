// ─── Real-time browser verification (Phase 0) ────────────────────
// Drives the built game in headless Chrome over the DevTools protocol and
// measures REAL frame times (no virtual time), then captures a screenshot.
//
//   node tools/browserCheck.mjs <url> <seconds> <outPng> [setupExpression]

import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const url = process.argv[2] ?? 'http://localhost:4173/?level=level_1&debug=1';
const seconds = Number(process.argv[3] ?? 15);
const outPng = process.argv[4] ?? 'shots/live.png';
const setup = process.argv[5] ?? '';
const probe = process.argv[6] ?? '';

const port = 9333;
const profile = `${process.env.TEMP}\\dsh-cdp-profile`;

const chrome = spawn(CHROME, [
  '--headless=new',
  '--disable-gpu',
  '--no-sandbox',
  '--hide-scrollbars',
  `--remote-debugging-port=${port}`,
  `--user-data-dir=${profile}`,
  '--window-size=1280,720',
  'about:blank',
], { stdio: 'ignore', detached: false });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitForDevTools() {
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (res.ok) return await res.json();
    } catch {
      // not up yet
    }
    await sleep(250);
  }
  throw new Error('DevTools endpoint never came up');
}

function connect(wsUrl) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    let id = 0;
    const pending = new Map();
    ws.addEventListener('message', (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && pending.has(msg.id)) {
        const { resolve: res, reject: rej } = pending.get(msg.id);
        pending.delete(msg.id);
        if (msg.error) rej(new Error(JSON.stringify(msg.error)));
        else res(msg.result);
      }
    });
    ws.addEventListener('error', reject);
    ws.addEventListener('open', () => {
      resolve({
        send(method, params = {}) {
          return new Promise((res, rej) => {
            const msgId = ++id;
            pending.set(msgId, { resolve: res, reject: rej });
            ws.send(JSON.stringify({ id: msgId, method, params }));
          });
        },
        close: () => ws.close(),
      });
    });
  });
}

const errors = [];

try {
  const version = await waitForDevTools();
  console.log(`DevTools: ${version.Browser}`);

  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  const page = targets.find((t) => t.type === 'page');
  if (!page) throw new Error('no page target');

  const cdp = await connect(page.webSocketDebuggerUrl);
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Log.enable');

  // Collect console errors.
  const ws = page.webSocketDebuggerUrl;
  void ws;
  cdp.send('Runtime.consoleAPICalled').catch(() => {});
  // Re-listen for exception events through a second connection is unnecessary:
  // we read window.onerror results after the run instead.

  await cdp.send('Page.navigate', { url });
  await sleep(4000); // let the loading screen finish and the level boot

  if (setup) {
    const res = await cdp.send('Runtime.evaluate', { expression: setup, returnByValue: true });
    console.log(`setup → ${JSON.stringify(res.result?.value ?? res.result)}`);
  }

  await sleep(seconds * 1000);

  if (probe) {
    const res = await cdp.send('Runtime.evaluate', { expression: probe, returnByValue: true });
    console.log(`probe → ${JSON.stringify(res.result?.value ?? res.result)}`);
  }

  const stats = await cdp.send('Runtime.evaluate', {
    expression: 'JSON.stringify(window.__lastBastion ? window.__lastBastion.getQaSnapshot() : null)',
    returnByValue: true,
  });
  const snapshot = JSON.parse(stats.result.value ?? 'null');
  console.log('measured:', JSON.stringify(snapshot));

  const errState = await cdp.send('Runtime.evaluate', {
    expression: 'String(window.__qaErrors || 0)',
    returnByValue: true,
  });
  console.log('page error count:', errState.result.value);

  const shot = await cdp.send('Page.captureScreenshot', { format: 'png' });
  mkdirSync(dirname(outPng), { recursive: true });
  writeFileSync(outPng, Buffer.from(shot.data, 'base64'));
  console.log(`screenshot written: ${outPng}`);

  cdp.close();
} catch (error) {
  errors.push(String(error));
  console.error('FAILED:', error);
} finally {
  chrome.kill();
}

process.exit(errors.length === 0 ? 0 : 1);
