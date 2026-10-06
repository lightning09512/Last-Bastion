// ─── Minimal screenshot rig (temp QA tool, outside src/) ──────────
//   node temp/artenv/shot.mjs <url> <seconds> <outPng> [setupExpression]
// Unlike tools/browserCheck.mjs it never touches window.__lastBastion, so it
// also works for standalone art harness pages.

import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const url = process.argv[2];
const seconds = Number(process.argv[3] ?? 3);
const outPng = process.argv[4] ?? 'shots/art.png';
const setup = process.argv[5] ?? '';
const port = 9344;
const profile = `${process.env.TEMP}\\dsh-cdp-art`;

const chrome = spawn(CHROME, [
  '--headless=new',
  '--disable-gpu',
  '--no-sandbox',
  '--hide-scrollbars',
  `--remote-debugging-port=${port}`,
  `--user-data-dir=${profile}`,
  '--window-size=1280,720',
  'about:blank',
], { stdio: 'ignore' });

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
    const timer = setTimeout(() => reject(new Error('CDP timeout')), 60000);
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
      clearTimeout(timer);
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

  // Surface page-side exceptions instead of silently screenshotting a blank page.
  const pageErrors = [];
  cdp.send('Log.enable').catch(() => {});
  cdp.send('Runtime.evaluate', {
    expression: 'window.__qaErrors = []; window.addEventListener("error", e => window.__qaErrors.push(String(e.message))); "ok"',
  }).catch(() => {});

  await cdp.send('Page.navigate', { url });
  await sleep(4000);

  if (setup) {
    const res = await cdp.send('Runtime.evaluate', { expression: setup, returnByValue: true });
    console.log(`setup → ${JSON.stringify(res.result?.value ?? res.result)}`);
  }

  await sleep(seconds * 1000);

  const errState = await cdp.send('Runtime.evaluate', {
    expression: 'JSON.stringify(window.__qaErrors || [])',
    returnByValue: true,
  });
  pageErrors.push(errState.result.value);
  console.log('page errors:', pageErrors.join(' '));

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
