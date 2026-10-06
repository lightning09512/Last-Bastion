var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

// src/data/types.ts
var DESIGN_WIDTH = 1280;
var DESIGN_HEIGHT = 720;
var FIXED_DT = 1 / 60;

// src/rendering/SpriteBank.ts
var SpriteBank = class {
  constructor() {
    __publicField(this, "cache", /* @__PURE__ */ new Map());
    __publicField(this, "capacity", 300);
    __publicField(this, "bakeCount", 0);
    __publicField(this, "hitCount", 0);
    __publicField(this, "ss", 2);
  }
  /** Internal resolution multiplier. Raising it clears the cache. */
  setSupersample(value) {
    const clamped = Math.max(1, Math.min(3, Math.round(value)));
    if (clamped !== this.ss) {
      this.ss = clamped;
      this.cache.clear();
    }
  }
  get supersample() {
    return this.ss;
  }
  /**
   * Return a baked sprite for `key`. The returned canvas is
   * `supersample` times larger than (w, h): always blit it back at (w, h)
   * with `blit()` so the downscale stays consistent.
   */
  get(key, w, h, draw, supersample = this.ss) {
    const fullKey = `${key}#${supersample}`;
    const cached = this.cache.get(fullKey);
    if (cached) {
      this.hitCount++;
      this.cache.delete(fullKey);
      this.cache.set(fullKey, cached);
      return cached;
    }
    const scale = Math.max(1, supersample);
    const canvas2 = document.createElement("canvas");
    canvas2.width = Math.max(1, Math.ceil(w * scale));
    canvas2.height = Math.max(1, Math.ceil(h * scale));
    const ctx2 = canvas2.getContext("2d");
    ctx2.imageSmoothingEnabled = true;
    ctx2.imageSmoothingQuality = "high";
    ctx2.save();
    ctx2.scale(scale, scale);
    draw(ctx2, w, h);
    ctx2.restore();
    this.bakeCount++;
    this.cache.set(fullKey, canvas2);
    this.evict();
    return canvas2;
  }
  /** Draw a baked sprite at display size (w, h) with the given anchor. */
  blit(ctx2, sprite, x, y, w, h, anchor = {}) {
    const ax = anchor.ax ?? 0.5;
    const ay = anchor.ay ?? 0.5;
    ctx2.drawImage(sprite, x - w * ax, y - h * ay, w, h);
  }
  stats() {
    return {
      bakes: this.bakeCount,
      hits: this.hitCount,
      entries: this.cache.size,
      supersample: this.ss
    };
  }
  clear() {
    this.cache.clear();
  }
  evict() {
    while (this.cache.size > this.capacity) {
      const oldest = this.cache.keys().next().value;
      if (oldest === void 0) break;
      this.cache.delete(oldest);
    }
  }
};
var sprites = new SpriteBank();

// src/rendering/Palette.ts
var SHADOW_TINT = "#2a1f38";
var DEFAULT_ART = {
  groundTint: "#2c4a1f",
  ambient: "rgba(255,244,214,0.10)",
  fog: "rgba(206,232,192,0.10)",
  foliageTip: "#9ede63",
  foliageBase: "#2f7a2c",
  accent: "#f0c040",
  vfxPrimary: "#ffb648",
  vfxSecondary: "#ffe9a8",
  decal: "rgba(38,26,20,0.35)"
};
var THEME_ART = {
  level_1: {
    ...DEFAULT_ART,
    groundTint: "#31541f",
    ambient: "rgba(255,246,214,0.10)",
    fog: "rgba(210,236,196,0.08)",
    foliageTip: "#a8e667",
    foliageBase: "#2f7f2c",
    accent: "#f0c040",
    vfxPrimary: "#ffb648",
    vfxSecondary: "#ffe9a8",
    decal: "rgba(40,28,18,0.30)"
  },
  level_2: {
    ...DEFAULT_ART,
    groundTint: "#24401c",
    ambient: "rgba(226,255,226,0.12)",
    fog: "rgba(150,200,150,0.14)",
    foliageTip: "#7fd05a",
    foliageBase: "#1d5c22",
    accent: "#c9e06a",
    vfxPrimary: "#b6e35c",
    vfxSecondary: "#e8ffb0",
    decal: "rgba(26,34,20,0.36)"
  },
  level_3: {
    ...DEFAULT_ART,
    groundTint: "#2b3a44",
    ambient: "rgba(214,230,246,0.12)",
    fog: "rgba(176,190,206,0.16)",
    foliageTip: "#8fa98a",
    foliageBase: "#3d6a48",
    accent: "#9fc6d8",
    vfxPrimary: "#7fc8ff",
    vfxSecondary: "#dff2ff",
    decal: "rgba(24,26,32,0.36)"
  },
  level_4: {
    ...DEFAULT_ART,
    groundTint: "#22301c",
    ambient: "rgba(196,226,196,0.10)",
    fog: "rgba(110,150,110,0.22)",
    foliageTip: "#86c04a",
    foliageBase: "#1f4526",
    accent: "#9be564",
    vfxPrimary: "#7ef07a",
    vfxSecondary: "#d6ffd0",
    decal: "rgba(18,26,18,0.42)"
  },
  level_5: {
    ...DEFAULT_ART,
    groundTint: "#3a2a24",
    ambient: "rgba(255,186,128,0.14)",
    fog: "rgba(120,60,44,0.20)",
    foliageTip: "#e0894a",
    foliageBase: "#4a3a28",
    accent: "#ff9a4d",
    vfxPrimary: "#ff7a3c",
    vfxSecondary: "#ffd08a",
    decal: "rgba(30,16,12,0.42)"
  }
};

// src/rendering/Lighting.ts
function mix(a, b, t) {
  const ar = parseInt(a.slice(1, 3), 16);
  const ag = parseInt(a.slice(3, 5), 16);
  const ab = parseInt(a.slice(5, 7), 16);
  const br = parseInt(b.slice(1, 3), 16);
  const bg = parseInt(b.slice(3, 5), 16);
  const bb = parseInt(b.slice(5, 7), 16);
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${bl.toString(16).padStart(2, "0")}`;
}

// src/rendering/Icons.ts
function drawIcon(ctx2, name, x, y, size, alpha = 1) {
  const sprite = getIconSprite(name, size);
  const prev = ctx2.globalAlpha;
  if (alpha !== 1) ctx2.globalAlpha = prev * alpha;
  ctx2.drawImage(sprite, x - size / 2, y - size / 2, size, size);
  ctx2.globalAlpha = prev;
}
function getIconSprite(name, size) {
  const s = Math.max(6, Math.round(size));
  return sprites.get(`icon:${name}`, s, s, (c, w) => {
    const k = w / 100;
    c.translate(w / 2, w / 2);
    c.scale(k, k);
    c.lineJoin = "round";
    c.lineCap = "round";
    ICON_DRAW[name](c);
  }, ICON_SUPERSAMPLE);
}
var ICON_SUPERSAMPLE = 3;
var OUTLINE = SHADOW_TINT;
var DEEP = "#241a30";
var GOLD_HI = "#ffe9a8";
var GOLD = "#f2c14a";
var GOLD_DARK = "#8a5f14";
var BRONZE = "#b07c38";
var BRONZE_DARK = "#6d451a";
var WOOD = "#6b4320";
var WOOD_DARK = "#3d2410";
var IRON_HI = "#cfd8e4";
var IRON = "#94a3b4";
var IRON_DARK = "#4c5768";
var CRIMSON = "#c0392b";
var CRIMSON_DARK = "#7d1f16";
var FOREST = "#4f9c3c";
var FOREST_DARK = "#265c1d";
var ARCANE = "#8b5cf6";
var ARCANE_DARK = "#432a86";
var HEX = "#38bdf8";
var HEX_DARK = "#155e88";
var BONE = "#ece0c4";
var BONE_DARK = "#a08d6b";
function poly(c, pts) {
  c.beginPath();
  c.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]);
  c.closePath();
}
function circle(c, x, y, r) {
  c.beginPath();
  c.arc(x, y, r, 0, Math.PI * 2);
}
function ellipse(c, x, y, rx, ry, rot = 0) {
  c.beginPath();
  c.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
}
function rect(c, x, y, w, h) {
  c.beginPath();
  c.rect(x - w / 2, y - h / 2, w, h);
}
function rrect(c, x, y, w, h, r) {
  const x0 = x - w / 2;
  const y0 = y - h / 2;
  const rr = Math.min(r, w / 2, h / 2);
  c.beginPath();
  c.moveTo(x0 + rr, y0);
  c.lineTo(x0 + w - rr, y0);
  c.quadraticCurveTo(x0 + w, y0, x0 + w, y0 + rr);
  c.lineTo(x0 + w, y0 + h - rr);
  c.quadraticCurveTo(x0 + w, y0 + h, x0 + w - rr, y0 + h);
  c.lineTo(x0 + rr, y0 + h);
  c.quadraticCurveTo(x0, y0 + h, x0, y0 + h - rr);
  c.lineTo(x0, y0 + rr);
  c.quadraticCurveTo(x0, y0, x0 + rr, y0);
  c.closePath();
}
function starPath(c, x, y, r, inner = 0.44) {
  c.beginPath();
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? r : r * inner;
    const a = Math.PI * i / 5 - Math.PI / 2;
    const px = x + Math.cos(a) * rad;
    const py = y + Math.sin(a) * rad;
    if (i === 0) c.moveTo(px, py);
    else c.lineTo(px, py);
  }
  c.closePath();
}
function ink(c, fill, width = 4.5) {
  c.fillStyle = fill;
  c.fill();
  c.lineWidth = width;
  c.strokeStyle = OUTLINE;
  c.stroke();
}
function body(c, x, top, bottom, hex, lighten = 0.3, darken = 0.34) {
  const g = c.createLinearGradient(x, top, x, bottom);
  g.addColorStop(0, mix(hex, "#fff6da", lighten));
  g.addColorStop(0.52, hex);
  g.addColorStop(1, mix(hex, DEEP, darken));
  c.fillStyle = g;
  c.fill();
}
function metal(c, x0, y0, x1, y1, hex = GOLD) {
  const g = c.createLinearGradient(x0, y0, x1, y1);
  g.addColorStop(0, mix(hex, "#fffbe8", 0.62));
  g.addColorStop(0.45, hex);
  g.addColorStop(1, mix(hex, DEEP, 0.42));
  c.fillStyle = g;
  c.fill();
}
function spec(c, x, y, w, h, a = 0.5) {
  c.fillStyle = `rgba(255,252,230,${a})`;
  rrect(c, x, y, w, h, Math.min(w, h) / 2);
  c.fill();
}
function strokeLine(c, pts, color, width) {
  c.beginPath();
  c.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]);
  c.strokeStyle = color;
  c.lineWidth = width;
  c.stroke();
}
function blade(c, x0, y0, x1, y1, bow) {
  const mx = (x0 + x1) / 2;
  const my = (y0 + y1) / 2;
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  c.beginPath();
  c.moveTo(x0, y0);
  c.quadraticCurveTo(mx + nx * bow, my + ny * bow, x1, y1);
  c.quadraticCurveTo(mx - nx * bow * 0.5, my - ny * bow * 0.5, x0, y0);
  c.closePath();
}
function reticle(c, r, color) {
  circle(c, 0, 0, r);
  c.strokeStyle = color;
  c.lineWidth = 4;
  c.stroke();
  strokeLine(c, [[-r - 8, 0], [-r + 4, 0]], color, 4);
  strokeLine(c, [[r - 4, 0], [r + 8, 0]], color, 4);
  strokeLine(c, [[0, -r - 8], [0, -r + 4]], color, 4);
  strokeLine(c, [[0, r - 4], [0, r + 8]], color, 4);
}
function iconArcher(c) {
  const limb = (dir) => {
    c.beginPath();
    c.moveTo(30 * dir, -46);
    c.quadraticCurveTo(66 * dir, 0, 30 * dir, 46);
    c.quadraticCurveTo(50 * dir, 0, 30 * dir, -46);
    c.closePath();
    metal(c, 24 * dir, -46, 24 * dir, 46, BRONZE);
    c.strokeStyle = OUTLINE;
    c.lineWidth = 4;
    c.stroke();
  };
  limb(1);
  limb(-1);
  rrect(c, 0, 0, 15, 30, 6);
  body(c, 0, -15, 15, WOOD, 0.24, 0.36);
  c.strokeStyle = OUTLINE;
  c.lineWidth = 3.5;
  c.stroke();
  strokeLine(c, [[31, -44], [10, 0], [31, 44]], BONE, 3.2);
  c.save();
  c.rotate(-0.72);
  rect(c, 0, 2, 7, 74);
  body(c, 0, -35, 39, WOOD, 0.3, 0.3);
  c.strokeStyle = OUTLINE;
  c.lineWidth = 3.2;
  c.stroke();
  poly(c, [[-11, -34], [11, -34], [0, -56]]);
  ink(c, IRON_HI, 3.4);
  poly(c, [[-8, 36], [-20, 50], [-6, 52]]);
  ink(c, CRIMSON, 3);
  poly(c, [[8, 36], [20, 50], [6, 52]]);
  ink(c, CRIMSON, 3);
  c.restore();
}
function iconMage(c) {
  [-1, 1].forEach((dir) => {
    c.beginPath();
    c.moveTo(10 * dir, 40);
    c.quadraticCurveTo(42 * dir, 24, 30 * dir, -18);
    c.quadraticCurveTo(36 * dir, 24, 20 * dir, 44);
    c.closePath();
    metal(c, 0, -18, 0, 44, IRON);
    c.strokeStyle = OUTLINE;
    c.lineWidth = 4;
    c.stroke();
  });
  circle(c, 0, -4, 31);
  const g = c.createRadialGradient(-10, -16, 4, 0, -4, 33);
  g.addColorStop(0, "#f0e4ff");
  g.addColorStop(0.35, ARCANE);
  g.addColorStop(1, ARCANE_DARK);
  c.fillStyle = g;
  c.fill();
  c.strokeStyle = OUTLINE;
  c.lineWidth = 4.5;
  c.stroke();
  spec(c, -16, -22, 14, 9, 0.65);
  c.strokeStyle = "rgba(240,228,255,0.55)";
  c.lineWidth = 2;
  ellipse(c, 0, -4, 22, 20, -0.5);
  c.stroke();
  [[-34, -34], [36, -26], [30, 26]].forEach(([x, y]) => {
    starPath(c, x, y, 8, 0.32);
    ink(c, GOLD_HI, 2.6);
  });
}
function iconCannon(c) {
  c.save();
  c.rotate(-0.16);
  poly(c, [[-16, -30], [30, -36], [34, 30], [-18, 34]]);
  metal(c, -20, -36, 34, 34, IRON);
  c.strokeStyle = OUTLINE;
  c.lineWidth = 4.5;
  c.stroke();
  spec(c, -4, -26, 24, 8, 0.4);
  [-8, 12].forEach((y) => {
    rect(c, 6, y, 50, 7);
    ink(c, BRONZE_DARK, 3);
  });
  ellipse(c, 32, -3, 8, 31);
  ink(c, IRON_DARK, 4);
  ellipse(c, 32, -3, 4.5, 25);
  c.fillStyle = "#14101f";
  c.fill();
  c.restore();
  circle(c, -30, 28, 15);
  metal(c, -44, 14, -16, 42, "#2f3542");
  c.strokeStyle = OUTLINE;
  c.lineWidth = 4;
  c.stroke();
  spec(c, -38, 20, 10, 7, 0.35);
  strokeLine(c, [[-24, -2], [-14, -12], [-20, -22]], CRIMSON, 4);
  circle(c, -21, -26, 5);
  ink(c, "#ffb648", 2.4);
}
function iconBarracks(c) {
  [-1, 1].forEach((dir) => {
    c.save();
    c.rotate(dir * 0.72);
    rect(c, 0, 0, 6.5, 104);
    body(c, 0, -52, 52, WOOD, 0.26, 0.3);
    c.strokeStyle = OUTLINE;
    c.lineWidth = 3;
    c.stroke();
    poly(c, [[-10, -50], [10, -50], [0, -74]]);
    ink(c, IRON_HI, 3);
    c.restore();
  });
  shield(c, 0, 4, 34, 42);
  const g = c.createLinearGradient(0, -38, 0, 46);
  g.addColorStop(0, "#3f6fd8");
  g.addColorStop(0.55, "#24479b");
  g.addColorStop(1, "#152a63");
  c.fillStyle = g;
  c.fill();
  c.strokeStyle = OUTLINE;
  c.lineWidth = 4.5;
  c.stroke();
  strokeLine(c, [[-34, 0], [34, 0]], GOLD, 6);
  strokeLine(c, [[0, -38], [0, 46]], GOLD, 6);
  circle(c, 0, 4, 11);
  ink(c, GOLD_HI, 3.2);
}
function iconSpecSharpshooter(c) {
  c.save();
  c.rotate(-0.6);
  rect(c, 0, 6, 6, 76);
  body(c, 0, -32, 44, WOOD, 0.3, 0.3);
  c.strokeStyle = OUTLINE;
  c.lineWidth = 3;
  c.stroke();
  poly(c, [[-11, -30], [11, -30], [0, -54]]);
  ink(c, GOLD_HI, 3.4);
  c.restore();
  circle(c, 4, -8, 32);
  metal(c, -28, -40, 36, 26, BRONZE);
  c.strokeStyle = OUTLINE;
  c.lineWidth = 4.5;
  c.stroke();
  circle(c, 4, -8, 22);
  c.fillStyle = "rgba(24,32,52,0.85)";
  c.fill();
  reticle(c, 17, GOLD_HI);
}
function iconSpecRapidVolley(c) {
  [-0.5, 0, 0.5].forEach((a) => {
    c.save();
    c.rotate(a);
    rect(c, 0, -2, 6, 62);
    body(c, 0, -33, 29, WOOD, 0.28, 0.3);
    c.strokeStyle = OUTLINE;
    c.lineWidth = 2.8;
    c.stroke();
    poly(c, [[-10, -32], [10, -32], [0, -52]]);
    ink(c, IRON_HI, 3);
    c.restore();
  });
  c.beginPath();
  c.moveTo(-30, 30);
  c.quadraticCurveTo(6, 54, 40, 22);
  c.quadraticCurveTo(8, 66, -34, 40);
  c.closePath();
  metal(c, -34, 22, 40, 54, BRONZE);
  c.strokeStyle = OUTLINE;
  c.lineWidth = 4;
  c.stroke();
  strokeLine(c, [[-30, 30], [40, 22]], BONE, 3);
}
function iconSpecArcaneBlast(c) {
  for (let i = 0; i < 8; i++) {
    const a = Math.PI * i / 4 - Math.PI / 2;
    const len = i % 2 === 0 ? 48 : 34;
    poly(c, [
      [Math.cos(a) * len, Math.sin(a) * len],
      [Math.cos(a + 0.28) * 20, Math.sin(a + 0.28) * 20],
      [Math.cos(a - 0.28) * 20, Math.sin(a - 0.28) * 20]
    ]);
    ink(c, i % 2 === 0 ? GOLD : ARCANE, 3.4);
  }
  circle(c, 0, 0, 26);
  const g = c.createRadialGradient(-8, -8, 2, 0, 0, 28);
  g.addColorStop(0, "#ffffff");
  g.addColorStop(0.4, "#c4a6ff");
  g.addColorStop(1, ARCANE_DARK);
  c.fillStyle = g;
  c.fill();
  c.strokeStyle = OUTLINE;
  c.lineWidth = 4.5;
  c.stroke();
}
function iconSpecSlowHex(c) {
  c.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = Math.PI * i / 3 - Math.PI / 2;
    const x = Math.cos(a) * 44;
    const y = Math.sin(a) * 44;
    if (i === 0) c.moveTo(x, y);
    else c.lineTo(x, y);
  }
  c.closePath();
  c.strokeStyle = OUTLINE;
  c.lineWidth = 9;
  c.stroke();
  c.strokeStyle = GOLD;
  c.lineWidth = 5.5;
  c.stroke();
  const g = c.createLinearGradient(0, -34, 0, 34);
  g.addColorStop(0, "#e8fbff");
  g.addColorStop(0.5, HEX);
  g.addColorStop(1, HEX_DARK);
  poly(c, [[0, -36], [22, 0], [0, 36], [-22, 0]]);
  c.fillStyle = g;
  c.fill();
  c.strokeStyle = OUTLINE;
  c.lineWidth = 4;
  c.stroke();
  strokeLine(c, [[0, -30], [0, 30]], "rgba(255,255,255,0.6)", 2.4);
  strokeLine(c, [[-16, -2], [16, -2]], "rgba(255,255,255,0.35)", 2);
}
function iconSpecHeavyBombard(c) {
  c.save();
  c.rotate(-1.05);
  poly(c, [[-20, -24], [26, -30], [30, 26], [-22, 30]]);
  metal(c, -24, -30, 30, 30, IRON_DARK);
  c.strokeStyle = OUTLINE;
  c.lineWidth = 4.5;
  c.stroke();
  spec(c, -8, -22, 22, 8, 0.35);
  rect(c, 2, -22, 54, 8);
  ink(c, BRONZE, 3);
  rect(c, 2, 14, 54, 8);
  ink(c, BRONZE, 3);
  c.restore();
  circle(c, 26, -24, 15);
  metal(c, 12, -38, 40, -10, "#2f3542");
  c.strokeStyle = OUTLINE;
  c.lineWidth = 4;
  c.stroke();
  spec(c, 19, -31, 9, 6, 0.4);
  poly(c, [[36, -46], [56, -58], [44, -36]]);
  ink(c, "#ffb648", 3);
  poly(c, [[44, -18], [62, -12], [42, -6]]);
  ink(c, CRIMSON, 3);
}
function iconSpecClusterBombs(c) {
  const bomb = (x, y, r) => {
    circle(c, x, y, r);
    const g = c.createRadialGradient(x - r * 0.4, y - r * 0.45, r * 0.1, x, y, r);
    g.addColorStop(0, "#6b7688");
    g.addColorStop(0.6, "#39404f");
    g.addColorStop(1, "#191d26");
    c.fillStyle = g;
    c.fill();
    c.strokeStyle = OUTLINE;
    c.lineWidth = 4;
    c.stroke();
    spec(c, x - r * 0.5, y - r * 0.55, r * 0.7, r * 0.4, 0.4);
    strokeLine(c, [[x + r * 0.4, y - r], [x + r * 1.1, y - r * 1.9]], CRIMSON, 3.4);
  };
  bomb(-24, 12, 17);
  bomb(24, 20, 14);
  bomb(6, -24, 21);
  [[-44, -30], [44, -18], [0, 46]].forEach(([x, y]) => {
    starPath(c, x, y, 11, 0.3);
    ink(c, "#ffb648", 2.8);
  });
}
function iconSpecKnights(c) {
  c.save();
  c.rotate(0.62);
  poly(c, [[-9, -52], [9, -52], [9, 26], [0, 40], [-9, 26]]);
  metal(c, -9, -52, 9, 40, IRON_HI);
  c.strokeStyle = OUTLINE;
  c.lineWidth = 4;
  c.stroke();
  rect(c, 0, 32, 44, 9);
  ink(c, GOLD, 3.2);
  rect(c, 0, 46, 9, 20);
  ink(c, WOOD_DARK, 3);
  c.restore();
  shield(c, 0, 6, 32, 40);
  const g = c.createLinearGradient(0, -34, 0, 46);
  g.addColorStop(0, "#e8eef8");
  g.addColorStop(0.55, "#aab6c8");
  g.addColorStop(1, "#5d6a80");
  c.fillStyle = g;
  c.fill();
  c.strokeStyle = OUTLINE;
  c.lineWidth = 4.5;
  c.stroke();
  poly(c, [[0, -22], [16, 0], [0, 26], [-16, 0]]);
  ink(c, CRIMSON, 3.4);
  circle(c, 0, 0, 6);
  ink(c, GOLD_HI, 3);
}
function iconSpecRangers(c) {
  c.beginPath();
  c.moveTo(-26, -46);
  c.quadraticCurveTo(34, 0, -26, 46);
  c.quadraticCurveTo(6, 0, -26, -46);
  c.closePath();
  metal(c, -26, -46, 10, 46, FOREST_DARK);
  c.strokeStyle = OUTLINE;
  c.lineWidth = 4;
  c.stroke();
  strokeLine(c, [[-24, -44], [-10, 0], [-24, 44]], BONE, 3);
  [-0.34, 0.34].forEach((a) => {
    c.save();
    c.rotate(a);
    rect(c, 12, 0, 5.5, 66);
    body(c, 12, -33, 33, WOOD, 0.3, 0.3);
    c.strokeStyle = OUTLINE;
    c.lineWidth = 2.6;
    c.stroke();
    poly(c, [[4, -30], [20, -30], [12, -50]]);
    ink(c, GOLD_HI, 2.8);
    c.restore();
  });
  blade(c, -34, 6, -6, -30, 14);
  ink(c, FOREST, 3.4);
  strokeLine(c, [[-34, 6], [-6, -30]], mix(FOREST, "#ffffff", 0.45), 2.2);
}
function iconGold(c) {
  circle(c, 0, 3, 43);
  const g = c.createLinearGradient(-30, -38, 30, 44);
  g.addColorStop(0, "#fff4c9");
  g.addColorStop(0.4, GOLD);
  g.addColorStop(1, GOLD_DARK);
  c.fillStyle = g;
  c.fill();
  c.strokeStyle = OUTLINE;
  c.lineWidth = 5;
  c.stroke();
  circle(c, 0, 3, 32);
  c.strokeStyle = mix(GOLD_DARK, DEEP, 0.2);
  c.lineWidth = 3.4;
  c.stroke();
  circle(c, 0, 3, 27);
  c.strokeStyle = "rgba(255,246,214,0.5)";
  c.lineWidth = 2;
  c.stroke();
  gear(c, 0, 3, 15, 8, 7);
  ink(c, GOLD_DARK, 2.6);
  circle(c, 0, 3, 5);
  c.fillStyle = mix(GOLD_HI, "#ffffff", 0.2);
  c.fill();
  spec(c, -22, -24, 22, 11, 0.55);
}
function iconHeart(c) {
  c.beginPath();
  c.moveTo(0, 42);
  c.bezierCurveTo(-58, 4, -40, -46, -14, -46);
  c.bezierCurveTo(-4, -46, 0, -40, 0, -33);
  c.bezierCurveTo(0, -40, 4, -46, 14, -46);
  c.bezierCurveTo(40, -46, 58, 4, 0, 42);
  c.closePath();
  const g = c.createLinearGradient(0, -46, 0, 44);
  g.addColorStop(0, "#ff8a7a");
  g.addColorStop(0.42, CRIMSON);
  g.addColorStop(1, CRIMSON_DARK);
  c.fillStyle = g;
  c.fill();
  c.strokeStyle = OUTLINE;
  c.lineWidth = 5;
  c.stroke();
  c.save();
  c.clip();
  c.fillStyle = "rgba(60,12,22,0.28)";
  c.beginPath();
  c.ellipse(20, 6, 30, 34, 0.2, 0, Math.PI * 2);
  c.fill();
  c.restore();
  spec(c, -20, -26, 20, 12, 0.5);
  circle(c, -14, -22, 5);
  c.fillStyle = "rgba(255,255,255,0.35)";
  c.fill();
}
function iconWave(c) {
  c.save();
  c.rotate(-0.34);
  c.beginPath();
  c.moveTo(-42, -8);
  c.quadraticCurveTo(-12, -30, 20, -34);
  c.quadraticCurveTo(42, -36, 46, -12);
  c.quadraticCurveTo(48, 12, 24, 20);
  c.quadraticCurveTo(-10, 30, -42, 12);
  c.quadraticCurveTo(-34, 2, -42, -8);
  c.closePath();
  const g = c.createLinearGradient(-46, -34, 44, 22);
  g.addColorStop(0, "#fff0c4");
  g.addColorStop(0.4, GOLD);
  g.addColorStop(1, BRONZE_DARK);
  c.fillStyle = g;
  c.fill();
  c.strokeStyle = OUTLINE;
  c.lineWidth = 4.5;
  c.stroke();
  ellipse(c, 36, -8, 12, 26, -0.1);
  ink(c, mix(BRONZE, "#ffffff", 0.25), 3.6);
  ellipse(c, 36, -8, 6, 18, -0.1);
  c.fillStyle = "#2a1c10";
  c.fill();
  rect(c, -34, 2, 12, 30);
  ink(c, WOOD_DARK, 3);
  strokeLine(c, [[-30, -6], [-30, 10]], "rgba(255,246,214,0.4)", 2);
  c.restore();
  strokeLine(c, [[22, -46], [34, -56]], GOLD_HI, 4);
  strokeLine(c, [[34, -38], [50, -46]], GOLD_HI, 4);
}
function iconStar(c) {
  starPath(c, 0, 0, 46, 0.46);
  const g = c.createLinearGradient(-24, -44, 24, 44);
  g.addColorStop(0, "#fff8d4");
  g.addColorStop(0.42, GOLD);
  g.addColorStop(1, "#b8791a");
  c.fillStyle = g;
  c.fill();
  c.strokeStyle = OUTLINE;
  c.lineWidth = 5;
  c.stroke();
  c.save();
  c.clip();
  c.fillStyle = "rgba(90,50,10,0.28)";
  c.beginPath();
  c.moveTo(0, -46);
  c.lineTo(46, 0);
  c.lineTo(0, 46);
  c.closePath();
  c.fill();
  spec(c, -14, -22, 14, 8, 0.7);
  c.restore();
}
function iconLock(c) {
  c.beginPath();
  c.arc(0, -14, 24, Math.PI, 0);
  c.strokeStyle = OUTLINE;
  c.lineWidth = 15;
  c.stroke();
  c.strokeStyle = IRON_DARK;
  c.lineWidth = 11;
  c.stroke();
  c.strokeStyle = IRON;
  c.lineWidth = 6;
  c.stroke();
  c.strokeStyle = "rgba(255,248,222,0.45)";
  c.lineWidth = 2.2;
  c.stroke();
  rrect(c, 0, 20, 66, 54, 10);
  const g = c.createLinearGradient(0, -7, 0, 47);
  g.addColorStop(0, "#cdd6e2");
  g.addColorStop(0.5, "#8e9aab");
  g.addColorStop(1, "#4a5262");
  c.fillStyle = g;
  c.fill();
  c.strokeStyle = OUTLINE;
  c.lineWidth = 5;
  c.stroke();
  strokeLine(c, [[-33, 12], [33, 12]], "rgba(255,255,255,0.35)", 3);
  strokeLine(c, [[-33, 34], [33, 34]], "rgba(20,16,32,0.35)", 3);
  circle(c, -24, 10, 4);
  ink(c, "rgba(255,248,222,0.6)", 2.4);
  circle(c, 24, 10, 4);
  ink(c, "rgba(255,248,222,0.6)", 2.4);
  circle(c, 0, 14, 8);
  c.fillStyle = DEEP;
  c.fill();
  poly(c, [[-4, 18], [4, 18], [6, 34], [-6, 34]]);
  c.fillStyle = DEEP;
  c.fill();
}
function iconSkull(c) {
  c.beginPath();
  c.moveTo(-34, 4);
  c.bezierCurveTo(-38, -40, 38, -40, 34, 4);
  c.quadraticCurveTo(34, 20, 22, 24);
  c.lineTo(-22, 24);
  c.quadraticCurveTo(-34, 20, -34, 4);
  c.closePath();
  body(c, 0, -40, 26, BONE, 0.35, 0.3);
  c.strokeStyle = OUTLINE;
  c.lineWidth = 4.5;
  c.stroke();
  rrect(c, 0, 34, 30, 22, 6);
  body(c, 0, 24, 46, BONE_DARK, 0.3, 0.3);
  c.strokeStyle = OUTLINE;
  c.lineWidth = 4;
  c.stroke();
  strokeLine(c, [[-5, 24], [-5, 45]], OUTLINE, 2.6);
  strokeLine(c, [[5, 24], [5, 45]], OUTLINE, 2.6);
  [-14, 14].forEach((x) => {
    c.beginPath();
    c.ellipse(x, -4, 11, 13, x > 0 ? 0.16 : -0.16, 0, Math.PI * 2);
    c.fillStyle = "#160f22";
    c.fill();
    c.strokeStyle = OUTLINE;
    c.lineWidth = 3;
    c.stroke();
  });
  poly(c, [[0, 12], [7, 22], [-7, 22]]);
  c.fillStyle = "#160f22";
  c.fill();
  strokeLine(c, [[-30, 14], [-20, 20]], "rgba(60,40,20,0.45)", 2.6);
}
function iconPause(c) {
  [-1, 1].forEach((dir) => {
    rrect(c, dir * 16, 0, 20, 72, 6);
    metal(c, dir * 16 - 10, -36, dir * 16 + 10, 36, GOLD);
    c.strokeStyle = OUTLINE;
    c.lineWidth = 4.5;
    c.stroke();
    spec(c, dir * 16 - 5, -26, 6, 34, 0.4);
  });
}
function iconPlay(c) {
  poly(c, [[-24, -40], [42, 0], [-24, 40]]);
  metal(c, -24, -40, 42, 40, GOLD);
  c.strokeStyle = OUTLINE;
  c.lineWidth = 5;
  c.stroke();
  poly(c, [[-16, -22], [18, 0], [-16, 22]]);
  c.fillStyle = "rgba(255,250,224,0.5)";
  c.fill();
}
function iconSpeed(c) {
  [0, 30].forEach((off) => {
    poly(c, [[-34 + off, -36], [4 + off, 0], [-34 + off, 36], [-16 + off, 0]]);
    metal(c, -34 + off, -36, 4 + off, 36, GOLD);
    c.strokeStyle = OUTLINE;
    c.lineWidth = 4.5;
    c.stroke();
  });
  strokeLine(c, [[-52, -26], [-30, -26]], "rgba(255,250,224,0.45)", 4);
}
function iconUpgrade(c) {
  [[8, 30], [0, 22], [-8, 14]].forEach(([y, w]) => {
    rrect(c, 0, y, w + 26, 15, 7);
    metal(c, -20, y - 8, 20, y + 8, GOLD);
    c.strokeStyle = OUTLINE;
    c.lineWidth = 3.4;
    c.stroke();
  });
  poly(c, [[0, -46], [34, -14], [16, -14], [16, 4], [-16, 4], [-16, -14], [-34, -14]]);
  const g = c.createLinearGradient(0, -46, 0, 6);
  g.addColorStop(0, "#93e07a");
  g.addColorStop(1, FOREST_DARK);
  c.fillStyle = g;
  c.fill();
  c.strokeStyle = OUTLINE;
  c.lineWidth = 4.5;
  c.stroke();
  strokeLine(c, [[-20, -30], [0, -42]], "rgba(255,255,255,0.5)", 3);
}
function iconSell(c) {
  c.save();
  c.rotate(-0.5);
  c.beginPath();
  c.moveTo(-18, -40);
  c.lineTo(22, -36);
  c.quadraticCurveTo(40, -34, 38, -16);
  c.lineTo(30, 40);
  c.quadraticCurveTo(28, 52, 14, 50);
  c.lineTo(-26, 42);
  c.quadraticCurveTo(-38, 40, -36, 26);
  c.lineTo(-30, -28);
  c.closePath();
  body(c, 0, -40, 50, "#e0c38c", 0.32, 0.3);
  c.strokeStyle = OUTLINE;
  c.lineWidth = 4.5;
  c.stroke();
  circle(c, -4, -16, 6);
  c.fillStyle = "#8a6b3c";
  c.fill();
  c.strokeStyle = OUTLINE;
  c.lineWidth = 2.6;
  c.stroke();
  c.restore();
  circle(c, 20, 28, 22);
  metal(c, 0, 6, 42, 50, GOLD);
  c.strokeStyle = OUTLINE;
  c.lineWidth = 4.5;
  c.stroke();
  circle(c, 20, 28, 13);
  c.strokeStyle = GOLD_DARK;
  c.lineWidth = 3;
  c.stroke();
  spec(c, 10, 12, 14, 8, 0.5);
}
function iconBack(c) {
  poly(c, [[28, -40], [-16, 0], [28, 40], [28, 16], [2, 0], [28, -16]]);
  metal(c, -16, -40, 28, 40, GOLD);
  c.strokeStyle = OUTLINE;
  c.lineWidth = 4.5;
  c.stroke();
  rect(c, -34, 0, 26, 10);
  ink(c, GOLD, 3.4);
}
function iconClose(c) {
  circle(c, 0, 0, 42);
  const g = c.createLinearGradient(-30, -34, 30, 34);
  g.addColorStop(0, "#e0685a");
  g.addColorStop(0.5, CRIMSON);
  g.addColorStop(1, CRIMSON_DARK);
  c.fillStyle = g;
  c.fill();
  c.strokeStyle = OUTLINE;
  c.lineWidth = 5;
  c.stroke();
  circle(c, 0, 0, 33);
  c.strokeStyle = "rgba(255,236,196,0.55)";
  c.lineWidth = 2.4;
  c.stroke();
  strokeLine(c, [[-15, -15], [15, 15]], "#fff4dc", 10);
  strokeLine(c, [[15, -15], [-15, 15]], "#fff4dc", 10);
  strokeLine(c, [[-15, -15], [15, 15]], OUTLINE, 3);
  strokeLine(c, [[15, -15], [-15, 15]], OUTLINE, 3);
  spec(c, -20, -24, 18, 9, 0.4);
}
function iconInfo(c) {
  circle(c, 0, 0, 42);
  const g = c.createLinearGradient(0, -42, 0, 42);
  g.addColorStop(0, "#4d7fd6");
  g.addColorStop(1, "#1e3d7d");
  c.fillStyle = g;
  c.fill();
  c.strokeStyle = OUTLINE;
  c.lineWidth = 5;
  c.stroke();
  circle(c, 0, 0, 33);
  c.strokeStyle = "rgba(226,238,255,0.5)";
  c.lineWidth = 2.4;
  c.stroke();
  circle(c, 0, -20, 7);
  ink(c, "#f4f8ff", 3);
  rrect(c, 0, 12, 13, 40, 6);
  ink(c, "#f4f8ff", 3);
}
function iconPriorityFirst(c) {
  reticle(c, 20, GOLD_HI);
  circle(c, 0, 0, 9);
  ink(c, CRIMSON, 3.4);
  poly(c, [[0, -48], [10, -30], [-10, -30]]);
  ink(c, GOLD, 3.2);
}
function iconPriorityStrong(c) {
  rrect(c, 2, 6, 46, 40, 12);
  body(c, 2, -14, 26, IRON, 0.34, 0.34);
  c.strokeStyle = OUTLINE;
  c.lineWidth = 4.5;
  c.stroke();
  [-18, -2, 14].forEach((y) => {
    rrect(c, 6, y, 34, 16, 7);
    body(c, 6, y - 8, y + 8, IRON_HI, 0.3, 0.34);
    c.strokeStyle = OUTLINE;
    c.lineWidth = 3.6;
    c.stroke();
  });
  rrect(c, -22, 18, 34, 16, 8);
  body(c, -22, 10, 26, IRON_DARK, 0.3, 0.3);
  c.strokeStyle = OUTLINE;
  c.lineWidth = 3.6;
  c.stroke();
  spec(c, -4, -16, 20, 7, 0.45);
}
function iconPriorityClose(c) {
  reticle(c, 20, GOLD_HI);
  c.save();
  c.rotate(0.6);
  strokeLine(c, [[-30, 20], [-10, 4]], IRON, 9);
  strokeLine(c, [[-30, 20], [-10, 4]], OUTLINE, 3);
  c.beginPath();
  c.arc(0, -2, 14, -0.4, 2.4);
  c.strokeStyle = OUTLINE;
  c.lineWidth = 12;
  c.stroke();
  c.strokeStyle = IRON;
  c.lineWidth = 7;
  c.stroke();
  c.restore();
}
function iconSettings(c) {
  gear(c, 0, 0, 34, 15, 9);
  metal(c, -34, -34, 34, 34, IRON);
  c.strokeStyle = OUTLINE;
  c.lineWidth = 4.5;
  c.stroke();
  circle(c, 0, 0, 15);
  ink(c, mix(IRON_DARK, DEEP, 0.2), 4);
  circle(c, 0, 0, 6);
  c.fillStyle = GOLD_HI;
  c.fill();
}
function iconSoundOn(c) {
  speaker(c);
  [0, 1].forEach((i) => {
    c.beginPath();
    const r = 22 + i * 16;
    c.arc(-20, 0, r, -0.74, 0.74);
    c.strokeStyle = i === 0 ? GOLD_HI : GOLD;
    c.lineWidth = 7;
    c.stroke();
    c.strokeStyle = OUTLINE;
    c.lineWidth = 2.6;
    c.stroke();
  });
}
function iconSoundOff(c) {
  speaker(c);
  strokeLine(c, [[16, -22], [50, 22]], "#fff4dc", 10);
  strokeLine(c, [[50, -22], [16, 22]], "#fff4dc", 10);
  strokeLine(c, [[16, -22], [50, 22]], CRIMSON_DARK, 11);
  strokeLine(c, [[50, -22], [16, 22]], CRIMSON_DARK, 11);
}
function iconPlus(c) {
  circle(c, 0, 0, 40);
  const g = c.createLinearGradient(0, -40, 0, 40);
  g.addColorStop(0, "#7fd070");
  g.addColorStop(1, "#1f5c19");
  c.fillStyle = g;
  c.fill();
  c.strokeStyle = OUTLINE;
  c.lineWidth = 5;
  c.stroke();
  circle(c, 0, 0, 31);
  c.strokeStyle = "rgba(240,255,230,0.5)";
  c.lineWidth = 2.4;
  c.stroke();
  rrect(c, 0, 0, 42, 13, 6);
  ink(c, "#f4ffe8", 3.4);
  rrect(c, 0, 0, 13, 42, 6);
  ink(c, "#f4ffe8", 3.4);
}
function iconHammer(c) {
  c.save();
  c.rotate(0.7);
  rect(c, 0, 20, 12, 74);
  body(c, 0, -17, 57, WOOD, 0.3, 0.32);
  c.strokeStyle = OUTLINE;
  c.lineWidth = 3.6;
  c.stroke();
  strokeLine(c, [[-3, 4], [3, 4]], "rgba(60,40,20,0.4)", 2.4);
  rrect(c, 0, -32, 66, 34, 6);
  metal(c, -33, -49, 33, -15, IRON);
  c.strokeStyle = OUTLINE;
  c.lineWidth = 4.5;
  c.stroke();
  rect(c, -34, -32, 16, 40);
  ink(c, IRON_DARK, 3.4);
  rect(c, 26, -32, 16, 32);
  ink(c, IRON, 3.4);
  spec(c, -14, -42, 26, 8, 0.45);
  c.restore();
}
function iconCheck(c) {
  sheetPath(c, 0, 0, 52, 48, 0);
  body(c, 0, -48, 48, "#f3e3c2", 0.3, 0.24);
  c.strokeStyle = OUTLINE;
  c.lineWidth = 4.5;
  c.stroke();
  strokeLine(c, [[-16, -34], [6, -26]], "rgba(120,90,50,0.35)", 3);
  strokeLine(c, [[-16, -14], [10, -8]], "rgba(120,90,50,0.35)", 3);
  strokeLine(c, [[-24, 12], [-6, 32], [30, -18]], "#3f9c35", 13);
  strokeLine(c, [[-24, 12], [-6, 32], [30, -18]], OUTLINE, 4);
}
function iconSpellRainOfFire(c) {
  c.save();
  c.rotate(0.6);
  [[-16, 0.7], [0, 1], [16, 0.75]].forEach(([ox, s]) => {
    c.beginPath();
    c.moveTo(ox - 9 * s, 34);
    c.quadraticCurveTo(ox - 3 * s, 0, ox, -8 * s);
    c.quadraticCurveTo(ox + 3 * s, 0, ox + 9 * s, 34);
    c.closePath();
    const g2 = c.createLinearGradient(0, -10, 0, 36);
    g2.addColorStop(0, "#fff2b0");
    g2.addColorStop(0.45, "#ff9d2e");
    g2.addColorStop(1, "rgba(214,60,10,0.25)");
    c.fillStyle = g2;
    c.fill();
  });
  c.restore();
  circle(c, 12, -22, 24);
  const g = c.createRadialGradient(4, -32, 3, 12, -22, 25);
  g.addColorStop(0, "#ffe9a8");
  g.addColorStop(0.4, "#d9622a");
  g.addColorStop(1, "#5c2312");
  c.fillStyle = g;
  c.fill();
  c.strokeStyle = OUTLINE;
  c.lineWidth = 4.5;
  c.stroke();
  circle(c, 5, -28, 5);
  c.fillStyle = "rgba(30,12,6,0.65)";
  c.fill();
  spec(c, 2, -34, 12, 7, 0.4);
}
function iconSpellReinforcements(c) {
  [-1, 1].forEach((dir) => {
    c.save();
    c.rotate(dir * 0.5);
    rect(c, 0, -10, 6, 96);
    body(c, 0, -58, 38, WOOD, 0.28, 0.3);
    c.strokeStyle = OUTLINE;
    c.lineWidth = 3;
    c.stroke();
    poly(c, [[-10, -56], [10, -56], [0, -80]]);
    ink(c, IRON_HI, 3);
    c.restore();
  });
  shield(c, 0, 6, 30, 38);
  const g = c.createLinearGradient(0, -32, 0, 46);
  g.addColorStop(0, "#7fd070");
  g.addColorStop(0.5, FOREST);
  g.addColorStop(1, FOREST_DARK);
  c.fillStyle = g;
  c.fill();
  c.strokeStyle = OUTLINE;
  c.lineWidth = 4.5;
  c.stroke();
  strokeLine(c, [[-30, 0], [30, 0]], GOLD, 6);
  strokeLine(c, [[0, -32], [0, 44]], GOLD, 6);
  circle(c, 0, 4, 10);
  ink(c, GOLD_HI, 3);
}
function shield(c, cx, cy, w, h) {
  c.beginPath();
  c.moveTo(cx - w, cy - h * 0.72);
  c.lineTo(cx + w, cy - h * 0.72);
  c.lineTo(cx + w, cy + h * 0.08);
  c.quadraticCurveTo(cx + w, cy + h * 0.72, cx, cy + h);
  c.quadraticCurveTo(cx - w, cy + h * 0.72, cx - w, cy + h * 0.08);
  c.closePath();
}
function sheetPath(c, cx, cy, w, h, wobble) {
  const hw = w / 2;
  const hh = h / 2;
  c.beginPath();
  c.moveTo(cx - hw, cy - hh + wobble);
  c.lineTo(cx - hw + wobble, cy - hh);
  c.lineTo(cx + hw - wobble, cy - hh + wobble);
  c.lineTo(cx + hw, cy - hh + wobble * 2);
  c.lineTo(cx + hw - wobble, cy + hh);
  c.lineTo(cx - hw + wobble * 2, cy + hh - wobble);
  c.lineTo(cx - hw, cy + hh - wobble * 2);
  c.closePath();
}
function gear(c, cx, cy, r, teeth, tooth) {
  c.beginPath();
  const step = Math.PI * 2 / teeth;
  for (let i = 0; i < teeth; i++) {
    const a0 = i * step;
    const a1 = a0 + step * 0.34;
    const a2 = a0 + step * 0.66;
    const a3 = a0 + step;
    const ri = r - tooth;
    c.lineTo(cx + Math.cos(a0) * ri, cy + Math.sin(a0) * ri);
    c.lineTo(cx + Math.cos(a1) * r, cy + Math.sin(a1) * r);
    c.lineTo(cx + Math.cos(a2) * r, cy + Math.sin(a2) * r);
    c.lineTo(cx + Math.cos(a3) * ri, cy + Math.sin(a3) * ri);
  }
  c.closePath();
}
function speaker(c) {
  poly(c, [[-46, -14], [-26, -14], [-4, -38], [-4, 38], [-26, 14], [-46, 14]]);
  metal(c, -46, -38, -4, 38, GOLD);
  c.strokeStyle = OUTLINE;
  c.lineWidth = 4.5;
  c.stroke();
  strokeLine(c, [[-38, -6], [-38, 6]], "rgba(255,250,224,0.4)", 3);
}
var ICON_DRAW = {
  archer: iconArcher,
  mage: iconMage,
  cannon: iconCannon,
  barracks: iconBarracks,
  spec_sharpshooter: iconSpecSharpshooter,
  spec_rapid_volley: iconSpecRapidVolley,
  spec_arcane_blast: iconSpecArcaneBlast,
  spec_slow_hex: iconSpecSlowHex,
  spec_heavy_bombard: iconSpecHeavyBombard,
  spec_cluster_bombs: iconSpecClusterBombs,
  spec_knights: iconSpecKnights,
  spec_rangers: iconSpecRangers,
  gold: iconGold,
  heart: iconHeart,
  wave: iconWave,
  pause: iconPause,
  play: iconPlay,
  speed: iconSpeed,
  sell: iconSell,
  upgrade: iconUpgrade,
  spell_rain_of_fire: iconSpellRainOfFire,
  spell_reinforcements: iconSpellReinforcements,
  star: iconStar,
  lock: iconLock,
  sound_on: iconSoundOn,
  sound_off: iconSoundOff,
  settings: iconSettings,
  back: iconBack,
  close: iconClose,
  info: iconInfo,
  priority_first: iconPriorityFirst,
  priority_strong: iconPriorityStrong,
  priority_close: iconPriorityClose,
  plus: iconPlus,
  hammer: iconHammer,
  skull: iconSkull,
  check: iconCheck
};
var ICON_NAMES = Object.keys(ICON_DRAW);
function drawIconSheet(ctx2, x, y, size = 30, columns = 10) {
  ICON_NAMES.forEach((name, i) => {
    const col = i % columns;
    const row = Math.floor(i / columns);
    drawIcon(ctx2, name, x + col * (size + 10) + size / 2, y + row * (size + 10) + size / 2, size);
  });
}

// src/rendering/UIRenderer.ts
var FONT_TITLE = '"MedievalSharp", Georgia, serif';
var FONT_UI = '"Inter", system-ui, sans-serif';
var UI_INK = SHADOW_TINT;
var WOOD_HI = "#a8712f";
var WOOD2 = "#7a4d20";
var WOOD_DARK2 = "#4a2c12";
var GOLD_HI2 = "#ffe9a8";
var GOLD2 = "#f2c14a";
var GOLD_DARK2 = "#8a5f14";
var PARCHMENT_HI = "#fdf3dc";
var PARCHMENT = "#f2e0bb";
var PARCHMENT_DARK = "#cfa972";
var BRONZE2 = "#b07c38";
var BLOOD = "#b03325";
var BLOOD_DARK = "#6e1a13";
var cachedMapCanvas = null;
function hash2(x, y) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
}
function drawParchmentWorldMap(ctx2, time, mousePos, levels2, save2, hoveredIndex, selectedLevelIndex, audioMuted) {
  if (!cachedMapCanvas) {
    cachedMapCanvas = document.createElement("canvas");
    cachedMapCanvas.width = DESIGN_WIDTH;
    cachedMapCanvas.height = DESIGN_HEIGHT;
    const cCtx = cachedMapCanvas.getContext("2d");
    if (cCtx) renderStaticParchmentBase(cCtx, levels2);
  }
  ctx2.drawImage(cachedMapCanvas, 0, 0);
  drawAnimatedSeaDetails(ctx2, time);
  ctx2.save();
  const haze = ctx2.createLinearGradient(0, 0, 0, DESIGN_HEIGHT);
  haze.addColorStop(0, "rgba(255,246,214,0.16)");
  haze.addColorStop(0.45, "rgba(255,246,214,0.03)");
  haze.addColorStop(1, "rgba(74,46,18,0.10)");
  ctx2.fillStyle = haze;
  ctx2.fillRect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);
  ctx2.restore();
  drawCampaignPath(ctx2, levels2, save2, time);
  const nodePositions = getLevelNodePositions(levels2.length);
  for (let i = 0; i < levels2.length; i++) {
    const pos = nodePositions[i];
    const level = levels2[i];
    const unlocked = i === 0 || !!save2.levelStars[levels2[i - 1].id];
    const stars = save2.levelStars[level.id] || 0;
    const isHovered = hoveredIndex === i;
    const isSelected = selectedLevelIndex === i;
    const isNextBattle = unlocked && stars === 0 && (i === 0 || (save2.levelStars[levels2[i - 1].id] || 0) > 0);
    drawLevelStageMarker(
      ctx2,
      pos.x,
      pos.y,
      i + 1,
      level.name,
      unlocked,
      stars,
      isHovered,
      isSelected,
      isNextBattle,
      time
    );
  }
  drawWorldMapTopBar(ctx2, mousePos, save2.totalStars, audioMuted);
  if (selectedLevelIndex !== null && selectedLevelIndex >= 0 && selectedLevelIndex < levels2.length) {
    const selLevel = levels2[selectedLevelIndex];
    const selStars = save2.levelStars[selLevel.id] || 0;
    drawStageBriefingModal(ctx2, selLevel, selectedLevelIndex + 1, selStars, mousePos, time);
  }
}
function getLevelNodePositions(_count) {
  return [
    { x: 180, y: 440 },
    // Level 1: The Green Valley (South-West Plains)
    { x: 410, y: 360 },
    // Level 2: Forest Pass (Dense Pine Woodlands)
    { x: 650, y: 460 },
    // Level 3: Broken Bridge (Rushing River Chasm)
    { x: 880, y: 320 },
    // Level 4: Dark Swamp (Misty Mire)
    { x: 1110, y: 220 }
    // Level 5: Warlord's Gate (Volcanic Fortress Peaks)
  ];
}
function renderStaticParchmentBase(ctx2, levels2) {
  const bg = ctx2.createRadialGradient(
    DESIGN_WIDTH * 0.5,
    DESIGN_HEIGHT * 0.42,
    90,
    DESIGN_WIDTH * 0.5,
    DESIGN_HEIGHT * 0.5,
    DESIGN_WIDTH * 0.78
  );
  bg.addColorStop(0, "#f8ecd2");
  bg.addColorStop(0.45, "#eeddb4");
  bg.addColorStop(0.78, "#d9bb84");
  bg.addColorStop(1, "#b58a4e");
  ctx2.fillStyle = bg;
  ctx2.fillRect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);
  drawParchmentFiber(ctx2);
  drawParchmentStain(ctx2, 210, 170, 62);
  drawParchmentStain(ctx2, 968, 566, 78);
  drawParchmentStain(ctx2, 640, 250, 44);
  const grade = hash2(3, 1);
  const cx = 640 + (grade - 0.5) * 40;
  const cy = 250 + (grade - 0.5) * 50;
  const r = 470;
  const land = wobblyBlob(cx, cy, r, 64, (a) => 1 + 0.1 * Math.sin(a * 3 + 0.7) + 0.06 * Math.sin(a * 5 - 1.9) + 0.04 * Math.sin(a * 8 + 2.4));
  drawSea(ctx2, land);
  drawLandMass(ctx2, land);
  drawRiverChasm(ctx2);
  drawMountainRanges(ctx2);
  drawForestPatches(ctx2);
  drawSeaMonster(ctx2, 470, 638);
  drawCompassRose(ctx2, 118, 152, 58);
  drawCartographerNote(ctx2);
  drawBurnedMapFrame(ctx2);
  void levels2;
}
function drawParchmentFiber(ctx2) {
  for (let i = 0; i < 5200; i++) {
    const x = hash2(i, 1) * DESIGN_WIDTH;
    const y = hash2(i, 2) * DESIGN_HEIGHT;
    const a = hash2(i, 3);
    ctx2.fillStyle = a > 0.5 ? "rgba(120,84,38,0.045)" : "rgba(255,250,232,0.05)";
    ctx2.fillRect(x, y, 1 + a * 1.6, 1 + hash2(i, 4) * 1.4);
  }
  ctx2.strokeStyle = "rgba(108,68,26,0.10)";
  [0.33, 0.67].forEach((f, i) => {
    ctx2.lineWidth = 2.2;
    ctx2.beginPath();
    ctx2.moveTo(DESIGN_WIDTH * f, 0);
    ctx2.bezierCurveTo(DESIGN_WIDTH * f + (i ? -7 : 6), 240, DESIGN_WIDTH * f + (i ? 9 : -5), 470, DESIGN_WIDTH * f, DESIGN_HEIGHT);
    ctx2.stroke();
    ctx2.lineWidth = 0.9;
    ctx2.strokeStyle = "rgba(255,248,226,0.10)";
    ctx2.beginPath();
    ctx2.moveTo(DESIGN_WIDTH * f + 2, 0);
    ctx2.bezierCurveTo(DESIGN_WIDTH * f + (i ? -5 : 8), 240, DESIGN_WIDTH * f + (i ? 11 : -3), 470, DESIGN_WIDTH * f + 2, DESIGN_HEIGHT);
    ctx2.stroke();
    ctx2.strokeStyle = "rgba(108,68,26,0.10)";
  });
  ctx2.beginPath();
  ctx2.moveTo(0, DESIGN_HEIGHT * 0.52);
  ctx2.bezierCurveTo(340, DESIGN_HEIGHT * 0.52 + 5, 900, DESIGN_HEIGHT * 0.52 - 7, DESIGN_WIDTH, DESIGN_HEIGHT * 0.52);
  ctx2.lineWidth = 2.2;
  ctx2.stroke();
}
function drawParchmentStain(ctx2, cx, cy, r) {
  ctx2.save();
  const g = ctx2.createRadialGradient(cx, cy, r * 0.55, cx, cy, r);
  g.addColorStop(0, "rgba(168,116,48,0.05)");
  g.addColorStop(0.82, "rgba(140,90,30,0.10)");
  g.addColorStop(1, "rgba(140,90,30,0)");
  ctx2.fillStyle = g;
  ctx2.beginPath();
  ctx2.arc(cx, cy, r, 0, Math.PI * 2);
  ctx2.fill();
  ctx2.strokeStyle = "rgba(146,96,36,0.13)";
  ctx2.lineWidth = 3;
  ctx2.beginPath();
  ctx2.arc(cx, cy, r * 0.82, 0.4, 4.6);
  ctx2.stroke();
  ctx2.restore();
}
function wobblyBlob(cx, cy, base, steps, radiusAt) {
  const pts = [];
  for (let i = 0; i < steps; i++) {
    const a = Math.PI * 2 * i / steps;
    const rr = base * radiusAt(a);
    pts.push({ x: cx + Math.cos(a) * rr, y: cy + Math.sin(a) * rr * 0.86 });
  }
  return pts;
}
function tracePoly(ctx2, pts) {
  ctx2.beginPath();
  ctx2.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx2.lineTo(pts[i].x, pts[i].y);
  ctx2.closePath();
}
function drawSea(ctx2, land) {
  ctx2.save();
  const g = ctx2.createLinearGradient(0, 0, 0, DESIGN_HEIGHT);
  g.addColorStop(0, "#b9cabf");
  g.addColorStop(0.45, "#a9c2c2");
  g.addColorStop(1, "#8fb0b6");
  ctx2.fillStyle = g;
  ctx2.fillRect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);
  tracePoly(ctx2, land);
  ctx2.strokeStyle = "rgba(214,232,228,0.75)";
  ctx2.lineWidth = 22;
  ctx2.stroke();
  ctx2.strokeStyle = "rgba(238,248,240,0.6)";
  ctx2.lineWidth = 9;
  ctx2.stroke();
  tracePoly(ctx2, land);
  ctx2.strokeStyle = "rgba(58,84,96,0.55)";
  ctx2.lineWidth = 4.5;
  ctx2.stroke();
  ctx2.strokeStyle = "rgba(255,255,250,0.6)";
  ctx2.lineWidth = 1.8;
  ctx2.stroke();
  for (let y = 40; y < DESIGN_HEIGHT; y += 26) {
    const row = Math.floor(y / 26);
    for (let x = 30 + row % 2 * 22; x < DESIGN_WIDTH - 20; x += 52) {
      const n = hash2(x, y);
      if (n > 0.72) continue;
      ctx2.strokeStyle = `rgba(66,104,118,${0.16 + n * 0.2})`;
      ctx2.lineWidth = 1.3;
      ctx2.beginPath();
      ctx2.moveTo(x, y);
      ctx2.quadraticCurveTo(x + 9, y - 4.5, x + 18, y);
      ctx2.stroke();
      ctx2.strokeStyle = `rgba(255,255,250,${0.14 + n * 0.18})`;
      ctx2.beginPath();
      ctx2.moveTo(x + 1, y - 1.6);
      ctx2.quadraticCurveTo(x + 9, y - 5.6, x + 17, y - 1.6);
      ctx2.stroke();
    }
  }
  ctx2.restore();
}
function drawLandMass(ctx2, land) {
  ctx2.save();
  tracePoly(ctx2, land);
  const g = ctx2.createLinearGradient(0, 60, 0, DESIGN_HEIGHT);
  g.addColorStop(0, "#e7d9b0");
  g.addColorStop(0.55, "#dfcda0");
  g.addColorStop(1, "#cdb587");
  ctx2.fillStyle = g;
  ctx2.fill();
  ctx2.strokeStyle = "#e3d3a4";
  ctx2.lineWidth = 12;
  ctx2.stroke();
  ctx2.strokeStyle = "#6b4a20";
  ctx2.lineWidth = 2.6;
  ctx2.stroke();
  ctx2.save();
  ctx2.clip();
  ctx2.strokeStyle = "rgba(122,86,40,0.18)";
  ctx2.lineWidth = 26;
  tracePoly(ctx2, land);
  ctx2.stroke();
  ctx2.strokeStyle = "rgba(255,252,236,0.22)";
  ctx2.lineWidth = 12;
  ctx2.stroke();
  for (let i = 0; i < 900; i++) {
    const x = hash2(i, 11) * DESIGN_WIDTH;
    const y = 40 + hash2(i, 12) * (DESIGN_HEIGHT - 90);
    const a = hash2(i, 13);
    ctx2.fillStyle = a > 0.5 ? "rgba(140,104,54,0.05)" : "rgba(108,132,74,0.05)";
    ctx2.beginPath();
    ctx2.ellipse(x, y, 3 + a * 5, 1.6 + a * 2.2, a * 3, 0, Math.PI * 2);
    ctx2.fill();
  }
  ctx2.restore();
  ctx2.restore();
}
function drawRiverChasm(ctx2) {
  ctx2.save();
  const path = new Path2D();
  path.moveTo(690, 0);
  path.bezierCurveTo(640, 170, 716, 320, 648, 470);
  path.bezierCurveTo(596, 560, 668, 630, 652, 720);
  const layers = [
    [18, "rgba(78,104,116,0.55)"],
    [13, "#8fb0b8"],
    [7, "#c3dbe0"],
    [3, "rgba(255,255,255,0.5)"]
  ];
  layers.forEach(([w, color]) => {
    ctx2.strokeStyle = color;
    ctx2.lineWidth = w;
    ctx2.lineCap = "round";
    ctx2.stroke(path);
  });
  ctx2.strokeStyle = "rgba(255,255,255,0.45)";
  ctx2.lineWidth = 1.4;
  for (let i = 0; i < 16; i++) {
    const t = i / 16;
    const y = 40 + t * 640;
    const x = 660 + Math.sin(t * 7) * 26;
    ctx2.beginPath();
    ctx2.moveTo(x - 5, y + 4);
    ctx2.lineTo(x, y - 2);
    ctx2.lineTo(x + 5, y + 4);
    ctx2.stroke();
  }
  ctx2.restore();
}
function drawMountainRanges(ctx2) {
  ctx2.save();
  drawMountainCluster(ctx2, 290, 168, 9, 44, false);
  drawMountainCluster(ctx2, 486, 140, 8, 54, false);
  drawMountainCluster(ctx2, 660, 190, 6, 34, false);
  drawMountainCluster(ctx2, 1010, 128, 6, 66, true);
  drawMountainCluster(ctx2, 1160, 150, 7, 54, true);
  ctx2.font = `italic 15px ${FONT_TITLE}`;
  ctx2.fillStyle = "rgba(84,48,16,0.5)";
  ctx2.textAlign = "center";
  ctx2.textBaseline = "middle";
  ctx2.fillText("C R A G G Y   H O R N   P E A K S", 400, 84);
  ctx2.fillText("T H E   D O O M   S P I R E S", 1092, 68);
  ctx2.restore();
}
function drawMountainCluster(ctx2, cx, cy, count, avgHeight, isVolcanic) {
  ctx2.save();
  for (let pass = 1; pass >= 0; pass--) {
    for (let i = 0; i < count; i++) {
      const k = i - count / 2;
      const jitter = (hash2(i, pass * 7 + count) - 0.5) * 22;
      const mx = cx + k * avgHeight * 0.72 + jitter;
      const my = cy + (pass === 1 ? -14 : 0) + (hash2(i, pass + 3) - 0.5) * 8;
      const h = avgHeight * (0.78 + hash2(i, pass + 9) * 0.42);
      const w = h * (0.86 + hash2(i, pass + 13) * 0.2);
      const faceLight = isVolcanic ? "#c39a83" : "#dcc9a4";
      const faceDark = isVolcanic ? "rgba(64,30,52,0.42)" : "rgba(96,62,26,0.36)";
      const snow = isVolcanic ? "rgba(255,214,176,0.55)" : "rgba(255,252,240,0.85)";
      ctx2.globalAlpha = pass === 1 ? 0.75 : 1;
      ctx2.beginPath();
      ctx2.moveTo(mx, my - h);
      ctx2.lineTo(mx + w, my);
      ctx2.lineTo(mx - w, my);
      ctx2.closePath();
      ctx2.fillStyle = faceLight;
      ctx2.fill();
      ctx2.beginPath();
      ctx2.moveTo(mx, my - h);
      ctx2.lineTo(mx + w, my);
      ctx2.lineTo(mx, my);
      ctx2.closePath();
      ctx2.fillStyle = faceDark;
      ctx2.fill();
      const capH = h * 0.3;
      const capW = w * 0.3;
      ctx2.beginPath();
      ctx2.moveTo(mx, my - h);
      ctx2.lineTo(mx + capW, my - h + capH);
      ctx2.lineTo(mx + capW * 0.45, my - h + capH * 0.72);
      ctx2.lineTo(mx, my - h + capH * 1.08);
      ctx2.lineTo(mx - capW * 0.5, my - h + capH * 0.74);
      ctx2.lineTo(mx - capW, my - h + capH);
      ctx2.closePath();
      ctx2.fillStyle = snow;
      ctx2.fill();
      ctx2.strokeStyle = "#5c3a18";
      ctx2.lineWidth = 1.4;
      ctx2.beginPath();
      ctx2.moveTo(mx - w, my);
      ctx2.lineTo(mx, my - h);
      ctx2.lineTo(mx + w, my);
      ctx2.stroke();
      ctx2.beginPath();
      ctx2.moveTo(mx, my - h);
      ctx2.lineTo(mx + 4, my);
      ctx2.strokeStyle = "rgba(70,42,16,0.5)";
      ctx2.lineWidth = 1;
      ctx2.stroke();
    }
  }
  ctx2.restore();
}
function drawForestPatches(ctx2) {
  ctx2.save();
  drawTreeCluster(ctx2, 356, 246, 22, "#4f7a3a");
  drawTreeCluster(ctx2, 466, 300, 18, "#456d32");
  drawTreeCluster(ctx2, 250, 300, 12, "#527f3c");
  drawTreeCluster(ctx2, 836, 246, 16, "#465545");
  drawTreeCluster(ctx2, 946, 372, 20, "#3b4a37");
  ctx2.restore();
}
function drawTreeCluster(ctx2, cx, cy, count, color) {
  for (let i = 0; i < count; i++) {
    const tx = cx + (hash2(i, count) - 0.5) * 108;
    const ty = cy + (hash2(i, count + 41) - 0.5) * 78;
    const r = 8 + hash2(i, count + 77) * 5;
    ctx2.strokeStyle = "#523218";
    ctx2.lineWidth = 2;
    ctx2.beginPath();
    ctx2.moveTo(tx, ty);
    ctx2.lineTo(tx, ty + 7);
    ctx2.stroke();
    ctx2.beginPath();
    ctx2.arc(tx - r * 0.34, ty - 3, r * 0.86, 0, Math.PI * 2);
    ctx2.arc(tx + r * 0.42, ty - 1, r * 0.7, 0, Math.PI * 2);
    ctx2.fillStyle = color;
    ctx2.fill();
    ctx2.beginPath();
    ctx2.arc(tx + r * 0.34, ty + 1.4, r * 0.66, 0, Math.PI * 2);
    ctx2.fillStyle = "rgba(28,42,20,0.34)";
    ctx2.fill();
    ctx2.beginPath();
    ctx2.arc(tx - r * 0.5, ty - r * 0.52, r * 0.34, 0, Math.PI * 2);
    ctx2.fillStyle = "rgba(255,255,230,0.22)";
    ctx2.fill();
    ctx2.beginPath();
    ctx2.arc(tx - r * 0.2, ty - 3, r * 0.95, 0, Math.PI * 2);
    ctx2.strokeStyle = "rgba(34,48,24,0.75)";
    ctx2.lineWidth = 1;
    ctx2.stroke();
  }
}
function drawCompassRose(ctx2, cx, cy, r) {
  ctx2.save();
  ctx2.strokeStyle = "rgba(122,78,34,0.75)";
  ctx2.lineWidth = 2;
  ctx2.beginPath();
  ctx2.arc(cx, cy, r, 0, Math.PI * 2);
  ctx2.stroke();
  ctx2.lineWidth = 1;
  ctx2.beginPath();
  ctx2.arc(cx, cy, r * 0.86, 0, Math.PI * 2);
  ctx2.stroke();
  ctx2.beginPath();
  ctx2.arc(cx, cy, r * 0.42, 0, Math.PI * 2);
  ctx2.stroke();
  for (let i = 0; i < 8; i++) {
    const ang = Math.PI * 2 * i / 8 - Math.PI / 2;
    const cardinal = i % 2 === 0;
    const len = cardinal ? r * 0.92 : r * 0.6;
    const halfW = cardinal ? 9 : 6;
    const tipX = cx + Math.cos(ang) * len;
    const tipY = cy + Math.sin(ang) * len;
    const p = ang + Math.PI / 2;
    const hx = Math.cos(p) * halfW;
    const hy = Math.sin(p) * halfW;
    ctx2.beginPath();
    ctx2.moveTo(cx, cy);
    ctx2.lineTo(tipX, tipY);
    ctx2.lineTo(cx + hx, cy + hy);
    ctx2.closePath();
    ctx2.fillStyle = cardinal ? "#8f2b1e" : "#6b431e";
    ctx2.fill();
    ctx2.beginPath();
    ctx2.moveTo(cx, cy);
    ctx2.lineTo(tipX, tipY);
    ctx2.lineTo(cx - hx, cy - hy);
    ctx2.closePath();
    ctx2.fillStyle = cardinal ? GOLD2 : "#cbb596";
    ctx2.fill();
    ctx2.strokeStyle = "rgba(60,34,12,0.7)";
    ctx2.lineWidth = 1;
    ctx2.beginPath();
    ctx2.moveTo(cx - hx, cy - hy);
    ctx2.lineTo(tipX, tipY);
    ctx2.lineTo(cx + hx, cy + hy);
    ctx2.stroke();
  }
  ctx2.beginPath();
  ctx2.arc(cx, cy, 5, 0, Math.PI * 2);
  ctx2.fillStyle = GOLD_HI2;
  ctx2.fill();
  ctx2.strokeStyle = "#5c3a18";
  ctx2.lineWidth = 1.4;
  ctx2.stroke();
  ctx2.font = `bold 14px ${FONT_TITLE}`;
  ctx2.fillStyle = "#5a2d12";
  ctx2.textAlign = "center";
  ctx2.textBaseline = "middle";
  ctx2.fillText("N", cx, cy - r - 13);
  ctx2.fillText("S", cx, cy + r + 13);
  ctx2.fillText("E", cx + r + 14, cy);
  ctx2.fillText("W", cx - r - 14, cy);
  ctx2.restore();
}
function drawSeaMonster(ctx2, cx, cy) {
  ctx2.save();
  ctx2.strokeStyle = "#3f5866";
  ctx2.lineWidth = 2;
  ctx2.fillStyle = "rgba(78,106,122,0.22)";
  [[-34, 18, 0.55], [12, 26, 0.8], [62, 20, 0.65]].forEach(([ox, rr, al]) => {
    ctx2.globalAlpha = al;
    ctx2.beginPath();
    ctx2.arc(cx + ox, cy + 6, rr, Math.PI, 0);
    ctx2.closePath();
    ctx2.fill();
    ctx2.stroke();
    ctx2.strokeStyle = "rgba(255,255,255,0.55)";
    ctx2.lineWidth = 1.6;
    ctx2.beginPath();
    ctx2.moveTo(cx + ox - rr, cy + 6);
    ctx2.quadraticCurveTo(cx + ox, cy - 3, cx + ox + rr, cy + 6);
    ctx2.stroke();
    ctx2.strokeStyle = "#3f5866";
    ctx2.lineWidth = 2;
  });
  ctx2.globalAlpha = 1;
  ctx2.beginPath();
  ctx2.moveTo(cx + 50, cy - 16);
  ctx2.quadraticCurveTo(cx + 62, cy - 54, cx + 84, cy - 48);
  ctx2.lineTo(cx + 98, cy - 46);
  ctx2.quadraticCurveTo(cx + 92, cy - 34, cx + 84, cy - 28);
  ctx2.quadraticCurveTo(cx + 74, cy - 16, cx + 66, cy - 6);
  ctx2.closePath();
  ctx2.fill();
  ctx2.stroke();
  ctx2.beginPath();
  ctx2.moveTo(cx + 66, cy - 44);
  ctx2.lineTo(cx + 60, cy - 62);
  ctx2.lineTo(cx + 76, cy - 50);
  ctx2.closePath();
  ctx2.fillStyle = "#6d261b";
  ctx2.fill();
  ctx2.beginPath();
  ctx2.arc(cx + 88, cy - 42, 2.4, 0, Math.PI * 2);
  ctx2.fill();
  ctx2.strokeStyle = "#f5efe0";
  ctx2.lineWidth = 1.6;
  ctx2.beginPath();
  ctx2.moveTo(cx + 92, cy - 38);
  ctx2.lineTo(cx + 89, cy - 30);
  ctx2.moveTo(cx + 84, cy - 36);
  ctx2.lineTo(cx + 81, cy - 28);
  ctx2.stroke();
  ctx2.strokeStyle = "rgba(255,255,255,0.42)";
  ctx2.lineWidth = 1.2;
  [-22, 34, 74].forEach((ox) => {
    ctx2.beginPath();
    ctx2.ellipse(cx + ox, cy + 9, 20, 6, 0, 0, Math.PI * 2);
    ctx2.stroke();
  });
  ctx2.restore();
}
function drawCartographerNote(ctx2) {
  ctx2.save();
  ctx2.textAlign = "right";
  ctx2.textBaseline = "alphabetic";
  ctx2.font = `italic 13px ${FONT_TITLE}`;
  ctx2.fillStyle = "rgba(80,50,20,0.6)";
  ctx2.fillText("Realm of Valoria  \u2022  Royal Cartographer Sir Ethan", DESIGN_WIDTH - 42, DESIGN_HEIGHT - 34);
  ctx2.strokeStyle = "rgba(80,50,20,0.4)";
  ctx2.lineWidth = 1;
  ctx2.beginPath();
  ctx2.moveTo(DESIGN_WIDTH - 340, DESIGN_HEIGHT - 28);
  ctx2.lineTo(DESIGN_WIDTH - 42, DESIGN_HEIGHT - 28);
  ctx2.stroke();
  ctx2.restore();
}
function drawBurnedMapFrame(ctx2) {
  ctx2.save();
  const g = ctx2.createRadialGradient(
    DESIGN_WIDTH / 2,
    DESIGN_HEIGHT / 2,
    DESIGN_HEIGHT * 0.36,
    DESIGN_WIDTH / 2,
    DESIGN_HEIGHT / 2,
    DESIGN_WIDTH * 0.74
  );
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(0.72, "rgba(64,32,10,0.16)");
  g.addColorStop(1, "rgba(28,13,4,0.72)");
  ctx2.fillStyle = g;
  ctx2.fillRect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);
  ctx2.fillStyle = "rgba(40,20,8,0.34)";
  for (let i = 0; i < 220; i++) {
    const t = i / 220;
    const edge = i % 4;
    let x = 0;
    let y = 0;
    if (edge === 0) {
      x = t * DESIGN_WIDTH;
      y = hash2(i, 5) * 26;
    } else if (edge === 1) {
      x = t * DESIGN_WIDTH;
      y = DESIGN_HEIGHT - hash2(i, 6) * 26;
    } else if (edge === 2) {
      x = hash2(i, 7) * 26;
      y = t * DESIGN_HEIGHT;
    } else {
      x = DESIGN_WIDTH - hash2(i, 8) * 26;
      y = t * DESIGN_HEIGHT;
    }
    ctx2.beginPath();
    ctx2.arc(x, y, 6 + hash2(i, 9) * 14, 0, Math.PI * 2);
    ctx2.fill();
  }
  ctx2.strokeStyle = "#5a3818";
  ctx2.lineWidth = 2.4;
  ctx2.strokeRect(17, 17, DESIGN_WIDTH - 34, DESIGN_HEIGHT - 34);
  ctx2.lineWidth = 1;
  ctx2.strokeStyle = "rgba(90,56,24,0.75)";
  ctx2.strokeRect(24, 24, DESIGN_WIDTH - 48, DESIGN_HEIGHT - 48);
  [[24, 24], [DESIGN_WIDTH - 24, 24], [24, DESIGN_HEIGHT - 24], [DESIGN_WIDTH - 24, DESIGN_HEIGHT - 24]].forEach(([x, y]) => {
    ctx2.beginPath();
    ctx2.arc(x, y, 7, 0, Math.PI * 2);
    ctx2.fillStyle = "#6b431e";
    ctx2.fill();
    ctx2.strokeStyle = GOLD2;
    ctx2.lineWidth = 1.6;
    ctx2.stroke();
    ctx2.beginPath();
    ctx2.arc(x - 1.6, y - 1.6, 2.4, 0, Math.PI * 2);
    ctx2.fillStyle = GOLD_HI2;
    ctx2.fill();
  });
  ctx2.restore();
}
function drawAnimatedSeaDetails(ctx2, time) {
  ctx2.save();
  for (let i = 0; i < 9; i++) {
    const x = 120 + i * 132 + Math.sin(time * 0.7 + i * 1.3) * 22;
    const y = 96 + i % 4 * 168 + Math.cos(time * 0.5 + i) * 10;
    const w = 16 + i % 3 * 9;
    ctx2.strokeStyle = `rgba(255,255,255,${0.1 + i % 3 * 0.05})`;
    ctx2.lineWidth = 2;
    ctx2.beginPath();
    ctx2.moveTo(x, y);
    ctx2.lineTo(x + w, y);
    ctx2.stroke();
  }
  ctx2.strokeStyle = "rgba(255,255,255,0.5)";
  ctx2.lineWidth = 2;
  for (let i = 0; i < 24; i++) {
    const x = 40 + i * 52;
    const base = 688 + Math.sin(i * 1.7) * 22;
    const pulse = (Math.sin(time * 1.6 + i * 0.9) + 1) * 0.5;
    ctx2.globalAlpha = 0.16 + pulse * 0.4;
    ctx2.beginPath();
    ctx2.moveTo(x, base + 6 + pulse * 5);
    ctx2.quadraticCurveTo(x + 13, base - 3 + pulse * 5, x + 26, base + 6 + pulse * 5);
    ctx2.stroke();
  }
  ctx2.globalAlpha = 1;
  ctx2.restore();
}
function drawCampaignPath(ctx2, levels2, save2, time) {
  const nodes = getLevelNodePositions(levels2.length);
  ctx2.save();
  ctx2.lineCap = "round";
  for (let i = 0; i < nodes.length - 1; i++) {
    const p1 = nodes[i];
    const p2 = nodes[i + 1];
    const unlocked = i === 0 || !!save2.levelStars[levels2[i].id];
    const cpx = (p1.x + p2.x) / 2 + Math.sin(i * 2.1) * 24;
    const cpy = (p1.y + p2.y) / 2 - 46;
    const ribbon = buildRibbon(p1, { x: cpx, y: cpy }, p2, 72);
    const path = new Path2D();
    path.moveTo(p1.x, p1.y);
    path.quadraticCurveTo(cpx, cpy, p2.x, p2.y);
    ctx2.save();
    ctx2.translate(2, 5);
    ctx2.fillStyle = "rgba(58,32,10,0.28)";
    ctx2.fill(ribbon);
    ctx2.restore();
    const band = ctx2.createLinearGradient(0, p1.y - 40, 0, p2.y + 40);
    band.addColorStop(0, unlocked ? "#d0533c" : "#8a7f74");
    band.addColorStop(0.5, unlocked ? "#b03426" : "#6f665d");
    band.addColorStop(1, unlocked ? "#7d1f16" : "#544c45");
    ctx2.fillStyle = band;
    ctx2.fill(ribbon);
    ctx2.strokeStyle = unlocked ? GOLD2 : "#9c948a";
    ctx2.lineWidth = 2.6;
    ctx2.stroke(ribbon);
    ctx2.strokeStyle = "rgba(46,24,10,0.75)";
    ctx2.lineWidth = 1.1;
    ctx2.stroke(ribbon);
    ctx2.save();
    ctx2.setLineDash([11, 15]);
    ctx2.lineDashOffset = unlocked ? -time * 26 : 0;
    ctx2.strokeStyle = unlocked ? "rgba(255,236,180,0.72)" : "rgba(226,220,210,0.4)";
    ctx2.lineWidth = 2.4;
    ctx2.stroke(path);
    ctx2.restore();
    if (unlocked) {
      const ang = Math.atan2(p2.y - cpy, p2.x - cpx) * 0.5 + Math.atan2(p2.y - p1.y, p2.x - p1.x) * 0.5;
      ctx2.save();
      ctx2.translate((p1.x + p2.x) / 2, (p1.y + p2.y) / 2 - 26);
      ctx2.rotate(ang);
      ctx2.beginPath();
      ctx2.moveTo(9, 0);
      ctx2.lineTo(-7, -7);
      ctx2.lineTo(-3, 0);
      ctx2.lineTo(-7, 7);
      ctx2.closePath();
      ctx2.fillStyle = GOLD_HI2;
      ctx2.fill();
      ctx2.strokeStyle = "rgba(60,34,12,0.8)";
      ctx2.lineWidth = 1.2;
      ctx2.stroke();
      ctx2.restore();
    }
  }
  ctx2.restore();
}
function buildRibbon(p1, cp, p2, thickness) {
  const steps = 22;
  const half = thickness / 2;
  const left = [];
  const right = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = (1 - t) * (1 - t) * p1.x + 2 * (1 - t) * t * cp.x + t * t * p2.x;
    const y = (1 - t) * (1 - t) * p1.y + 2 * (1 - t) * t * cp.y + t * t * p2.y;
    const dx = 2 * (1 - t) * (cp.x - p1.x) + 2 * t * (p2.x - cp.x);
    const dy = 2 * (1 - t) * (cp.y - p1.y) + 2 * t * (p2.y - cp.y);
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    left.push({ x: x + nx * half, y: y + ny * half });
    right.push({ x: x - nx * half, y: y - ny * half });
  }
  const path = new Path2D();
  const cap = half * 0.8;
  path.moveTo(left[0].x, left[0].y);
  for (let i = 1; i < left.length; i++) path.lineTo(left[i].x, left[i].y);
  const end = left[left.length - 1];
  path.quadraticCurveTo(end.x + cap, end.y + cap, right[right.length - 1].x, right[right.length - 1].y);
  for (let i = right.length - 2; i >= 0; i--) path.lineTo(right[i].x, right[i].y);
  const start = right[0];
  path.quadraticCurveTo(start.x - cap, start.y - cap, left[0].x, left[0].y);
  path.closePath();
  return path;
}
function drawLevelStageMarker(ctx2, x, y, stageNum, stageName, unlocked, stars, hovered, selected, isNextBattle, time) {
  const active = hovered || selected;
  if (isNextBattle) {
    const pulse = (Math.sin(time * 3) + 1) * 0.5;
    ctx2.save();
    ctx2.strokeStyle = `rgba(255,214,102,${0.34 + pulse * 0.45})`;
    ctx2.lineWidth = 3 + pulse * 4;
    ctx2.beginPath();
    ctx2.arc(x, y, 44 + pulse * 9, 0, Math.PI * 2);
    ctx2.stroke();
    ctx2.strokeStyle = `rgba(255,246,214,${0.16 + pulse * 0.3})`;
    ctx2.lineWidth = 1.4;
    ctx2.beginPath();
    ctx2.arc(x, y, 54 + pulse * 12, 0, Math.PI * 2);
    ctx2.stroke();
    ctx2.restore();
    drawNextBattleRibbon(ctx2, x, y - 62, time);
  }
  ctx2.save();
  ctx2.fillStyle = "rgba(28,16,6,0.34)";
  ctx2.beginPath();
  ctx2.ellipse(x, y + 30, 30, 12, 0, 0, Math.PI * 2);
  ctx2.fill();
  if (active && unlocked) {
    const glow = ctx2.createRadialGradient(x, y, 4, x, y, 62);
    glow.addColorStop(0, "rgba(255,224,130,0.5)");
    glow.addColorStop(0.5, "rgba(255,204,90,0.2)");
    glow.addColorStop(1, "rgba(255,194,70,0)");
    ctx2.fillStyle = glow;
    ctx2.beginPath();
    ctx2.arc(x, y, 62, 0, Math.PI * 2);
    ctx2.fill();
  }
  ctx2.restore();
  if (unlocked) drawStageFlag(ctx2, x + 20, y - 22, stars > 0, time + stageNum);
  const scale = active ? 1.12 : 1;
  const lift = active ? -2 : 0;
  const sprite = sprites.get(
    `mapnode:${unlocked ? 1 : 0}:${stars > 0 ? 1 : 0}:${active ? 1 : 0}`,
    110,
    130,
    (c) => drawShieldMarker(c, 55, 66, unlocked, stars, active),
    2
  );
  sprites.blit(ctx2, sprite, x, y + 4 + lift, 110 * scale, 130 * scale);
  if (unlocked) {
    ctx2.save();
    ctx2.font = `bold 26px ${FONT_TITLE}`;
    ctx2.textAlign = "center";
    ctx2.textBaseline = "middle";
    ctx2.lineWidth = 4;
    ctx2.strokeStyle = "rgba(30,14,4,0.85)";
    ctx2.strokeText(`${stageNum}`, x, y + 3);
    ctx2.fillStyle = "#fff6d8";
    ctx2.fillText(`${stageNum}`, x, y + 3);
    ctx2.restore();
  } else {
    drawIcon(ctx2, "lock", x, y + 2, 30, 0.95);
  }
  ctx2.save();
  ctx2.font = `bold 15px ${FONT_TITLE}`;
  ctx2.textAlign = "center";
  ctx2.textBaseline = "middle";
  ctx2.lineWidth = 4.5;
  ctx2.strokeStyle = "rgba(52,28,8,0.9)";
  ctx2.strokeText(stageName, x, y + 50);
  ctx2.fillStyle = unlocked ? active ? GOLD_HI2 : "#f4e3bd" : "rgba(196,186,172,0.85)";
  ctx2.fillText(stageName, x, y + 50);
  ctx2.restore();
  if (unlocked && stars > 0) {
    ctx2.save();
    ctx2.translate(x, y + 71);
    const medal = sprites.get("mapmedal", 96, 44, (c) => drawStarMedal(c, 48, 22, stars), 2);
    sprites.blit(ctx2, medal, 0, 0, 96, 44);
    ctx2.restore();
  }
}
function drawShieldMarker(c, cx, cy, unlocked, stars, active) {
  const rimLight = unlocked ? active ? "#fff0b8" : "#e6c060" : "#8d8f9a";
  const rimDark = unlocked ? "#8a5f14" : "#3f434f";
  const fieldTop = unlocked ? stars > 0 ? "#b8352a" : "#3b5c8a" : "#4a505c";
  const fieldBottom = unlocked ? stars > 0 ? "#6d1a13" : "#1f3358" : "#2b303a";
  c.save();
  c.translate(cx, cy);
  shieldPath(c, 0, 0, 46, 56);
  const rimGrad = c.createLinearGradient(-46, -56, 46, 56);
  rimGrad.addColorStop(0, unlocked ? GOLD_HI2 : "#b6bac4");
  rimGrad.addColorStop(0.45, rimLight);
  rimGrad.addColorStop(0.55, unlocked ? GOLD2 : "#6d727d");
  rimGrad.addColorStop(1, rimDark);
  c.fillStyle = rimGrad;
  c.fill();
  c.strokeStyle = UI_INK;
  c.lineWidth = 3.4;
  c.stroke();
  shieldPath(c, 0, 1, 37, 46);
  const fieldGrad = c.createLinearGradient(0, -45, 0, 47);
  fieldGrad.addColorStop(0, fieldTop);
  fieldGrad.addColorStop(0.55, fieldBottom);
  fieldGrad.addColorStop(1, "#150f1e");
  c.fillStyle = fieldGrad;
  c.fill();
  c.strokeStyle = unlocked ? GOLD2 : "#20242c";
  c.lineWidth = 2.4;
  c.stroke();
  if (unlocked) {
    c.beginPath();
    c.moveTo(-24, 6);
    c.lineTo(0, -12);
    c.lineTo(24, 6);
    c.lineTo(24, 18);
    c.lineTo(0, 0);
    c.lineTo(-24, 18);
    c.closePath();
    c.fillStyle = stars > 0 ? "rgba(255,214,110,0.85)" : "rgba(214,226,255,0.5)";
    c.fill();
    c.strokeStyle = "rgba(40,20,8,0.6)";
    c.lineWidth = 1.4;
    c.stroke();
  } else {
    c.beginPath();
    c.moveTo(-14, -30);
    c.lineTo(-4, -12);
    c.lineTo(-12, 2);
    c.lineTo(2, 20);
    c.strokeStyle = "rgba(16,14,20,0.7)";
    c.lineWidth = 2;
    c.stroke();
  }
  [[-30, -22], [30, -22], [0, 42]].forEach(([rx, ry]) => {
    c.beginPath();
    c.arc(rx, ry, 4, 0, Math.PI * 2);
    c.fillStyle = unlocked ? GOLD_HI2 : "#9aa0ac";
    c.fill();
    c.strokeStyle = UI_INK;
    c.lineWidth = 1.8;
    c.stroke();
  });
  c.beginPath();
  c.moveTo(-40, -18);
  c.quadraticCurveTo(-34, -48, 0, -54);
  c.strokeStyle = "rgba(255,252,236,0.55)";
  c.lineWidth = 2.6;
  c.stroke();
  c.restore();
}
function shieldPath(c, cx, cy, w, h) {
  c.beginPath();
  c.moveTo(cx - w, cy - h * 0.7);
  c.lineTo(cx + w, cy - h * 0.7);
  c.lineTo(cx + w, cy + h * 0.1);
  c.quadraticCurveTo(cx + w, cy + h * 0.72, cx, cy + h);
  c.quadraticCurveTo(cx - w, cy + h * 0.72, cx - w, cy + h * 0.1);
  c.closePath();
}
function drawStarMedal(c, cx, cy, stars) {
  const w = 44;
  const h = 16;
  c.save();
  roundRect(c, cx - w, cy - h, w * 2, h * 2, 8);
  const plate = c.createLinearGradient(0, cy - h, 0, cy + h);
  plate.addColorStop(0, "#5a3a18");
  plate.addColorStop(0.5, "#3a2410");
  plate.addColorStop(1, "#22140a");
  c.fillStyle = plate;
  c.fill();
  c.strokeStyle = GOLD2;
  c.lineWidth = 1.8;
  c.stroke();
  c.strokeStyle = "rgba(255,244,214,0.22)";
  c.lineWidth = 1;
  roundRect(c, cx - w + 2.5, cy - h + 2.5, (w - 2.5) * 2, (h - 2.5) * 2, 6);
  c.stroke();
  for (let i = 0; i < 3; i++) {
    const on = i < stars;
    const sx = cx - 15 + i * 15;
    const r = 6.6;
    starPath2(c, sx, cy, r);
    if (on) {
      const g = c.createLinearGradient(sx, cy - r, sx, cy + r);
      g.addColorStop(0, "#fff6cf");
      g.addColorStop(0.5, GOLD2);
      g.addColorStop(1, "#a9741a");
      c.fillStyle = g;
      c.fill();
      c.strokeStyle = UI_INK;
      c.lineWidth = 1.4;
      c.stroke();
      c.beginPath();
      c.arc(sx - 1.6, cy - 2, 1.4, 0, Math.PI * 2);
      c.fillStyle = "rgba(255,255,255,0.8)";
      c.fill();
    } else {
      c.fillStyle = "rgba(24,16,10,0.6)";
      c.fill();
      c.strokeStyle = "rgba(180,150,90,0.45)";
      c.lineWidth = 1.2;
      c.stroke();
    }
  }
  c.restore();
}
function starPath2(c, cx, cy, r) {
  c.beginPath();
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? r : r * 0.45;
    const a = Math.PI * i / 5 - Math.PI / 2;
    const x = cx + Math.cos(a) * rad;
    const y = cy + Math.sin(a) * rad;
    if (i === 0) c.moveTo(x, y);
    else c.lineTo(x, y);
  }
  c.closePath();
}
function drawStageFlag(ctx2, px, py, victory, t) {
  ctx2.save();
  ctx2.strokeStyle = WOOD_DARK2;
  ctx2.lineWidth = 3;
  ctx2.beginPath();
  ctx2.moveTo(px, py + 24);
  ctx2.lineTo(px, py - 30);
  ctx2.stroke();
  ctx2.strokeStyle = "rgba(255,240,200,0.35)";
  ctx2.lineWidth = 1;
  ctx2.beginPath();
  ctx2.moveTo(px - 1, py + 22);
  ctx2.lineTo(px - 1, py - 28);
  ctx2.stroke();
  ctx2.beginPath();
  ctx2.arc(px, py - 31, 4, 0, Math.PI * 2);
  ctx2.fillStyle = GOLD2;
  ctx2.fill();
  ctx2.strokeStyle = UI_INK;
  ctx2.lineWidth = 1.4;
  ctx2.stroke();
  const flap = Math.sin(t * 4) * 4;
  ctx2.beginPath();
  ctx2.moveTo(px, py - 28);
  ctx2.quadraticCurveTo(px + 13 + flap, py - 26, px + 26 + flap, py - 23);
  ctx2.lineTo(px + 19 + flap * 0.7, py - 14);
  ctx2.lineTo(px + 26 + flap, py - 5);
  ctx2.quadraticCurveTo(px + 13, py - 7, px, py - 5);
  ctx2.closePath();
  const g = ctx2.createLinearGradient(px, py - 28, px + 26, py - 5);
  if (victory) {
    g.addColorStop(0, "#63c46a");
    g.addColorStop(1, "#1d6b32");
  } else {
    g.addColorStop(0, "#e2604c");
    g.addColorStop(1, "#8d2019");
  }
  ctx2.fillStyle = g;
  ctx2.fill();
  ctx2.strokeStyle = "rgba(40,20,8,0.75)";
  ctx2.lineWidth = 1.4;
  ctx2.stroke();
  ctx2.restore();
}
function drawNextBattleRibbon(ctx2, x, y, time) {
  const bounce = Math.sin(time * 4) * 3;
  const w = 118;
  const h = 26;
  ctx2.save();
  ctx2.translate(x, y + bounce);
  [-1, 1].forEach((dir) => {
    ctx2.beginPath();
    ctx2.moveTo(dir * (w / 2 - 1), -h / 2 + 1);
    ctx2.lineTo(dir * (w / 2 + 15), 0);
    ctx2.lineTo(dir * (w / 2 - 1), h / 2 - 1);
    ctx2.closePath();
    ctx2.fillStyle = BLOOD_DARK;
    ctx2.fill();
    ctx2.strokeStyle = UI_INK;
    ctx2.lineWidth = 1.6;
    ctx2.stroke();
  });
  roundRect(ctx2, -w / 2, -h / 2, w, h, 5);
  const g = ctx2.createLinearGradient(0, -h / 2, 0, h / 2);
  g.addColorStop(0, "#d8503a");
  g.addColorStop(0.5, BLOOD);
  g.addColorStop(1, BLOOD_DARK);
  ctx2.fillStyle = g;
  ctx2.fill();
  ctx2.strokeStyle = GOLD2;
  ctx2.lineWidth = 2;
  ctx2.stroke();
  ctx2.strokeStyle = "rgba(255,240,206,0.35)";
  ctx2.lineWidth = 1;
  roundRect(ctx2, -w / 2 + 2.5, -h / 2 + 2.5, w - 5, h - 5, 3);
  ctx2.stroke();
  drawIcon(ctx2, "hammer", -42, 0, 17);
  ctx2.font = `bold 12px ${FONT_TITLE}`;
  ctx2.textAlign = "center";
  ctx2.textBaseline = "middle";
  ctx2.fillStyle = "rgba(24,10,4,0.8)";
  ctx2.fillText("NEXT BATTLE", 9, 1.6);
  ctx2.fillStyle = "#fff4dc";
  ctx2.fillText("NEXT BATTLE", 8, 0);
  ctx2.restore();
}
function stateKey(st) {
  return `${st.hover ? "h" : "-"}${st.press ? "p" : "-"}${st.disabled ? "d" : "-"}${st.selected ? "s" : "-"}`;
}
function drawFrame(ctx2, key, x, y, w, h, st = {}) {
  const sprite = sprites.get(
    `frame:${key}:${Math.round(w)}x${Math.round(h)}:${stateKey(st)}`,
    Math.round(w),
    Math.round(h),
    (c, cw, ch) => paintWoodFrame(c, cw, ch, st),
    2
  );
  const dy = st.press ? 2 : 0;
  sprites.blit(ctx2, sprite, x + w / 2, y + h / 2 + dy, w, h);
}
function paintWoodFrame(c, w, h, st) {
  const r = Math.min(9, h * 0.28);
  const pad = 2;
  roundRect(c, 1, 1, w - 2, h - 2, r);
  c.fillStyle = st.disabled ? "#2a2530" : UI_INK;
  c.fill();
  roundRect(c, pad, pad, w - pad * 2, h - pad * 2, r - 1);
  const bevel = c.createLinearGradient(0, 0, w, h);
  if (st.disabled) {
    bevel.addColorStop(0, "#6c6a72");
    bevel.addColorStop(0.5, "#4d4b55");
    bevel.addColorStop(1, "#33313a");
  } else if (st.press) {
    bevel.addColorStop(0, GOLD_DARK2);
    bevel.addColorStop(0.5, "#a97c22");
    bevel.addColorStop(1, GOLD_HI2);
  } else {
    bevel.addColorStop(0, st.hover ? "#fff6d2" : GOLD_HI2);
    bevel.addColorStop(0.42, st.hover ? GOLD_HI2 : GOLD2);
    bevel.addColorStop(0.58, GOLD_DARK2);
    bevel.addColorStop(1, "#5e3f0d");
  }
  c.fillStyle = bevel;
  c.fill();
  const inset = 4.5;
  roundRect(c, pad + inset, pad + inset, w - (pad + inset) * 2, h - (pad + inset) * 2, Math.max(2, r - 4));
  const face = c.createLinearGradient(0, pad + inset, 0, h - pad - inset);
  if (st.disabled) {
    face.addColorStop(0, "#4c4a52");
    face.addColorStop(0.55, "#3d3b44");
    face.addColorStop(1, "#2c2a32");
  } else if (st.press) {
    face.addColorStop(0, "#4a2b11");
    face.addColorStop(0.55, "#3c220c");
    face.addColorStop(1, "#2a1607");
  } else if (st.hover) {
    face.addColorStop(0, "#b57c33");
    face.addColorStop(0.5, "#8f5b24");
    face.addColorStop(1, "#5b3714");
  } else if (st.selected) {
    face.addColorStop(0, "#c58c3c");
    face.addColorStop(0.5, "#9c6528");
    face.addColorStop(1, "#653e16");
  } else {
    face.addColorStop(0, WOOD_HI);
    face.addColorStop(0.5, WOOD2);
    face.addColorStop(1, WOOD_DARK2);
  }
  c.fillStyle = face;
  c.fill();
  c.save();
  roundRect(c, pad + inset, pad + inset, w - (pad + inset) * 2, h - (pad + inset) * 2, Math.max(2, r - 4));
  c.clip();
  paintGrain(c, w, h, st.disabled ? 0.1 : 0.16);
  const topSheen = c.createLinearGradient(0, pad + inset, 0, pad + inset + Math.max(7, h * 0.42));
  topSheen.addColorStop(0, `rgba(255,246,214,${st.press ? 0.1 : 0.3})`);
  topSheen.addColorStop(1, "rgba(255,246,214,0)");
  c.fillStyle = topSheen;
  c.fillRect(0, 0, w, h);
  const bottomShade = c.createLinearGradient(0, h - pad - inset - Math.max(7, h * 0.4), 0, h - pad - inset);
  bottomShade.addColorStop(0, "rgba(24,12,4,0)");
  bottomShade.addColorStop(1, "rgba(24,12,4,0.42)");
  c.fillStyle = bottomShade;
  c.fillRect(0, 0, w, h);
  c.restore();
  roundRect(c, pad + inset, pad + inset, w - (pad + inset) * 2, h - (pad + inset) * 2, Math.max(2, r - 4));
  c.strokeStyle = st.disabled ? "rgba(180,180,190,0.25)" : "rgba(255,240,200,0.42)";
  c.lineWidth = 1.4;
  c.stroke();
  if (st.selected && !st.disabled) {
    roundRect(c, pad + inset + 2, pad + inset + 2, w - (pad + inset + 2) * 2, h - (pad + inset + 2) * 2, Math.max(2, r - 6));
    c.strokeStyle = "rgba(255,222,132,0.55)";
    c.lineWidth = 1.6;
    c.stroke();
  }
  if (w >= 56 && h >= 28) {
    const rx = 9;
    const ry = 9;
    [[rx, ry], [w - rx, ry], [rx, h - ry], [w - rx, h - ry]].forEach(([px, py], i) => {
      const bright = (i === 0 || i === 3) && !st.press;
      c.beginPath();
      c.arc(px, py, Math.min(3.2, h * 0.075), 0, Math.PI * 2);
      c.fillStyle = st.disabled ? "#71717c" : bright ? GOLD_HI2 : "#c79a3a";
      c.fill();
      c.strokeStyle = "rgba(30,16,4,0.7)";
      c.lineWidth = 1.2;
      c.stroke();
    });
  }
}
function paintGrain(c, w, h, alpha) {
  c.lineCap = "round";
  const lines = Math.max(4, Math.round(h / 5));
  for (let i = 0; i < lines; i++) {
    const t = (i + 0.5) / lines;
    const y = t * h;
    c.beginPath();
    c.moveTo(-4, y);
    let x = -4;
    let yy = y;
    while (x < w + 4) {
      const step = 22 + hash2(i, x) * 34;
      const nx = x + step;
      const ny = y + (hash2(i, x + 7) - 0.5) * 4.2;
      c.quadraticCurveTo((x + nx) / 2, yy - 2.2, nx, ny);
      x = nx;
      yy = ny;
    }
    c.strokeStyle = i % 3 === 0 ? `rgba(255,232,182,${alpha * 0.5})` : `rgba(44,22,6,${alpha})`;
    c.lineWidth = i % 3 === 0 ? 1 : 1.6;
    c.stroke();
  }
  for (let i = 0; i < 3; i++) {
    const kx = (0.18 + hash2(i, 21) * 0.64) * w;
    const ky = (0.22 + hash2(i, 22) * 0.56) * h;
    c.beginPath();
    c.ellipse(kx, ky, 7 + hash2(i, 23) * 7, 3 + hash2(i, 24) * 2.6, 0, 0, Math.PI * 2);
    c.strokeStyle = `rgba(40,20,6,${alpha * 0.85})`;
    c.lineWidth = 1.3;
    c.stroke();
    c.beginPath();
    c.ellipse(kx, ky, 4 + hash2(i, 25) * 3, 1.6, 0, 0, Math.PI * 2);
    c.strokeStyle = `rgba(255,232,182,${alpha * 0.4})`;
    c.lineWidth = 1;
    c.stroke();
  }
}
function roundRect(c, x, y, w, h, r) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  c.beginPath();
  c.moveTo(x + rr, y);
  c.lineTo(x + w - rr, y);
  c.quadraticCurveTo(x + w, y, x + w, y + rr);
  c.lineTo(x + w, y + h - rr);
  c.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  c.lineTo(x + rr, y + h);
  c.quadraticCurveTo(x, y + h, x, y + h - rr);
  c.lineTo(x, y + rr);
  c.quadraticCurveTo(x, y, x + rr, y);
  c.closePath();
}
function drawParchmentModal(ctx2, key, x, y, w, h) {
  const sprite = sprites.get(
    `parch:${key}:${Math.round(w)}x${Math.round(h)}`,
    Math.round(w),
    Math.round(h),
    (c, cw, ch) => paintParchmentSheet(c, cw, ch),
    2
  );
  sprites.blit(ctx2, sprite, x + w / 2, y + h / 2, w, h);
}
function paintParchmentSheet(c, w, h) {
  c.save();
  c.shadowColor = "rgba(12,6,2,0.6)";
  c.shadowBlur = 22;
  c.shadowOffsetY = 8;
  roundRect(c, 3, 3, w - 6, h - 6, 8);
  c.fillStyle = PARCHMENT;
  c.fill();
  c.restore();
  const body2 = c.createLinearGradient(0, 0, w * 0.4, h);
  body2.addColorStop(0, PARCHMENT_HI);
  body2.addColorStop(0.5, PARCHMENT);
  body2.addColorStop(1, PARCHMENT_DARK);
  roundRect(c, 3, 3, w - 6, h - 6, 8);
  c.fillStyle = body2;
  c.fill();
  c.save();
  roundRect(c, 3, 3, w - 6, h - 6, 8);
  c.clip();
  const corner = c.createRadialGradient(0, 0, 10, 0, 0, Math.max(w, h) * 0.75);
  corner.addColorStop(0, "rgba(160,110,44,0.22)");
  corner.addColorStop(1, "rgba(160,110,44,0)");
  c.fillStyle = corner;
  c.fillRect(0, 0, w, h);
  const corner2 = c.createRadialGradient(w, h, 10, w, h, Math.max(w, h) * 0.7);
  corner2.addColorStop(0, "rgba(150,100,40,0.2)");
  corner2.addColorStop(1, "rgba(150,100,40,0)");
  c.fillStyle = corner2;
  c.fillRect(0, 0, w, h);
  for (let i = 0; i < 700; i++) {
    const px = hash2(i, 31) * w;
    const py = hash2(i, 32) * h;
    const a = hash2(i, 33);
    c.fillStyle = a > 0.5 ? "rgba(126,90,42,0.05)" : "rgba(255,250,232,0.06)";
    c.fillRect(px, py, 1 + a * 1.6, 1 + a * 1.4);
  }
  c.restore();
  roundRect(c, 6, 6, w - 12, h - 12, 6);
  c.strokeStyle = "#9a6b31";
  c.lineWidth = 2.4;
  c.stroke();
  roundRect(c, 11, 11, w - 22, h - 22, 4);
  c.strokeStyle = "rgba(154,107,49,0.5)";
  c.lineWidth = 1;
  c.stroke();
  roundRect(c, 3, 3, w - 6, h - 6, 8);
  c.strokeStyle = "rgba(74,44,16,0.85)";
  c.lineWidth = 1.6;
  c.stroke();
}
function drawDowel(ctx2, x, y, w, h, key) {
  const sprite = sprites.get(
    `dowel:${key}:${Math.round(w)}x${Math.round(h)}`,
    Math.round(w),
    Math.round(h),
    (c, cw, ch) => paintDowel(c, cw, ch),
    2
  );
  sprites.blit(ctx2, sprite, x + w / 2, y + h / 2, w, h);
}
function paintDowel(c, w, h) {
  const r = h / 2;
  c.save();
  c.shadowColor = "rgba(10,5,2,0.55)";
  c.shadowBlur = 10;
  c.shadowOffsetY = 4;
  roundRect(c, 1, 1, w - 2, h - 2, r);
  c.fillStyle = WOOD_DARK2;
  c.fill();
  c.restore();
  roundRect(c, 1, 1, w - 2, h - 2, r);
  const g = c.createLinearGradient(0, 1, 0, h - 1);
  g.addColorStop(0, "#93602b");
  g.addColorStop(0.28, "#6d4319");
  g.addColorStop(0.62, "#4e2e11");
  g.addColorStop(1, "#2c1807");
  c.fillStyle = g;
  c.fill();
  c.save();
  roundRect(c, 1, 1, w - 2, h - 2, r);
  c.clip();
  paintGrain(c, w, h, 0.14);
  c.fillStyle = "rgba(255,240,206,0.18)";
  c.fillRect(0, 2, w, Math.max(1, h * 0.18));
  c.restore();
  roundRect(c, 1, 1, w - 2, h - 2, r);
  c.strokeStyle = "rgba(24,12,4,0.8)";
  c.lineWidth = 1.6;
  c.stroke();
  [0, w - 16].forEach((cx) => {
    roundRect(c, cx + 1, 2, 14, h - 4, 5);
    const cap = c.createLinearGradient(cx, 0, cx + 16, h);
    cap.addColorStop(0, GOLD_HI2);
    cap.addColorStop(0.5, GOLD2);
    cap.addColorStop(1, GOLD_DARK2);
    c.fillStyle = cap;
    c.fill();
    c.strokeStyle = "rgba(60,34,10,0.8)";
    c.lineWidth = 1.2;
    c.stroke();
  });
}
function drawWaxSeal(ctx2, cx, cy, r, key) {
  const sprite = sprites.get(
    `seal:${key}:${Math.round(r)}`,
    r * 2,
    r * 2,
    (c, cw) => paintWaxSeal(c, cw / 2, cw / 2, cw / 2 - 1),
    2
  );
  sprites.blit(ctx2, sprite, cx, cy, r * 2, r * 2);
}
function paintWaxSeal(c, cx, cy, r) {
  c.beginPath();
  for (let i = 0; i < 18; i++) {
    const a = Math.PI * 2 * i / 18;
    const rr = r * (0.92 + hash2(i, 51) * 0.12);
    const x = cx + Math.cos(a) * rr;
    const y = cy + Math.sin(a) * rr;
    if (i === 0) c.moveTo(x, y);
    else c.lineTo(x, y);
  }
  c.closePath();
  const g = c.createRadialGradient(cx - r * 0.4, cy - r * 0.45, r * 0.15, cx, cy, r);
  g.addColorStop(0, "#e05a45");
  g.addColorStop(0.45, "#ae2a1e");
  g.addColorStop(1, "#66140f");
  c.fillStyle = g;
  c.fill();
  c.strokeStyle = "rgba(40,10,6,0.8)";
  c.lineWidth = 2;
  c.stroke();
  c.beginPath();
  c.arc(cx, cy, r * 0.7, 0, Math.PI * 2);
  c.strokeStyle = "rgba(255,190,170,0.35)";
  c.lineWidth = 1.6;
  c.stroke();
  c.beginPath();
  c.arc(cx, cy, r * 0.6, 0, Math.PI * 2);
  c.strokeStyle = "rgba(60,12,8,0.5)";
  c.lineWidth = 1.4;
  c.stroke();
  const s = r * 0.4;
  c.beginPath();
  c.moveTo(cx - s, cy + s * 0.55);
  c.lineTo(cx + s, cy + s * 0.55);
  c.lineTo(cx + s * 1.15, cy - s * 0.6);
  c.lineTo(cx + s * 0.55, cy - s * 0.05);
  c.lineTo(cx, cy - s * 0.85);
  c.lineTo(cx - s * 0.55, cy - s * 0.05);
  c.lineTo(cx - s * 1.15, cy - s * 0.6);
  c.closePath();
  c.fillStyle = "rgba(255,214,150,0.85)";
  c.fill();
  c.strokeStyle = "rgba(70,16,10,0.7)";
  c.lineWidth = 1.2;
  c.stroke();
}
function drawStarRow(ctx2, cx, cy, r, filled) {
  for (let i = 0; i < 3; i++) {
    const sx = cx - r * 2.6 + i * r * 2.6;
    const on = i < filled;
    const sprite = sprites.get(
      `star:${on ? 1 : 0}:${Math.round(r)}`,
      r * 2.6,
      r * 2.6,
      (c, cw) => paintStar(c, cw / 2, cw / 2, cw / 2 - 2, on),
      2
    );
    sprites.blit(ctx2, sprite, sx, cy, r * 2.6, r * 2.6);
  }
}
function paintStar(c, cx, cy, r, on) {
  starPath2(c, cx, cy, r);
  if (on) {
    const g = c.createLinearGradient(cx - r * 0.6, cy - r, cx + r * 0.5, cy + r);
    g.addColorStop(0, "#fff8d8");
    g.addColorStop(0.42, GOLD2);
    g.addColorStop(1, "#a9741a");
    c.fillStyle = g;
    c.fill();
    c.strokeStyle = UI_INK;
    c.lineWidth = 2;
    c.stroke();
    c.save();
    c.clip();
    c.fillStyle = "rgba(96,54,10,0.28)";
    c.beginPath();
    c.moveTo(cx, cy - r);
    c.lineTo(cx + r, cy);
    c.lineTo(cx, cy + r);
    c.closePath();
    c.fill();
    c.beginPath();
    c.arc(cx - r * 0.3, cy - r * 0.35, r * 0.13, 0, Math.PI * 2);
    c.fillStyle = "rgba(255,255,255,0.75)";
    c.fill();
    c.restore();
  } else {
    c.fillStyle = "rgba(96,72,40,0.35)";
    c.fill();
    c.strokeStyle = "rgba(70,44,18,0.7)";
    c.lineWidth = 1.8;
    c.stroke();
  }
}
function drawStageBriefingModal(ctx2, level, stageIndex, stars, mousePos, time) {
  const modalW = 540;
  const modalH = 430;
  const mx = (DESIGN_WIDTH - modalW) / 2;
  const my = (DESIGN_HEIGHT - modalH) / 2;
  ctx2.save();
  ctx2.fillStyle = "rgba(6,4,12,0.62)";
  ctx2.fillRect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);
  drawDowel(ctx2, mx - 26, my - 14, modalW + 52, 26, "top");
  drawDowel(ctx2, mx - 26, my + modalH - 12, modalW + 52, 26, "bottom");
  drawParchmentModal(ctx2, "brief", mx, my, modalW, modalH);
  const bandH = 52;
  roundRect(ctx2, mx + 16, my + 16, modalW - 32, bandH, 7);
  const band = ctx2.createLinearGradient(0, my + 16, 0, my + 16 + bandH);
  band.addColorStop(0, "#7d2420");
  band.addColorStop(0.5, "#5d1714");
  band.addColorStop(1, "#38090a");
  ctx2.fillStyle = band;
  ctx2.fill();
  ctx2.strokeStyle = GOLD2;
  ctx2.lineWidth = 2.2;
  ctx2.stroke();
  ctx2.strokeStyle = "rgba(255,236,190,0.3)";
  ctx2.lineWidth = 1;
  roundRect(ctx2, mx + 19.5, my + 19.5, modalW - 39, bandH - 7, 5);
  ctx2.stroke();
  ctx2.font = `bold 25px ${FONT_TITLE}`;
  ctx2.textAlign = "center";
  ctx2.textBaseline = "middle";
  const title = `Stage ${stageIndex}: ${level.name}`;
  ctx2.fillStyle = "rgba(20,6,4,0.85)";
  ctx2.fillText(title, DESIGN_WIDTH / 2, my + 16 + bandH / 2 + 2);
  ctx2.fillStyle = "#ffeec2";
  ctx2.fillText(title, DESIGN_WIDTH / 2, my + 16 + bandH / 2);
  drawStarRow(ctx2, DESIGN_WIDTH / 2, my + 90, 12, stars);
  drawWaxSeal(ctx2, DESIGN_WIDTH / 2 + 52, my + 88, 18, "brief");
  drawDivider(ctx2, mx + 60, my + 116, modalW - 120);
  drawIcon(ctx2, "hammer", mx + 44, my + 116, 17);
  const briefings = {
    level_1: {
      lore: "Goblin scouts have broken through our border outposts! Form a defensive perimeter.",
      enemyHint: "Enemies: Goblins & Dire Wolves"
    },
    level_2: {
      lore: "The enemy is pushing through the dense pine mountain pass. Beware armored Orc Warriors!",
      enemyHint: "Enemies: Orc Warriors, Wolves & Goblins"
    },
    level_3: {
      lore: "Hold the chasm crossing at all costs! Airborne Giant Bats are bypassing ground barricades.",
      enemyHint: "Enemies: Giant Bats (Flying), Orc Warriors, Wolves"
    },
    level_4: {
      lore: "The swamp waters conceal Dark Shamans who heal nearby wounded allies and colossal Trolls.",
      enemyHint: "Enemies: Dark Shaman (AoE Heals), Trolls (Regen)"
    },
    level_5: {
      lore: "THE FINAL STAND. The ferocious Orc Warlord leads the horde to tear down the Bastion gates!",
      enemyHint: "BOSS BATTLE: The Orc Warlord & Vanguard Elite"
    }
  };
  const info = briefings[level.id] ?? {
    lore: "Defend the fortress and drive back the invading hordes!",
    enemyHint: "Multiple enemy types approaching"
  };
  ctx2.font = `italic 15px ${FONT_UI}`;
  ctx2.fillStyle = "#40301c";
  ctx2.textAlign = "center";
  wrapText(ctx2, info.lore, DESIGN_WIDTH / 2, my + 140, modalW - 96, 20, 3);
  const pillsY = my + 196;
  const pillW = 150;
  drawIntelPill(ctx2, mx + 30, pillsY, pillW, 44, "gold", `${level.startingGold}`, "Gold");
  drawIntelPill(ctx2, mx + 195, pillsY, pillW, 44, "heart", `${level.startingLives}`, "Lives");
  drawIntelPill(ctx2, mx + 360, pillsY, pillW, 44, "wave", `${level.waves.length}`, "Waves");
  ctx2.font = `bold 14px ${FONT_UI}`;
  ctx2.fillStyle = "#8d2019";
  ctx2.textAlign = "center";
  ctx2.fillText(info.enemyHint, DESIGN_WIDTH / 2, my + 268);
  const btnW = 260;
  const btnH = 55;
  const btnX = DESIGN_WIDTH / 2 - btnW / 2;
  const btnY = my + 320;
  const btnHover = inRect(mousePos, btnX, btnY, btnW, btnH);
  drawActionButton(ctx2, "tobattle", btnX, btnY, btnW, btnH, "TO BATTLE", "hammer", { hover: btnHover });
  const closeX = mx + modalW - 32;
  const closeY = my + 22;
  drawRoundIconButton(
    ctx2,
    "briefclose",
    closeX,
    closeY,
    28,
    "close",
    inRect(mousePos, closeX - 18, closeY - 18, 36, 36)
  );
  ctx2.save();
  const sheen = time * 0.25 % 1 * (modalW + 200) - 100;
  ctx2.globalCompositeOperation = "lighter";
  const sheenGrad = ctx2.createLinearGradient(mx + sheen - 60, my, mx + sheen + 60, my + modalH);
  sheenGrad.addColorStop(0, "rgba(255,244,214,0)");
  sheenGrad.addColorStop(0.5, "rgba(255,244,214,0.05)");
  sheenGrad.addColorStop(1, "rgba(255,244,214,0)");
  ctx2.fillStyle = sheenGrad;
  ctx2.fillRect(mx, my, modalW, modalH);
  ctx2.restore();
  ctx2.restore();
}
function drawDivider(ctx2, x, y, w) {
  ctx2.save();
  const g = ctx2.createLinearGradient(x, y, x + w, y);
  g.addColorStop(0, "rgba(138,95,20,0)");
  g.addColorStop(0.5, "rgba(138,95,20,0.85)");
  g.addColorStop(1, "rgba(138,95,20,0)");
  ctx2.strokeStyle = g;
  ctx2.lineWidth = 1.8;
  ctx2.beginPath();
  ctx2.moveTo(x, y);
  ctx2.lineTo(x + w, y);
  ctx2.stroke();
  ctx2.fillStyle = "rgba(138,95,20,0.9)";
  ctx2.beginPath();
  ctx2.moveTo(x + w / 2, y - 5);
  ctx2.lineTo(x + w / 2 + 6, y);
  ctx2.lineTo(x + w / 2, y + 5);
  ctx2.lineTo(x + w / 2 - 6, y);
  ctx2.closePath();
  ctx2.fill();
  ctx2.restore();
}
function drawIntelPill(ctx2, x, y, w, h, icon, value, label) {
  const sprite = sprites.get(`pill:${w}x${h}`, w, h, (c, cw, ch) => paintIntelPill(c, cw, ch), 2);
  sprites.blit(ctx2, sprite, x + w / 2, y + h / 2, w, h);
  drawIcon(ctx2, icon, x + 24, y + h / 2, 26);
  ctx2.textAlign = "left";
  ctx2.textBaseline = "middle";
  ctx2.font = `bold 20px ${FONT_TITLE}`;
  ctx2.fillStyle = "#3c2408";
  ctx2.fillText(value, x + 44, y + h / 2 - 1);
  const vw = ctx2.measureText(value).width;
  ctx2.font = `12px ${FONT_UI}`;
  ctx2.fillStyle = "rgba(70,46,18,0.75)";
  ctx2.fillText(label, x + 48 + vw, y + h / 2 + 2);
}
function paintIntelPill(c, w, h) {
  roundRect(c, 1, 1, w - 2, h - 2, 7);
  const g = c.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "rgba(255,250,232,0.95)");
  g.addColorStop(0.55, "rgba(236,215,178,0.95)");
  g.addColorStop(1, "rgba(206,176,130,0.95)");
  c.fillStyle = g;
  c.fill();
  c.strokeStyle = "#8a5f14";
  c.lineWidth = 1.8;
  c.stroke();
  c.strokeStyle = "rgba(255,255,240,0.6)";
  c.lineWidth = 1;
  roundRect(c, 3.5, 3.5, w - 7, h - 7, 5);
  c.stroke();
}
function drawActionButton(ctx2, key, x, y, w, h, label, icon, st) {
  applyButtonState(ctx2, x, y, w, h, st, () => {
    drawFrame(ctx2, key, x, y, w, h, st);
    ctx2.save();
    roundRect(ctx2, x + 4.5, y + 4.5, w - 9, h - 9, 5);
    const tint = ctx2.createLinearGradient(0, y, 0, y + h);
    if (st.disabled) {
      tint.addColorStop(0, "rgba(120,120,130,0.35)");
      tint.addColorStop(1, "rgba(60,60,70,0.35)");
    } else if (st.press) {
      tint.addColorStop(0, "rgba(120,26,16,0.5)");
      tint.addColorStop(1, "rgba(60,10,6,0.45)");
    } else {
      tint.addColorStop(0, "rgba(196,58,40,0.42)");
      tint.addColorStop(0.5, "rgba(140,30,20,0.34)");
      tint.addColorStop(1, "rgba(80,14,10,0.42)");
    }
    ctx2.fillStyle = tint;
    ctx2.fill();
    ctx2.restore();
    if (st.hover && !st.disabled) drawSheen(ctx2, x, y, w, h, 1);
    drawLabel(ctx2, label, x + w / 2 + (icon ? 14 : 0), y + h / 2, Math.min(28, h * 0.46), icon, x + (icon ? 16 : 0));
  });
}
function drawMedallion(ctx2, key, cx, cy, r, icon, st, ring) {
  const size = r * 2;
  const sprite = sprites.get(
    `medal:${key}:${Math.round(r)}:${stateKey(st)}`,
    Math.round(size),
    Math.round(size),
    (c, cw) => paintMedallion(c, cw / 2, cw / 2 - 1, cw / 2 - 2, st),
    2
  );
  const dy = st.press ? 2 : 0;
  sprites.blit(ctx2, sprite, cx, cy + dy, size, size);
  if (ring) {
    ctx2.save();
    ctx2.strokeStyle = ring.color;
    ctx2.lineWidth = ring.width;
    ctx2.beginPath();
    ctx2.arc(cx, cy + dy, r + ring.width, 0, Math.PI * 2);
    ctx2.stroke();
    ctx2.restore();
  }
  drawIcon(ctx2, icon, cx, cy + dy, r * 1.15, st.disabled ? 0.55 : 1);
}
function paintMedallion(c, cx, cy, r, st) {
  c.save();
  c.shadowColor = "rgba(8,4,2,0.6)";
  c.shadowBlur = 12;
  c.shadowOffsetY = 5;
  c.beginPath();
  c.arc(cx, cy, r, 0, Math.PI * 2);
  c.fillStyle = UI_INK;
  c.fill();
  c.restore();
  c.beginPath();
  c.arc(cx, cy, r, 0, Math.PI * 2);
  const bezel = c.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
  if (st.disabled) {
    bezel.addColorStop(0, "#7b7982");
    bezel.addColorStop(0.5, "#565460");
    bezel.addColorStop(1, "#35333c");
  } else if (st.press) {
    bezel.addColorStop(0, GOLD_DARK2);
    bezel.addColorStop(0.55, "#a97c22");
    bezel.addColorStop(1, GOLD_HI2);
  } else {
    bezel.addColorStop(0, st.hover ? "#fff8dc" : GOLD_HI2);
    bezel.addColorStop(0.42, st.hover ? GOLD_HI2 : GOLD2);
    bezel.addColorStop(0.62, GOLD_DARK2);
    bezel.addColorStop(1, "#5c3d0c");
  }
  c.fillStyle = bezel;
  c.fill();
  c.strokeStyle = UI_INK;
  c.lineWidth = 2.4;
  c.stroke();
  const ir = r * 0.74;
  c.beginPath();
  c.arc(cx, cy, ir, 0, Math.PI * 2);
  const disc = c.createRadialGradient(cx - ir * 0.35, cy - ir * 0.45, ir * 0.12, cx, cy, ir);
  if (st.disabled) {
    disc.addColorStop(0, "#6a6870");
    disc.addColorStop(0.6, "#45434c");
    disc.addColorStop(1, "#26242c");
  } else if (st.press) {
    disc.addColorStop(0, "#6d3a14");
    disc.addColorStop(0.6, "#4a240c");
    disc.addColorStop(1, "#2a1306");
  } else {
    disc.addColorStop(0, "#a8702c");
    disc.addColorStop(0.55, "#7c4c1c");
    disc.addColorStop(1, "#3d2110");
  }
  c.fillStyle = disc;
  c.fill();
  c.strokeStyle = "rgba(255,238,196,0.35)";
  c.lineWidth = 1.4;
  c.stroke();
  if (r >= 18) {
    for (let i = 0; i < 8; i++) {
      const a = Math.PI * 2 * i / 8 + Math.PI / 8;
      const px = cx + Math.cos(a) * (r * 0.87);
      const py = cy + Math.sin(a) * (r * 0.87);
      c.beginPath();
      c.arc(px, py, 2.2, 0, Math.PI * 2);
      c.fillStyle = st.disabled ? "#8b8b95" : i < 4 ? GOLD_HI2 : "#c19434";
      c.fill();
      c.strokeStyle = "rgba(30,16,4,0.7)";
      c.lineWidth = 1;
      c.stroke();
    }
  }
}
function drawRoundIconButton(ctx2, key, cx, cy, d, icon, hover) {
  const r = d / 2;
  const sprite = sprites.get(
    `roundbtn:${key}:${Math.round(d)}:${hover ? "h" : "-"}`,
    Math.round(d),
    Math.round(d),
    (c, cw) => paintRoundButton(c, cw / 2, cw / 2 - 1, cw / 2 - 2, hover),
    2
  );
  sprites.blit(ctx2, sprite, cx, cy, d, d);
  drawIcon(ctx2, icon, cx, cy, r * 1.55);
}
function paintRoundButton(c, cx, cy, r, hover) {
  c.save();
  c.shadowColor = "rgba(8,4,2,0.55)";
  c.shadowBlur = 10;
  c.shadowOffsetY = 4;
  c.beginPath();
  c.arc(cx, cy, r, 0, Math.PI * 2);
  c.fillStyle = UI_INK;
  c.fill();
  c.restore();
  c.beginPath();
  c.arc(cx, cy, r, 0, Math.PI * 2);
  const bezel = c.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
  bezel.addColorStop(0, hover ? "#fff6d2" : GOLD_HI2);
  bezel.addColorStop(0.45, hover ? GOLD_HI2 : GOLD2);
  bezel.addColorStop(0.62, GOLD_DARK2);
  bezel.addColorStop(1, "#54370a");
  c.fillStyle = bezel;
  c.fill();
  c.strokeStyle = UI_INK;
  c.lineWidth = 2;
  c.stroke();
  c.beginPath();
  c.arc(cx, cy, r * 0.76, 0, Math.PI * 2);
  const disc = c.createLinearGradient(0, cy - r, 0, cy + r);
  disc.addColorStop(0, hover ? "#a06a2a" : "#7d4d1c");
  disc.addColorStop(1, "#38200e");
  c.fillStyle = disc;
  c.fill();
  c.strokeStyle = "rgba(255,238,196,0.35)";
  c.lineWidth = 1.2;
  c.stroke();
}
function applyButtonState(ctx2, x, y, w, h, st, draw) {
  if (st.disabled) {
    ctx2.save();
    ctx2.globalAlpha = 0.62;
    draw();
    ctx2.restore();
    return;
  }
  if (st.hover && !st.press) {
    const cx = x + w / 2;
    const cy = y + h / 2;
    ctx2.save();
    ctx2.translate(cx, cy);
    ctx2.scale(1.025, 1.025);
    ctx2.translate(-cx, -cy);
    draw();
    ctx2.restore();
    return;
  }
  draw();
}
function drawSheen(ctx2, x, y, w, h, alpha) {
  ctx2.save();
  roundRect(ctx2, x, y, w, h, 8);
  ctx2.clip();
  const sx = x + w * (Date.now() / 1400 % 1 * 1.6 - 0.3);
  const g = ctx2.createLinearGradient(sx - 40, y, sx + 40, y + h);
  g.addColorStop(0, "rgba(255,252,232,0)");
  g.addColorStop(0.5, `rgba(255,252,232,${0.28 * alpha})`);
  g.addColorStop(1, "rgba(255,252,232,0)");
  ctx2.fillStyle = g;
  ctx2.fillRect(x, y, w, h);
  ctx2.restore();
}
function drawLabel(ctx2, label, cx, cy, size, icon, iconX) {
  ctx2.save();
  ctx2.font = `bold ${size}px ${FONT_TITLE}`;
  ctx2.textAlign = "center";
  ctx2.textBaseline = "middle";
  if (icon) drawIcon(ctx2, icon, iconX ?? cx - 60, cy, size * 1.05);
  ctx2.fillStyle = "rgba(20,8,4,0.85)";
  ctx2.fillText(label, cx + 1.5, cy + 2);
  ctx2.fillStyle = "#fff6e0";
  ctx2.fillText(label, cx, cy);
  ctx2.restore();
}
function wrapText(ctx2, text, cx, y, maxWidth, lineHeight, maxLines) {
  const words = text.split(" ");
  const lines = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (ctx2.measureText(next).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  lines.slice(0, maxLines).forEach((ln, i) => ctx2.fillText(ln, cx, y + i * lineHeight));
}
function inRect(p, x, y, w, h) {
  return p.x >= x && p.x <= x + w && p.y >= y && p.y <= y + h;
}
function drawWorldMapTopBar(ctx2, mousePos, totalStars, audioMuted) {
  const h = 64;
  drawFrame(ctx2, "mapbar", -14, -14, DESIGN_WIDTH + 28, h, {});
  ctx2.save();
  const trim = ctx2.createLinearGradient(0, 0, DESIGN_WIDTH, 0);
  trim.addColorStop(0, "rgba(138,95,20,0)");
  trim.addColorStop(0.5, GOLD2);
  trim.addColorStop(1, "rgba(138,95,20,0)");
  ctx2.strokeStyle = trim;
  ctx2.lineWidth = 2.4;
  ctx2.beginPath();
  ctx2.moveTo(0, h - 1);
  ctx2.lineTo(DESIGN_WIDTH, h - 1);
  ctx2.stroke();
  ctx2.restore();
  const backHover = inRect(mousePos, 20, 10, 110, 36);
  applyButtonState(ctx2, 20, 10, 110, 36, { hover: backHover }, () => {
    drawFrame(ctx2, "mapback", 20, 10, 110, 36, { hover: backHover });
    if (backHover) drawSheen(ctx2, 20, 10, 110, 36, 0.8);
    drawLabel(ctx2, "MENU", 85, 28, 16, "back", 40);
  });
  ctx2.save();
  ctx2.font = `bold 26px ${FONT_TITLE}`;
  ctx2.textAlign = "center";
  ctx2.textBaseline = "middle";
  const title = "KINGDOM CAMPAIGN";
  ctx2.lineWidth = 5;
  ctx2.strokeStyle = "rgba(18,8,2,0.9)";
  ctx2.strokeText(title, DESIGN_WIDTH / 2 + 26, h / 2 + 1);
  const tg = ctx2.createLinearGradient(0, h / 2 - 16, 0, h / 2 + 16);
  tg.addColorStop(0, "#fff6d0");
  tg.addColorStop(0.5, "#ffd866");
  tg.addColorStop(1, "#c8912b");
  ctx2.fillStyle = tg;
  ctx2.fillText(title, DESIGN_WIDTH / 2 + 26, h / 2);
  ctx2.restore();
  drawIcon(ctx2, "hammer", DESIGN_WIDTH / 2 - 130, h / 2, 22);
  drawIcon(ctx2, "hammer", DESIGN_WIDTH / 2 + 182, h / 2, 22);
  const starX = DESIGN_WIDTH - 236;
  drawMedallion(ctx2, "stars", starX, h / 2 - 2, 17, "star", {});
  ctx2.save();
  ctx2.font = `bold 20px ${FONT_TITLE}`;
  ctx2.textAlign = "left";
  ctx2.textBaseline = "middle";
  ctx2.fillStyle = "rgba(20,8,2,0.85)";
  ctx2.fillText(`${totalStars} / 15`, starX + 22, h / 2 + 1.5);
  ctx2.fillStyle = GOLD_HI2;
  ctx2.fillText(`${totalStars} / 15`, starX + 21, h / 2);
  ctx2.restore();
  const soundHover = inRect(mousePos, DESIGN_WIDTH - 70, 10, 50, 36);
  applyButtonState(ctx2, DESIGN_WIDTH - 70, 10, 50, 36, { hover: soundHover }, () => {
    drawFrame(ctx2, "mapsound", DESIGN_WIDTH - 70, 10, 50, 36, { hover: soundHover });
    if (soundHover) drawSheen(ctx2, DESIGN_WIDTH - 70, 10, 50, 36, 0.8);
    drawIcon(ctx2, audioMuted ? "sound_off" : "sound_on", DESIGN_WIDTH - 45, 28, 26);
  });
}
function drawEpicTitleScreen(ctx2, time, mousePos, audioMuted, activeLoreModal) {
  ctx2.save();
  drawNightSky(ctx2, time);
  drawMoon(ctx2, DESIGN_WIDTH * 0.775, 122, time);
  drawNightClouds(ctx2, time);
  drawDistantMountains(ctx2);
  drawFortressRamparts(ctx2, time);
  drawBrazier(ctx2, 168, DESIGN_HEIGHT - 196, time);
  drawBrazier(ctx2, DESIGN_WIDTH - 168, DESIGN_HEIGHT - 196, time + 2.1);
  drawFloatingEmbers(ctx2, time);
  drawTitleHeraldicCrest(ctx2, time);
  const playX = DESIGN_WIDTH / 2 - 130;
  const playY = DESIGN_HEIGHT / 2 + 80;
  const playHover = inRect(mousePos, playX, playY, 260, 56);
  drawActionButton(ctx2, "menubattle", playX, playY, 260, 56, "TO BATTLE", "hammer", { hover: playHover });
  const loreX = DESIGN_WIDTH / 2 - 130;
  const loreY = playY + 68;
  const loreHover = inRect(mousePos, loreX, loreY, 260, 46);
  applyButtonState(ctx2, loreX, loreY, 260, 46, { hover: loreHover }, () => {
    drawFrame(ctx2, "menulore", loreX, loreY, 260, 46, { hover: loreHover });
    if (loreHover) drawSheen(ctx2, loreX, loreY, 260, 46, 0.8);
    ctx2.save();
    roundRect(ctx2, loreX + 4.5, loreY + 4.5, 260 - 9, 46 - 9, 5);
    ctx2.fillStyle = "rgba(64,40,14,0.28)";
    ctx2.fill();
    ctx2.restore();
    drawLabel(ctx2, "BESTIARY & LORE", loreX + 130 + 13, loreY + 23, 17, "info", loreX + 30);
  });
  const soundHover = inRect(mousePos, DESIGN_WIDTH - 80, 20, 56, 40);
  applyButtonState(ctx2, DESIGN_WIDTH - 80, 20, 56, 40, { hover: soundHover }, () => {
    drawFrame(ctx2, "menusound", DESIGN_WIDTH - 80, 20, 56, 40, { hover: soundHover });
    if (soundHover) drawSheen(ctx2, DESIGN_WIDTH - 80, 20, 56, 40, 0.8);
    drawIcon(ctx2, audioMuted ? "sound_off" : "sound_on", DESIGN_WIDTH / 2 - 52 + 0, 40, 28);
  });
  ctx2.save();
  ctx2.font = `13px ${FONT_UI}`;
  ctx2.textAlign = "center";
  ctx2.textBaseline = "alphabetic";
  ctx2.fillStyle = "rgba(10,6,4,0.6)";
  ctx2.fillRect(DESIGN_WIDTH / 2 - 230, DESIGN_HEIGHT - 36, 460, 26);
  ctx2.fillStyle = "rgba(255,246,214,0.5)";
  ctx2.fillText("v1.0 Kingdom Edition  \u2022  Built with Procedural Canvas & Web Audio", DESIGN_WIDTH / 2, DESIGN_HEIGHT - 18);
  ctx2.restore();
  if (activeLoreModal) drawLoreBestiaryModal(ctx2, mousePos);
  ctx2.restore();
}
function drawNightSky(ctx2, time) {
  const sky = ctx2.createLinearGradient(0, 0, 0, DESIGN_HEIGHT);
  sky.addColorStop(0, "#05070f");
  sky.addColorStop(0.32, "#0d1526");
  sky.addColorStop(0.62, "#1b2740");
  sky.addColorStop(0.82, "#2a3350");
  sky.addColorStop(1, "#131a2c");
  ctx2.fillStyle = sky;
  ctx2.fillRect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);
  const glow = ctx2.createRadialGradient(DESIGN_WIDTH / 2, 210, 30, DESIGN_WIDTH / 2, 210, 420);
  glow.addColorStop(0, "rgba(255,196,110,0.16)");
  glow.addColorStop(0.5, "rgba(140,110,200,0.08)");
  glow.addColorStop(1, "rgba(0,0,0,0)");
  ctx2.fillStyle = glow;
  ctx2.fillRect(0, 0, DESIGN_WIDTH, 520);
  for (let layer = 0; layer < 2; layer++) {
    const count = layer === 0 ? 150 : 70;
    for (let i = 0; i < count; i++) {
      const x = hash2(i, layer * 3 + 1) * DESIGN_WIDTH;
      const y = hash2(i, layer * 3 + 2) * (DESIGN_HEIGHT * 0.72);
      const tw = 0.35 + 0.65 * Math.abs(Math.sin(time * (0.6 + hash2(i, 9)) + i));
      const r = (layer === 0 ? 0.9 : 1.5) + hash2(i, 5) * 0.7;
      ctx2.fillStyle = layer === 0 ? `rgba(214,226,255,${0.3 * tw})` : `rgba(255,246,220,${0.55 * tw})`;
      ctx2.beginPath();
      ctx2.arc(x, y, r, 0, Math.PI * 2);
      ctx2.fill();
      if (layer === 1 && r > 1.9) {
        ctx2.strokeStyle = `rgba(255,250,230,${0.3 * tw})`;
        ctx2.lineWidth = 0.9;
        ctx2.beginPath();
        ctx2.moveTo(x - r * 3, y);
        ctx2.lineTo(x + r * 3, y);
        ctx2.moveTo(x, y - r * 3);
        ctx2.lineTo(x, y + r * 3);
        ctx2.stroke();
      }
    }
  }
}
function drawMoon(ctx2, mx, my, time) {
  const breathe = 1 + Math.sin(time * 0.6) * 0.03;
  const halo = ctx2.createRadialGradient(mx, my, 30, mx, my, 168 * breathe);
  halo.addColorStop(0, "rgba(255,252,228,0.36)");
  halo.addColorStop(0.22, "rgba(252,246,210,0.2)");
  halo.addColorStop(0.55, "rgba(180,200,240,0.07)");
  halo.addColorStop(1, "rgba(0,0,0,0)");
  ctx2.fillStyle = halo;
  ctx2.beginPath();
  ctx2.arc(mx, my, 168 * breathe, 0, Math.PI * 2);
  ctx2.fill();
  ctx2.beginPath();
  ctx2.arc(mx, my, 42, 0, Math.PI * 2);
  const disc = ctx2.createRadialGradient(mx - 14, my - 16, 4, mx, my, 44);
  disc.addColorStop(0, "#fffdf2");
  disc.addColorStop(0.62, "#f6f0d8");
  disc.addColorStop(1, "#cfc6a6");
  ctx2.fillStyle = disc;
  ctx2.fill();
  ctx2.strokeStyle = "rgba(255,255,244,0.5)";
  ctx2.lineWidth = 1.6;
  ctx2.stroke();
  ctx2.save();
  ctx2.beginPath();
  ctx2.arc(mx, my, 40, 0, Math.PI * 2);
  ctx2.clip();
  [[-16, -8, 9], [6, 12, 12], [16, -14, 7], [-6, 20, 6]].forEach(([ox, oy, rr]) => {
    const g = ctx2.createRadialGradient(mx + ox, my + oy, 1, mx + ox, my + oy, rr);
    g.addColorStop(0, "rgba(186,178,150,0.55)");
    g.addColorStop(1, "rgba(186,178,150,0)");
    ctx2.fillStyle = g;
    ctx2.beginPath();
    ctx2.arc(mx + ox, my + oy, rr, 0, Math.PI * 2);
    ctx2.fill();
  });
  ctx2.restore();
}
function drawNightClouds(ctx2, time) {
  const bands = [
    // y, seed, speed, scale, alpha
    [96, 0, 9, 0.8, 0.22],
    [154, 1, 15, 1, 0.3],
    [212, 2, 6, 0.7, 0.2],
    [268, 3, 12, 0.85, 0.26]
  ];
  const span = DESIGN_WIDTH + 400;
  bands.forEach(([y, seed, speed, scale, alpha], bi) => {
    const sprite = sprites.get(`cloud:${seed}`, 320, 120, (c, w, h) => paintCloud(c, w, h, seed), 2);
    for (let i = 0; i < 2; i++) {
      const raw = (bi * 240 + i * span * 0.5 + time * speed) % span;
      const x = raw - 200;
      ctx2.save();
      ctx2.globalAlpha = alpha;
      sprites.blit(ctx2, sprite, x, y, 320 * scale, 120 * scale);
      ctx2.restore();
    }
  });
  const mist = ctx2.createLinearGradient(0, DESIGN_HEIGHT - 330, 0, DESIGN_HEIGHT - 150);
  mist.addColorStop(0, "rgba(140,160,200,0)");
  mist.addColorStop(0.6, "rgba(150,166,200,0.14)");
  mist.addColorStop(1, "rgba(150,166,200,0)");
  ctx2.fillStyle = mist;
  ctx2.fillRect(0, DESIGN_HEIGHT - 330, DESIGN_WIDTH, 190);
}
function paintCloud(c, w, h, seed) {
  const blobs = [
    [0.16, 0.62, 0.2],
    [0.3, 0.48, 0.26],
    [0.46, 0.6, 0.22],
    [0.62, 0.44, 0.28],
    [0.78, 0.6, 0.2],
    [0.9, 0.66, 0.15]
  ];
  c.beginPath();
  blobs.forEach(([bx, by, br], i) => {
    const jitter = (hash2(seed, i) - 0.5) * 0.06;
    c.moveTo((bx + jitter) * w + br * w, by * h);
    c.arc((bx + jitter) * w, (by + jitter * 0.4) * h, br * w, 0, Math.PI * 2);
  });
  const g = c.createLinearGradient(0, h * 0.2, 0, h);
  g.addColorStop(0, "rgba(120,140,186,0.9)");
  g.addColorStop(0.45, "rgba(74,92,138,0.85)");
  g.addColorStop(1, "rgba(38,50,84,0.8)");
  c.fillStyle = g;
  c.fill();
  c.save();
  c.clip();
  c.fillStyle = "rgba(196,212,246,0.4)";
  c.beginPath();
  c.ellipse(w * 0.42, h * 0.36, w * 0.4, h * 0.14, 0, 0, Math.PI * 2);
  c.fill();
  c.restore();
}
function drawDistantMountains(ctx2) {
  const layers = [
    // baseY, amp, seed, top, bottom
    [418, 68, 1, "#252e48", "#131a2c"],
    [466, 54, 2, "#1a2338", "#0c1220"]
  ];
  layers.forEach(([baseY, amp, seed, top, bottom]) => {
    ctx2.beginPath();
    ctx2.moveTo(-20, DESIGN_HEIGHT);
    ctx2.lineTo(-20, baseY);
    const steps = 16;
    for (let i = 0; i <= steps; i++) {
      const x = i / steps * (DESIGN_WIDTH + 40) - 20;
      const peak = baseY - amp * (0.45 + hash2(i, seed) * 0.85);
      ctx2.lineTo(x, peak);
      if (i < steps) {
        const midX = x + (DESIGN_WIDTH + 40) / steps / 2;
        ctx2.lineTo(midX, baseY - amp * hash2(i, seed + 11) * 0.3);
      }
    }
    ctx2.lineTo(DESIGN_WIDTH + 20, DESIGN_HEIGHT);
    ctx2.closePath();
    const g = ctx2.createLinearGradient(0, baseY - amp, 0, DESIGN_HEIGHT);
    g.addColorStop(0, top);
    g.addColorStop(1, bottom);
    ctx2.fillStyle = g;
    ctx2.fill();
  });
  const fog = ctx2.createLinearGradient(0, 360, 0, 500);
  fog.addColorStop(0, "rgba(120,140,180,0)");
  fog.addColorStop(0.5, "rgba(126,146,186,0.16)");
  fog.addColorStop(1, "rgba(120,140,180,0)");
  ctx2.fillStyle = fog;
  ctx2.fillRect(0, 360, DESIGN_WIDTH, 150);
}
function drawFortressRamparts(ctx2, time) {
  const wallTop = DESIGN_HEIGHT - 210;
  const sprite = sprites.get(
    "rampart",
    DESIGN_WIDTH,
    DESIGN_HEIGHT - wallTop + 60,
    (c, w, h) => paintRampart(c, w, h, wallTop),
    2
  );
  sprites.blit(
    ctx2,
    sprite,
    DESIGN_WIDTH / 2,
    (wallTop - 60 + DESIGN_HEIGHT) / 2 + 2,
    DESIGN_WIDTH,
    DESIGN_HEIGHT - wallTop + 60
  );
  const flick = 0.5 + Math.sin(time * 8) * 0.2;
  [[168, DESIGN_HEIGHT - 196], [DESIGN_WIDTH - 168, DESIGN_HEIGHT - 196]].forEach(([x, y]) => {
    const g = ctx2.createRadialGradient(x, y - 30, 8, x, y - 30, 190);
    g.addColorStop(0, `rgba(255,166,64,${0.2 + flick * 0.08})`);
    g.addColorStop(1, "rgba(255,120,30,0)");
    ctx2.fillStyle = g;
    ctx2.beginPath();
    ctx2.arc(x, y - 30, 190, 0, Math.PI * 2);
    ctx2.fill();
  });
}
function paintRampart(c, w, h, wallTop) {
  const localTop = 60;
  const wallH = h - localTop;
  const wall = c.createLinearGradient(0, localTop, 0, h);
  wall.addColorStop(0, "#3b4658");
  wall.addColorStop(0.28, "#29313f");
  wall.addColorStop(0.7, "#1a2130");
  wall.addColorStop(1, "#0d1220");
  c.fillStyle = wall;
  c.fillRect(0, localTop, w, wallH);
  const courseH = 26;
  for (let row = 0; row * courseH < wallH; row++) {
    const y = localTop + row * courseH;
    c.strokeStyle = "rgba(10,14,24,0.7)";
    c.lineWidth = 1.6;
    c.beginPath();
    c.moveTo(0, y);
    c.lineTo(w, y);
    c.stroke();
    c.strokeStyle = "rgba(180,196,224,0.07)";
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(0, y + 1.6);
    c.lineTo(w, y + 1.6);
    c.stroke();
    const offset = row % 2 * 40;
    for (let x = offset; x < w; x += 80) {
      const jitter = (hash2(row, x) - 0.5) * 6;
      c.strokeStyle = "rgba(10,14,24,0.65)";
      c.lineWidth = 1.4;
      c.beginPath();
      c.moveTo(x + jitter, y);
      c.lineTo(x + jitter, y + courseH);
      c.stroke();
      if (hash2(row, x + 3) > 0.72) {
        c.fillStyle = "rgba(198,214,240,0.05)";
        c.fillRect(x + jitter + 2, y + 2, 76, courseH - 4);
      }
    }
  }
  for (let i = 0; i < 60; i++) {
    const x = hash2(i, 61) * w;
    const y = localTop + hash2(i, 62) * wallH * 0.6;
    c.fillStyle = "rgba(8,10,18,0.18)";
    c.fillRect(x, y, 3 + hash2(i, 63) * 4, 30 + hash2(i, 64) * 110);
  }
  const crenW = 42;
  const crenH = 26;
  const gap = 30;
  c.fillStyle = "#2b3444";
  c.fillRect(0, localTop - crenH, w, crenH);
  for (let x = 0; x < w; x += crenW + gap) {
    c.fillStyle = "#39455a";
    c.beginPath();
    c.moveTo(x, localTop - crenH);
    c.lineTo(x + crenW, localTop - crenH);
    c.lineTo(x + crenW - 3, localTop);
    c.lineTo(x + 3, localTop);
    c.closePath();
    c.fill();
    c.fillStyle = "rgba(176,196,228,0.18)";
    c.beginPath();
    c.moveTo(x + 3, localTop - crenH + 4);
    c.lineTo(x + crenW - 3, localTop - crenH + 4);
    c.lineTo(x + crenW - 8, localTop - crenH + 11);
    c.lineTo(x + 8, localTop - crenH + 11);
    c.closePath();
    c.fill();
    c.strokeStyle = "rgba(8,10,18,0.75)";
    c.lineWidth = 1.6;
    c.beginPath();
    c.moveTo(x, localTop - crenH);
    c.lineTo(x + crenW, localTop - crenH);
    c.lineTo(x + crenW - 3, localTop);
    c.stroke();
  }
  c.fillStyle = "rgba(4,6,12,0.45)";
  c.fillRect(0, localTop, w, 14);
  [70, w - 70].forEach((tx, i) => {
    const tw = 74;
    const th = 150;
    const ty = localTop - th + 24;
    const tower = c.createLinearGradient(tx - tw / 2, 0, tx + tw / 2, 0);
    tower.addColorStop(0, "#3d495e");
    tower.addColorStop(0.5, "#26303f");
    tower.addColorStop(1, "#141a27");
    c.fillStyle = tower;
    c.fillRect(tx - tw / 2, ty, tw, th + 40);
    c.strokeStyle = "rgba(8,10,18,0.8)";
    c.lineWidth = 2;
    c.strokeRect(tx - tw / 2, ty, tw, th + 40);
    c.beginPath();
    c.moveTo(tx - tw / 2 - 8, ty);
    c.lineTo(tx + tw / 2 + 8, ty);
    c.lineTo(tx, ty - 52);
    c.closePath();
    const roof = c.createLinearGradient(tx - tw / 2, ty - 52, tx + tw / 2, ty);
    roof.addColorStop(0, "#7d2b22");
    roof.addColorStop(1, "#3a100c");
    c.fillStyle = roof;
    c.fill();
    c.strokeStyle = "rgba(8,10,18,0.85)";
    c.lineWidth = 2;
    c.stroke();
    c.beginPath();
    c.moveTo(tx, ty - 52);
    c.lineTo(tx, ty - 84);
    c.strokeStyle = "#6b7588";
    c.lineWidth = 2.4;
    c.stroke();
    const flagDir = i === 0 ? 1 : -1;
    c.beginPath();
    c.moveTo(tx, ty - 82);
    c.quadraticCurveTo(tx + flagDir * 14, ty - 78, tx + flagDir * 27, ty - 74);
    c.lineTo(tx + flagDir * 27, ty - 60);
    c.quadraticCurveTo(tx + flagDir * 14, ty - 64, tx, ty - 68);
    c.closePath();
    c.fillStyle = "#b8332a";
    c.fill();
    c.strokeStyle = "rgba(8,10,18,0.7)";
    c.lineWidth = 1.4;
    c.stroke();
    [-34, 6].forEach((oy) => {
      c.fillStyle = "#05070d";
      roundRect(c, tx - 4, ty + 54 + oy, 8, 24, 3);
      c.fill();
    });
  });
  const gateW = 220;
  const gateH = 180;
  const gx = w / 2 - gateW / 2;
  const gy = localTop - 10;
  c.fillStyle = "#2e3848";
  roundRect(c, gx - 24, gy - 24, gateW + 48, gateH + 28, 24);
  c.fill();
  c.strokeStyle = "rgba(8,10,18,0.85)";
  c.lineWidth = 2.4;
  c.stroke();
  for (let i = 0; i <= 10; i++) {
    const a = Math.PI + i / 10 * Math.PI;
    const px = w / 2 + Math.cos(a) * (gateW / 2 + 14);
    const py = gy + 6 + Math.sin(a) * (gateW / 2 + 14) * 0.62;
    c.strokeStyle = "rgba(12,16,26,0.7)";
    c.lineWidth = 1.6;
    c.beginPath();
    c.moveTo(px, py);
    c.lineTo(w / 2 + Math.cos(a) * (gateW / 2 - 6), gy + 6 + Math.sin(a) * (gateW / 2 - 6) * 0.62);
    c.stroke();
  }
  c.fillStyle = "#05070d";
  roundRect(c, gx, gy, gateW, gateH, 22);
  c.fill();
  c.save();
  roundRect(c, gx, gy, gateW, gateH, 22);
  c.clip();
  const warm = c.createLinearGradient(0, gy, 0, gy + gateH);
  warm.addColorStop(0, "rgba(255,150,60,0.16)");
  warm.addColorStop(1, "rgba(180,60,20,0.05)");
  c.fillStyle = warm;
  c.fillRect(gx, gy, gateW, gateH);
  for (let bx = gx + 22; bx < gx + gateW - 8; bx += 26) {
    c.strokeStyle = "#57617a";
    c.lineWidth = 6;
    c.beginPath();
    c.moveTo(bx, gy);
    c.lineTo(bx, gy + gateH);
    c.stroke();
    c.strokeStyle = "rgba(200,214,240,0.22)";
    c.lineWidth = 1.6;
    c.stroke();
  }
  [0.32, 0.66].forEach((t) => {
    c.strokeStyle = "#4a5468";
    c.lineWidth = 5;
    c.beginPath();
    c.moveTo(gx, gy + gateH * t);
    c.lineTo(gx + gateW, gy + gateH * t);
    c.stroke();
  });
  c.restore();
}
function drawBrazier(ctx2, cx, cy, time) {
  const sprite = sprites.get("brazier", 92, 150, (c, w, h) => paintBrazier(c, w, h), 2);
  sprites.blit(ctx2, sprite, cx, cy + 62, 92, 150);
  const pulse = 0.8 + Math.sin(time * 7) * 0.14;
  const glow = ctx2.createRadialGradient(cx, cy - 16, 6, cx, cy - 16, 110 * pulse);
  glow.addColorStop(0, "rgba(255,190,90,0.6)");
  glow.addColorStop(0.35, "rgba(232,96,20,0.28)");
  glow.addColorStop(1, "rgba(0,0,0,0)");
  ctx2.fillStyle = glow;
  ctx2.beginPath();
  ctx2.arc(cx, cy - 16, 110 * pulse, 0, Math.PI * 2);
  ctx2.fill();
  for (let f = 0; f < 6; f++) {
    const phase = time * 8 + f * 1.35;
    const flameH = 46 + Math.sin(phase) * 14;
    const flameW = 11 + Math.cos(time * 6 + f) * 4;
    const fx = cx + (f - 2.5) * 8 + Math.sin(time * 5 + f) * 3;
    ctx2.beginPath();
    ctx2.moveTo(fx - flameW, cy - 2);
    ctx2.quadraticCurveTo(fx - flameW * 0.5, cy - flameH * 0.55, fx, cy - flameH);
    ctx2.quadraticCurveTo(fx + flameW * 0.5, cy - flameH * 0.55, fx + flameW, cy - 2);
    ctx2.closePath();
    const g = ctx2.createLinearGradient(0, cy - flameH, 0, cy);
    if (f % 2 === 0) {
      g.addColorStop(0, "rgba(255,224,120,0.5)");
      g.addColorStop(0.4, "rgba(255,132,26,0.9)");
      g.addColorStop(1, "rgba(210,50,10,0.75)");
    } else {
      g.addColorStop(0, "rgba(255,246,190,0.75)");
      g.addColorStop(0.5, "rgba(255,178,50,0.9)");
      g.addColorStop(1, "rgba(226,72,14,0.7)");
    }
    ctx2.fillStyle = g;
    ctx2.fill();
  }
  ctx2.beginPath();
  ctx2.ellipse(cx, cy - 10, 13, 17 + Math.sin(time * 9) * 3, 0, 0, Math.PI * 2);
  ctx2.fillStyle = "rgba(255,248,206,0.9)";
  ctx2.fill();
}
function paintBrazier(c, w, h) {
  const cx = w / 2;
  const baseY = h - 6;
  const col = c.createLinearGradient(cx - 16, 0, cx + 16, 0);
  col.addColorStop(0, "#5a6577");
  col.addColorStop(0.4, "#414c5e");
  col.addColorStop(1, "#242c3a");
  c.fillStyle = col;
  c.fillRect(cx - 15, 40, 30, baseY - 46);
  c.strokeStyle = "rgba(6,8,14,0.75)";
  c.lineWidth = 2;
  c.strokeRect(cx - 15, 40, 30, baseY - 46);
  for (let y = 52; y < baseY - 10; y += 22) {
    c.strokeStyle = "rgba(8,10,18,0.6)";
    c.lineWidth = 1.4;
    c.beginPath();
    c.moveTo(cx - 15, y);
    c.lineTo(cx + 15, y);
    c.stroke();
    c.strokeStyle = "rgba(200,214,236,0.08)";
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(cx - 15, y + 1.6);
    c.lineTo(cx + 15, y + 1.6);
    c.stroke();
  }
  c.fillStyle = "#4d5768";
  roundRect(c, cx - 26, baseY - 16, 52, 18, 4);
  c.fill();
  c.strokeStyle = "rgba(6,8,14,0.75)";
  c.lineWidth = 2;
  c.stroke();
  c.beginPath();
  c.moveTo(cx - 34, 26);
  c.lineTo(cx + 34, 26);
  c.lineTo(cx + 22, 46);
  c.lineTo(cx - 22, 46);
  c.closePath();
  const bowl = c.createLinearGradient(cx - 34, 20, cx + 34, 48);
  bowl.addColorStop(0, "#4a5264");
  bowl.addColorStop(0.5, "#2b3242");
  bowl.addColorStop(1, "#141a26");
  c.fillStyle = bowl;
  c.fill();
  c.strokeStyle = "#0a0e18";
  c.lineWidth = 2.6;
  c.stroke();
  c.beginPath();
  c.moveTo(cx - 34, 26);
  c.lineTo(cx + 34, 26);
  c.strokeStyle = "rgba(214,226,248,0.25)";
  c.lineWidth = 1.6;
  c.stroke();
  c.beginPath();
  c.ellipse(cx, 27, 30, 6, 0, 0, Math.PI * 2);
  c.fillStyle = "rgba(255,150,50,0.55)";
  c.fill();
}
function drawFloatingEmbers(ctx2, time) {
  for (let i = 0; i < 48; i++) {
    const seed = i * 137.5;
    const x = (seed * 11 + time * 18 + Math.sin(time * 1.6 + i) * 22) % DESIGN_WIDTH;
    const rise = (seed * 7 + time * (34 + i % 5 * 16)) % (DESIGN_HEIGHT * 0.86);
    const y = DESIGN_HEIGHT - 120 - rise;
    const size = 1.4 + i % 3 * 0.9;
    const heat = 1 - rise / (DESIGN_HEIGHT * 0.86);
    ctx2.fillStyle = i % 2 === 0 ? `rgba(255,${Math.round(150 + heat * 60)},60,${0.22 + heat * 0.5})` : `rgba(255,90,20,${0.16 + heat * 0.42})`;
    ctx2.beginPath();
    ctx2.arc(x, y, size * (0.6 + heat * 0.7), 0, Math.PI * 2);
    ctx2.fill();
  }
}
function drawTitleHeraldicCrest(ctx2, time) {
  const cx = DESIGN_WIDTH / 2;
  const cy = 206 + Math.sin(time * 1.5) * 4;
  const bloom = ctx2.createRadialGradient(cx, cy, 20, cx, cy, 260);
  bloom.addColorStop(0, "rgba(255,204,120,0.16)");
  bloom.addColorStop(1, "rgba(255,180,80,0)");
  ctx2.fillStyle = bloom;
  ctx2.fillRect(cx - 280, cy - 260, 560, 520);
  const sprite = sprites.get("crest", 420, 420, (c, w) => paintCrest(c, w / 2, w / 2 + 4), 2);
  sprites.blit(ctx2, sprite, cx, cy, 420, 420);
  drawTitleRibbon(ctx2, cx, cy + 74);
}
function paintCrest(c, cx, cy) {
  [-1, 1].forEach((dir) => {
    c.save();
    c.translate(cx, cy);
    c.rotate(dir * Math.PI / 4.2);
    c.beginPath();
    c.moveTo(0, -168);
    c.lineTo(9, -146);
    c.lineTo(7, 26);
    c.lineTo(-7, 26);
    c.lineTo(-9, -146);
    c.closePath();
    const blade2 = c.createLinearGradient(-9, 0, 9, 0);
    blade2.addColorStop(0, "#8d9cb4");
    blade2.addColorStop(0.42, "#eef4ff");
    blade2.addColorStop(0.6, "#c3cede");
    blade2.addColorStop(1, "#68758c");
    c.fillStyle = blade2;
    c.fill();
    c.strokeStyle = "#1d2432";
    c.lineWidth = 2.4;
    c.stroke();
    c.beginPath();
    c.moveTo(0, -140);
    c.lineTo(0, 20);
    c.strokeStyle = "rgba(90,104,128,0.75)";
    c.lineWidth = 2.6;
    c.stroke();
    roundRect(c, -26, 26, 52, 10, 4);
    const guard = c.createLinearGradient(-26, 26, 26, 36);
    guard.addColorStop(0, GOLD_HI2);
    guard.addColorStop(0.5, GOLD2);
    guard.addColorStop(1, GOLD_DARK2);
    c.fillStyle = guard;
    c.fill();
    c.strokeStyle = "#2a1a06";
    c.lineWidth = 1.8;
    c.stroke();
    roundRect(c, -5, 36, 10, 30, 4);
    c.fillStyle = "#5b3018";
    c.fill();
    c.strokeStyle = "#241004";
    c.lineWidth = 1.6;
    c.stroke();
    for (let i = 0; i < 4; i++) {
      c.beginPath();
      c.moveTo(-5, 39 + i * 7);
      c.lineTo(5, 43 + i * 7);
      c.strokeStyle = "rgba(255,220,160,0.35)";
      c.lineWidth = 1.6;
      c.stroke();
    }
    c.beginPath();
    c.arc(0, 72, 9, 0, Math.PI * 2);
    const pom = c.createRadialGradient(-3, 69, 1, 0, 72, 10);
    pom.addColorStop(0, GOLD_HI2);
    pom.addColorStop(1, GOLD_DARK2);
    c.fillStyle = pom;
    c.fill();
    c.strokeStyle = "#2a1a06";
    c.lineWidth = 1.6;
    c.stroke();
    c.restore();
  });
  c.save();
  c.translate(cx, cy + 4);
  crestShield(c, 0, 0, 78, 96);
  const rim = c.createLinearGradient(-78, -96, 78, 96);
  rim.addColorStop(0, "#fff0b8");
  rim.addColorStop(0.45, GOLD2);
  rim.addColorStop(0.6, GOLD_DARK2);
  rim.addColorStop(1, "#4d3208");
  c.fillStyle = rim;
  c.fill();
  c.strokeStyle = UI_INK;
  c.lineWidth = 3.4;
  c.stroke();
  crestShield(c, 0, 0, 66, 84);
  c.save();
  c.clip();
  c.fillStyle = "#8f1d18";
  c.fillRect(-80, -100, 80, 100);
  c.fillRect(0, 0, 80, 110);
  c.fillStyle = "#123a75";
  c.fillRect(0, -100, 80, 100);
  c.fillRect(-80, 0, 80, 110);
  const qs = c.createLinearGradient(-70, -90, 70, 90);
  qs.addColorStop(0, "rgba(255,255,255,0.16)");
  qs.addColorStop(0.5, "rgba(0,0,0,0)");
  qs.addColorStop(1, "rgba(0,0,0,0.34)");
  c.fillStyle = qs;
  c.fillRect(-80, -100, 160, 210);
  const lion = (x, y, s) => {
    c.save();
    c.translate(x, y);
    c.scale(s, s);
    c.beginPath();
    c.ellipse(0, 6, 11, 17, -0.16, 0, Math.PI * 2);
    c.ellipse(-1, -14, 10, 10, 0, 0, Math.PI * 2);
    c.ellipse(9, -18, 5, 6, 0.4, 0, Math.PI * 2);
    c.ellipse(-6, 22, 5, 12, 0.5, 0, Math.PI * 2);
    c.ellipse(7, 22, 5, 12, -0.4, 0, Math.PI * 2);
    c.fillStyle = GOLD_HI2;
    c.fill();
    c.strokeStyle = "rgba(60,32,6,0.85)";
    c.lineWidth = 1.6;
    c.stroke();
    c.beginPath();
    for (let i = 0; i < 9; i++) {
      const a = -1.2 + i / 8 * 4.4;
      const rr = i % 2 === 0 ? 18 : 13;
      const px = -1 + Math.cos(a) * rr;
      const py = -14 + Math.sin(a) * rr;
      if (i === 0) c.moveTo(px, py);
      else c.lineTo(px, py);
    }
    c.closePath();
    c.fillStyle = "rgba(224,168,52,0.9)";
    c.fill();
    c.strokeStyle = "rgba(60,32,6,0.6)";
    c.lineWidth = 1.2;
    c.stroke();
    c.beginPath();
    c.moveTo(-8, 18);
    c.quadraticCurveTo(-26, 6, -20, -12);
    c.strokeStyle = GOLD_HI2;
    c.lineWidth = 3.4;
    c.stroke();
    c.restore();
  };
  lion(-2, 6, 1.05);
  c.restore();
  c.strokeStyle = GOLD2;
  c.lineWidth = 5;
  c.beginPath();
  c.moveTo(-66, 0);
  c.lineTo(66, 0);
  c.moveTo(0, -84);
  c.lineTo(0, 88);
  c.stroke();
  c.strokeStyle = "rgba(60,34,6,0.55)";
  c.lineWidth = 1.6;
  c.beginPath();
  c.moveTo(-66, 1.6);
  c.lineTo(66, 1.6);
  c.moveTo(1.6, -84);
  c.lineTo(1.6, 88);
  c.stroke();
  crestShield(c, 0, 0, 66, 84);
  c.strokeStyle = "rgba(255,240,196,0.4)";
  c.lineWidth = 1.6;
  c.stroke();
  c.restore();
  c.save();
  c.translate(cx, cy - 84);
  c.beginPath();
  c.moveTo(-34, 20);
  c.lineTo(34, 20);
  c.lineTo(40, -12);
  c.lineTo(20, -2);
  c.lineTo(0, -26);
  c.lineTo(-20, -2);
  c.lineTo(-40, -12);
  c.closePath();
  const crown = c.createLinearGradient(0, -26, 0, 22);
  crown.addColorStop(0, "#fff4c4");
  crown.addColorStop(0.45, GOLD2);
  crown.addColorStop(1, "#9a6a12");
  c.fillStyle = crown;
  c.fill();
  c.strokeStyle = UI_INK;
  c.lineWidth = 2.6;
  c.stroke();
  roundRect(c, 0, 16, 74, 13, 5);
  const band = c.createLinearGradient(0, 10, 0, 24);
  band.addColorStop(0, GOLD_HI2);
  band.addColorStop(1, GOLD_DARK2);
  c.fillStyle = band;
  c.fill();
  c.strokeStyle = UI_INK;
  c.lineWidth = 1.8;
  c.stroke();
  [[-24, -4], [0, -18], [24, -4], [0, 17]].forEach(([jx, jy], i) => {
    c.beginPath();
    c.arc(jx, jy, i === 3 ? 3.6 : 4.4, 0, Math.PI * 2);
    const jg = c.createRadialGradient(jx - 1.6, jy - 1.6, 0.4, jx, jy, 5);
    jg.addColorStop(0, i % 2 === 0 ? "#ff9a8a" : "#8fd0ff");
    jg.addColorStop(1, i % 2 === 0 ? "#8d1a12" : "#0f3a72");
    c.fillStyle = jg;
    c.fill();
    c.strokeStyle = "rgba(40,20,4,0.8)";
    c.lineWidth = 1.2;
    c.stroke();
  });
  c.restore();
}
function crestShield(c, cx, cy, w, h) {
  c.beginPath();
  c.moveTo(cx - w, cy - h * 0.78);
  c.quadraticCurveTo(cx - w, cy - h * 1.02, cx, cy - h * 0.96);
  c.quadraticCurveTo(cx + w, cy - h * 1.02, cx + w, cy - h * 0.78);
  c.lineTo(cx + w, cy + h * 0.06);
  c.quadraticCurveTo(cx + w, cy + h * 0.74, cx, cy + h);
  c.quadraticCurveTo(cx - w, cy + h * 0.74, cx - w, cy + h * 0.06);
  c.closePath();
}
function drawTitleRibbon(ctx2, cx, cy) {
  const rw = 300;
  const rh = 50;
  const sprite = sprites.get(
    `ribbon:${rw}`,
    rw * 2 + 100,
    rh + 40,
    (c, w, h) => paintRibbonBody(c, w / 2, h / 2 - 6, rw, rh),
    2
  );
  sprites.blit(ctx2, sprite, cx, cy, rw * 2 + 100, rh + 40);
  ctx2.save();
  ctx2.font = `bold 34px ${FONT_TITLE}`;
  ctx2.textAlign = "center";
  ctx2.textBaseline = "middle";
  const label = "LAST BASTION";
  ctx2.lineWidth = 5;
  ctx2.strokeStyle = "rgba(24,10,2,0.9)";
  ctx2.strokeText(label, cx, cy + 1);
  const face = ctx2.createLinearGradient(0, cy - 18, 0, cy + 18);
  face.addColorStop(0, "#fff8d8");
  face.addColorStop(0.5, "#ffd866");
  face.addColorStop(1, "#d09a24");
  ctx2.fillStyle = face;
  ctx2.fillText(label, cx, cy);
  ctx2.restore();
  ctx2.save();
  ctx2.font = `italic 15px ${FONT_TITLE}`;
  ctx2.textAlign = "center";
  ctx2.textBaseline = "middle";
  ctx2.lineWidth = 4;
  ctx2.strokeStyle = "rgba(10,6,2,0.85)";
  ctx2.strokeText("\u2014  FRONTIERS OF THE REALM  \u2014", cx, cy + 48);
  ctx2.fillStyle = "#e6c88a";
  ctx2.fillText("\u2014  FRONTIERS OF THE REALM  \u2014", cx, cy + 48);
  ctx2.restore();
}
function paintRibbonBody(c, cx, cy, rw, rh) {
  [-1, 1].forEach((dir) => {
    c.beginPath();
    c.moveTo(cx + dir * (rw - 4), cy - rh / 2 + 3);
    c.lineTo(cx + dir * (rw + 46), cy + 6);
    c.lineTo(cx + dir * (rw + 18), cy + rh / 2 + 6);
    c.lineTo(cx + dir * (rw - 4), cy + rh / 2 + 4);
    c.closePath();
    const fold = c.createLinearGradient(cx + dir * rw, cy, cx + dir * (rw + 46), cy + rh / 2);
    fold.addColorStop(0, "#8b5a2b");
    fold.addColorStop(1, "#4c2c10");
    c.fillStyle = fold;
    c.fill();
    c.strokeStyle = UI_INK;
    c.lineWidth = 2;
    c.stroke();
  });
  roundRect(c, cx - rw, cy - rh / 2, rw * 2, rh, 8);
  const band = c.createLinearGradient(0, cy - rh / 2, 0, cy + rh / 2);
  band.addColorStop(0, "#a8712f");
  band.addColorStop(0.45, "#7a4d20");
  band.addColorStop(1, "#3f240d");
  c.fillStyle = band;
  c.fill();
  c.strokeStyle = UI_INK;
  c.lineWidth = 2.6;
  c.stroke();
  roundRect(c, cx - rw + 4, cy - rh / 2 + 4, rw * 2 - 8, rh - 8, 5);
  c.strokeStyle = GOLD2;
  c.lineWidth = 2;
  c.stroke();
  c.strokeStyle = "rgba(255,244,214,0.28)";
  c.lineWidth = 1;
  roundRect(c, cx - rw + 7, cy - rh / 2 + 7, rw * 2 - 14, rh - 14, 4);
  c.stroke();
  [-1, 1].forEach((dir) => {
    [[cx + dir * (rw - 16), cy - 12], [cx + dir * (rw - 16), cy + 12]].forEach(([sx, sy]) => {
      c.beginPath();
      c.arc(sx, sy, 4, 0, Math.PI * 2);
      const g = c.createRadialGradient(sx - 1.4, sy - 1.4, 0.4, sx, sy, 4.6);
      g.addColorStop(0, GOLD_HI2);
      g.addColorStop(1, GOLD_DARK2);
      c.fillStyle = g;
      c.fill();
      c.strokeStyle = "rgba(30,14,4,0.8)";
      c.lineWidth = 1.2;
      c.stroke();
    });
  });
}
function drawLoreBestiaryModal(ctx2, mousePos) {
  ctx2.save();
  ctx2.fillStyle = "rgba(4,3,9,0.72)";
  ctx2.fillRect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);
  const w = 680;
  const h = 480;
  const x = (DESIGN_WIDTH - w) / 2;
  const y = (DESIGN_HEIGHT - h) / 2;
  drawParchmentModal(ctx2, "lore", x, y, w, h);
  roundRect(ctx2, x + 18, y + 18, w - 36, 56, 7);
  const band = ctx2.createLinearGradient(0, y + 18, 0, y + 74);
  band.addColorStop(0, "#7d2420");
  band.addColorStop(0.5, "#5d1714");
  band.addColorStop(1, "#38090a");
  ctx2.fillStyle = band;
  ctx2.fill();
  ctx2.strokeStyle = GOLD2;
  ctx2.lineWidth = 2.2;
  ctx2.stroke();
  ctx2.strokeStyle = "rgba(255,236,190,0.3)";
  ctx2.lineWidth = 1;
  roundRect(ctx2, x + 21.5, y + 21.5, w - 43, 49, 5);
  ctx2.stroke();
  ctx2.font = `bold 24px ${FONT_TITLE}`;
  ctx2.textAlign = "center";
  ctx2.textBaseline = "middle";
  const title = "KINGDOM BESTIARY & WAR ROOM";
  ctx2.fillStyle = "rgba(20,6,4,0.85)";
  ctx2.fillText(title, DESIGN_WIDTH / 2 + 1.5, y + 48);
  ctx2.fillStyle = "#ffeec2";
  ctx2.fillText(title, DESIGN_WIDTH / 2, y + 46);
  drawIcon(ctx2, "hammer", x + 46, y + 46, 22);
  drawIcon(ctx2, "hammer", x + w - 46, y + 46, 22);
  drawDivider(ctx2, x + 60, y + 92, w - 120);
  const loreItems = [
    { icon: "archer", title: "ARCHER TOWERS", desc: "Rapid fire bows with long range. Upgrades into Sharpshooters or Rapid Volley." },
    { icon: "barracks", title: "BARRACKS SOLDIERS", desc: "Spawns 2 armored infantry onto the road to halt advancing creeps in melee combat." },
    { icon: "mage", title: "MAGE TOWERS", desc: "Pierces heavy iron armor with arcane bolts. Upgrades into Arcane Blast or Slow Hex." },
    { icon: "cannon", title: "CANNON TOWERS", desc: "Lobs heavy explosive shells dealing area splash damage against swarms of goblins." },
    { icon: "spell_rain_of_fire", title: "GOD SPELLS", desc: "Press [1] for Rain of Fire meteors; press [2] to summon emergency militia reinforcements." },
    { icon: "skull", title: "ENEMY THREATS", desc: "Dark Shamans heal allies, Trolls self-regenerate, and the Orc Warlord stuns towers!" }
  ];
  loreItems.forEach((item, idx) => {
    const iy = y + 106 + idx * 57;
    if (idx % 2 === 0) {
      roundRect(ctx2, x + 28, iy - 4, w - 56, 50, 6);
      ctx2.fillStyle = "rgba(214,186,140,0.28)";
      ctx2.fill();
    }
    drawIcon(ctx2, item.icon, x + 52, iy + 20, 32);
    ctx2.textAlign = "left";
    ctx2.textBaseline = "alphabetic";
    ctx2.font = `bold 16px ${FONT_TITLE}`;
    ctx2.fillStyle = "rgba(255,246,222,0.5)";
    ctx2.fillText(item.title, x + 78, iy + 17);
    ctx2.fillStyle = "#8d2019";
    ctx2.fillText(item.title, x + 77, iy + 16);
    ctx2.font = `13px ${FONT_UI}`;
    ctx2.fillStyle = "#33210f";
    ctx2.fillText(item.desc, x + 78, iy + 35);
  });
  const btnX = DESIGN_WIDTH / 2 - 60;
  const btnY = y + h - 55;
  const btnHover = inRect(mousePos, btnX, btnY, 120, 40);
  applyButtonState(ctx2, btnX, btnY, 120, 40, { hover: btnHover }, () => {
    drawFrame(ctx2, "loreclose", btnX, btnY, 120, 40, { hover: btnHover });
    if (btnHover) drawSheen(ctx2, btnX, btnY, 120, 40, 0.8);
    drawLabel(ctx2, "CLOSE", btnX + 60 + 10, btnY + 20, 16, "close", btnX + 18);
  });
  ctx2.restore();
}
function drawMedievalTopHUD(ctx2, gold, lives, maxLives, waveIndex, totalWaves, paused, gameSpeed, waitingForWave, waveCountdown, earlyBonusGold, mousePos, time) {
  ctx2.save();
  const barH = 50;
  drawFrame(ctx2, "hudbar", -14, -16, DESIGN_WIDTH + 28, barH + 16, {});
  const trim = ctx2.createLinearGradient(0, 0, DESIGN_WIDTH, 0);
  trim.addColorStop(0, "rgba(138,95,20,0)");
  trim.addColorStop(0.5, GOLD2);
  trim.addColorStop(1, "rgba(138,95,20,0)");
  ctx2.strokeStyle = trim;
  ctx2.lineWidth = 2.4;
  ctx2.beginPath();
  ctx2.moveTo(0, barH - 1);
  ctx2.lineTo(DESIGN_WIDTH, barH - 1);
  ctx2.stroke();
  ctx2.restore();
  drawResourceChip(ctx2, 14, 5, "gold", `${gold}`, GOLD_HI2);
  const livesW = 84 + String(Math.max(lives, 0)).length * 13;
  drawResourceChip(
    ctx2,
    14 + 104,
    5,
    "heart",
    `${lives}`,
    lives <= Math.max(2, maxLives * 0.25) ? "#ff8577" : "#fff4e2",
    livesW
  );
  drawWaveBannerHUD(ctx2, DESIGN_WIDTH / 2, barH / 2, waveIndex + 1, totalWaves);
  const pauseX = DESIGN_WIDTH - 120;
  const speedX = DESIGN_WIDTH - 65;
  const pauseHover = inRect(mousePos, pauseX, 8, 44, 34);
  const speedHover = inRect(mousePos, speedX, 8, 44, 34);
  applyButtonState(ctx2, pauseX, 8, 44, 34, { hover: pauseHover }, () => {
    drawFrame(ctx2, "hudpause", pauseX, 8, 44, 34, { hover: pauseHover });
    if (pauseHover) drawSheen(ctx2, pauseX, 8, 44, 34, 0.8);
    drawIcon(ctx2, paused ? "play" : "pause", pauseX + 22, 25, 24);
  });
  applyButtonState(ctx2, speedX, 8, 44, 34, { hover: speedHover }, () => {
    const st = { hover: speedHover, selected: gameSpeed === 2 };
    drawFrame(ctx2, "hudspeed", speedX, 8, 44, 34, st);
    if (speedHover) drawSheen(ctx2, speedX, 8, 44, 34, 0.8);
    if (gameSpeed === 2) {
      ctx2.save();
      roundRect(ctx2, speedX + 4.5, 8 + 4.5, 44 - 9, 34 - 9, 5);
      ctx2.fillStyle = "rgba(255,206,90,0.22)";
      ctx2.fill();
      ctx2.restore();
    }
    drawIcon(ctx2, "speed", speedX + 19, 25, 22);
    ctx2.save();
    ctx2.font = `bold 13px ${FONT_TITLE}`;
    ctx2.textAlign = "center";
    ctx2.textBaseline = "middle";
    ctx2.fillStyle = "rgba(20,8,2,0.85)";
    ctx2.fillText(`${gameSpeed}x`, speedX + 33, 26.5);
    ctx2.fillStyle = gameSpeed === 2 ? "#fff6d8" : "#e7d6b0";
    ctx2.fillText(`${gameSpeed}x`, speedX + 32.5, 25.5);
    ctx2.restore();
  });
  if (waitingForWave && waveCountdown > 0) {
    drawEarlyWaveMedallion(ctx2, waveCountdown, earlyBonusGold, mousePos, time);
  }
}
function drawResourceChip(ctx2, x, y, icon, value, valueColor, minW = 100) {
  const w = Math.max(minW, 46 + value.length * 13);
  const h = 38;
  const sprite = sprites.get(`chip:${w}x${h}`, w, h, (c, cw, ch) => paintChip(c, cw, ch), 2);
  sprites.blit(ctx2, sprite, x + w / 2, y + h / 2, w, h);
  drawIcon(ctx2, icon, x + 20, y + h / 2, 26);
  ctx2.font = `bold 20px ${FONT_TITLE}`;
  ctx2.textAlign = "left";
  ctx2.textBaseline = "middle";
  ctx2.fillStyle = "rgba(14,6,2,0.9)";
  ctx2.fillText(value, x + 38 + 1.2, y + h / 2 + 1.6);
  ctx2.fillStyle = valueColor;
  ctx2.fillText(value, x + 38, y + h / 2);
}
function paintChip(c, w, h) {
  roundRect(c, 1, 1, w - 2, h - 2, 7);
  const g = c.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "rgba(122,77,32,0.95)");
  g.addColorStop(0.55, "rgba(74,44,18,0.95)");
  g.addColorStop(1, "rgba(43,23,7,0.95)");
  c.fillStyle = g;
  c.fill();
  c.strokeStyle = "rgba(24,12,4,0.9)";
  c.lineWidth = 2;
  c.stroke();
  roundRect(c, 3, 3, w - 6, h - 6, 5);
  c.strokeStyle = "rgba(255,214,120,0.45)";
  c.lineWidth = 1.2;
  c.stroke();
  c.save();
  roundRect(c, 2, 2, w - 4, h - 4, 6);
  c.clip();
  c.fillStyle = "rgba(255,240,206,0.14)";
  c.fillRect(0, 0, w, 6);
  c.fillStyle = "rgba(10,4,0,0.18)";
  c.fillRect(0, h - 7, w, 7);
  c.restore();
}
function drawWaveBannerHUD(ctx2, cx, cy, current, total) {
  const w = 196;
  const h = 38;
  const sprite = sprites.get(
    `wavebanner:${w}x${h}`,
    w,
    h,
    (c, cw, ch) => paintWaveBanner(c, cw, ch),
    2
  );
  sprites.blit(ctx2, sprite, cx, cy, w, h);
  drawIcon(ctx2, "wave", cx - 72, cy, 26);
  ctx2.font = `bold 17px ${FONT_TITLE}`;
  ctx2.textAlign = "center";
  ctx2.textBaseline = "middle";
  ctx2.fillStyle = "rgba(14,6,2,0.85)";
  ctx2.fillText(`Wave ${current} / ${total}`, cx + 12, cy + 1.5);
  ctx2.fillStyle = "#f7e7c4";
  ctx2.fillText(`Wave ${current} / ${total}`, cx + 11, cy);
}
function paintWaveBanner(c, w, h) {
  c.beginPath();
  c.moveTo(8, 2);
  c.lineTo(w - 8, 2);
  c.quadraticCurveTo(w, h / 2, w - 8, h - 2);
  c.lineTo(8, h - 2);
  c.quadraticCurveTo(0, h / 2, 8, 2);
  c.closePath();
  const g = c.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "rgba(126,80,36,0.96)");
  g.addColorStop(0.5, "rgba(74,44,18,0.96)");
  g.addColorStop(1, "rgba(38,20,6,0.96)");
  c.fillStyle = g;
  c.fill();
  c.strokeStyle = GOLD2;
  c.lineWidth = 2;
  c.stroke();
  c.strokeStyle = "rgba(255,240,206,0.28)";
  c.lineWidth = 1;
  c.beginPath();
  c.moveTo(12, 6);
  c.lineTo(w - 12, 6);
  c.stroke();
  [-1, 1].forEach((dir) => {
    const hx = dir < 0 ? 16 : w - 16;
    c.save();
    c.translate(hx, h / 2);
    c.scale(dir, 1);
    c.beginPath();
    c.moveTo(-2, -13);
    c.quadraticCurveTo(16, -16, 20, -2);
    c.quadraticCurveTo(16, 4, 6, 4);
    c.quadraticCurveTo(-1, 4, -2, -13);
    c.closePath();
    const hg = c.createLinearGradient(0, -16, 0, 6);
    hg.addColorStop(0, "#fff0c4");
    hg.addColorStop(0.5, GOLD2);
    hg.addColorStop(1, BRONZE2);
    c.fillStyle = hg;
    c.fill();
    c.strokeStyle = UI_INK;
    c.lineWidth = 1.6;
    c.stroke();
    c.strokeStyle = "rgba(90,58,14,0.6)";
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(1, -9);
    c.quadraticCurveTo(11, -11, 15, -3);
    c.stroke();
    c.restore();
  });
}
function drawEarlyWaveMedallion(ctx2, countdown, bonusGold, mousePos, time) {
  const cx = DESIGN_WIDTH / 2;
  const cy = DESIGN_HEIGHT - 45;
  const hovered = Math.hypot(mousePos.x - cx, mousePos.y - cy) < 40;
  const pulse = (Math.sin(time * 6) + 1) * 0.5;
  ctx2.save();
  ctx2.strokeStyle = `rgba(255,150,60,${0.34 + pulse * 0.4})`;
  ctx2.lineWidth = 3 + pulse * 3;
  ctx2.beginPath();
  ctx2.arc(cx, cy, 42 + pulse * 7, 0, Math.PI * 2);
  ctx2.stroke();
  ctx2.strokeStyle = `rgba(255,224,140,${0.18 + (1 - pulse) * 0.35})`;
  ctx2.lineWidth = 1.6;
  ctx2.beginPath();
  ctx2.arc(cx, cy, 50 + (1 - pulse) * 8, 0, Math.PI * 2);
  ctx2.stroke();
  drawMedallion(ctx2, "wave", cx, cy, 40, "skull", { hover: hovered, selected: true });
  const label = `${Math.ceil(countdown)}s  +${bonusGold}g`;
  ctx2.font = `bold 15px ${FONT_TITLE}`;
  ctx2.textAlign = "center";
  ctx2.textBaseline = "middle";
  const tw = ctx2.measureText(label).width + 22;
  roundRect(ctx2, cx - tw / 2, cy + 44, tw, 22, 7);
  const plate = ctx2.createLinearGradient(0, cy + 44, 0, cy + 66);
  plate.addColorStop(0, "rgba(52,28,10,0.94)");
  plate.addColorStop(1, "rgba(26,13,4,0.94)");
  ctx2.fillStyle = plate;
  ctx2.fill();
  ctx2.strokeStyle = GOLD2;
  ctx2.lineWidth = 1.6;
  ctx2.stroke();
  ctx2.fillStyle = "rgba(12,6,2,0.9)";
  ctx2.fillText(label, cx + 1.2, cy + 55 + 1.2);
  ctx2.fillStyle = GOLD_HI2;
  ctx2.fillText(label, cx, cy + 55);
  ctx2.restore();
}

// uitools/preview.ts
var canvas = document.getElementById("c");
var ctx = canvas.getContext("2d");
var levels = [
  { id: "level_1", name: "The Green Valley", startingGold: 200, startingLives: 20, path: [], buildSlots: [], waves: [{ groups: [], earlyCallBonus: 5 }, { groups: [], earlyCallBonus: 5 }, { groups: [], earlyCallBonus: 5 }], basePosition: { x: 0, y: 0 }, spawnPosition: { x: 0, y: 0 } },
  { id: "level_2", name: "Forest Pass", startingGold: 220, startingLives: 20, path: [], buildSlots: [], waves: [{ groups: [], earlyCallBonus: 5 }, { groups: [], earlyCallBonus: 5 }, { groups: [], earlyCallBonus: 5 }, { groups: [], earlyCallBonus: 5 }], basePosition: { x: 0, y: 0 }, spawnPosition: { x: 0, y: 0 } },
  { id: "level_3", name: "Broken Bridge", startingGold: 240, startingLives: 20, path: [], buildSlots: [], waves: [{ groups: [], earlyCallBonus: 5 }, { groups: [], earlyCallBonus: 5 }], basePosition: { x: 0, y: 0 }, spawnPosition: { x: 0, y: 0 } },
  { id: "level_4", name: "Dark Swamp", startingGold: 260, startingLives: 20, path: [], buildSlots: [], waves: [{ groups: [], earlyCallBonus: 5 }], basePosition: { x: 0, y: 0 }, spawnPosition: { x: 0, y: 0 } },
  { id: "level_5", name: "Warlord's Gate", startingGold: 300, startingLives: 20, path: [], buildSlots: [], waves: [{ groups: [], earlyCallBonus: 5 }], basePosition: { x: 0, y: 0 }, spawnPosition: { x: 0, y: 0 } }
];
var save = {
  levelStars: { level_1: 3, level_2: 2, level_3: 1 },
  upgrades: {},
  totalStars: 6,
  endlessBestWave: 0,
  tutorialDismissed: true,
  settings: { muted: false }
};
var params = new URLSearchParams(location.search);
var shot = params.get("shot") ?? "title";
var pointer = { x: Number(params.get("mx") ?? 640), y: Number(params.get("my") ?? 420) };
function frame(time) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);
  if (shot === "title") {
    drawEpicTitleScreen(ctx, time, pointer, false, false);
  } else if (shot === "lore") {
    drawEpicTitleScreen(ctx, time, pointer, false, true);
  } else if (shot === "map") {
    drawParchmentWorldMap(ctx, time, pointer, levels, save, 3, null, false);
  } else if (shot === "brief") {
    drawParchmentWorldMap(ctx, time, pointer, levels, save, 0, 0, false);
  } else if (shot === "hud") {
    ctx.fillStyle = "#2c4a1f";
    ctx.fillRect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);
    drawMedievalTopHUD(ctx, 1240, 17, 20, 3, 12, false, 2, true, 6.4, 35, pointer, time);
  } else if (shot === "hudpause") {
    ctx.fillStyle = "#2c4a1f";
    ctx.fillRect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);
    drawMedievalTopHUD(ctx, 90, 4, 20, 9, 12, true, 1, false, 0, 0, { x: 1180, y: 25 }, time);
  } else if (shot === "icons") {
    ctx.fillStyle = "#221a12";
    ctx.fillRect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);
    drawIconSheet(ctx, 40, 40, 30, 10);
    drawIconSheet(ctx, 40, 260, 24, 10);
    drawIconSheet(ctx, 40, 420, 48, 8);
    ctx.fillStyle = "#f0e6d2";
    ctx.font = "16px Inter, sans-serif";
    ctx.fillText(`${ICON_NAMES.length} icons \u2014 48 / 30 / 24 px`, 40, 640);
  } else if (shot === "briefonly") {
    drawStageBriefingModal(ctx, levels[4], 5, 2, pointer, time);
  }
  requestAnimationFrame(frame);
}
void getLevelNodePositions(5);
frame(2.6);
