// ─── Minimal DOM stub for the headless smoke test ────────────────
// Only the surface the game actually touches at runtime. This is a dev
// harness (tools/), not part of the shipped bundle.

function makeGradient() {
  return { addColorStop() {} };
}

function makeCtx(canvas: unknown) {
  const target: Record<string, unknown> = {
    canvas,
    createLinearGradient: () => makeGradient(),
    createRadialGradient: () => makeGradient(),
    createPattern: () => null,
    measureText: () => ({ width: 10 }),
    getImageData: () => ({ data: new Uint8ClampedArray(4), width: 1, height: 1 }),
    putImageData() {},
    save() {}, restore() {},
    beginPath() {}, closePath() {},
    setTransform() {}, transform() {}, resetTransform() {},
    translate() {}, scale() {}, rotate() {},
    clearRect() {}, fillRect() {}, strokeRect() {},
    fill() {}, stroke() {}, clip() {},
    arc() {}, arcTo() {}, ellipse() {}, rect() {},
    moveTo() {}, lineTo() {},
    quadraticCurveTo() {}, bezierCurveTo() {},
    fillText() {}, strokeText() {},
    setLineDash() {}, getLineDash: () => [],
    drawImage() {},
    globalAlpha: 1, globalCompositeOperation: 'source-over',
    fillStyle: '#000', strokeStyle: '#000', lineWidth: 1,
    font: '10px sans-serif', textAlign: 'left', textBaseline: 'alphabetic',
    shadowBlur: 0, shadowColor: '#000',
  };
  return new Proxy(target, {
    get(t, p) {
      if (p in t) return t[p as string];
      return () => {};
    },
    set(t, p, v) {
      t[p as string] = v;
      return true;
    },
  });
}

export function makeCanvas(): unknown {
  const canvas: Record<string, unknown> = {
    width: 0,
    height: 0,
    style: {},
    getContext: () => ctx,
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 1280, height: 720, right: 1280, bottom: 720 }),
    addEventListener() {},
    removeEventListener() {},
  };
  const ctx = makeCtx(canvas);
  return canvas;
}

export function installDomStub(): void {
  const store = new Map<string, string>();

  const win = {
    innerWidth: 1280,
    innerHeight: 720,
    devicePixelRatio: 1,
    addEventListener() {},
    removeEventListener() {},
    setInterval: () => 0,
    clearInterval() {},
    requestAnimationFrame: () => 0,
  };

  const globals = globalThis as unknown as Record<string, unknown>;
  globals.window = win;
  globals.document = {
    createElement: (tag: string) => (tag === 'canvas' ? makeCanvas() : { style: {} }),
    getElementById: () => makeCanvas(),
    addEventListener() {},
  };
  globals.localStorage = {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
  };
  globals.requestAnimationFrame = () => 0;
  globals.cancelAnimationFrame = () => {};
  globals.devicePixelRatio = 1;
}

installDomStub();
