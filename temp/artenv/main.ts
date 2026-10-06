// Standalone art harness for src/rendering/EnemyRenderer.ts.
// Lives outside src/ on purpose: it is a visual QA rig, not game code.
// Run:  npx vite --config temp/artenv/harness.vite.config.ts
// then open http://localhost:4185/temp/artenv/

import {
  drawEnemyDirect,
  drawHealthBarDirect,
  drawSoldierDirect,
  type EnemyRenderData,
  type SoldierRenderData,
} from '../../../src/rendering/EnemyRenderer';
import { sprites } from '../../../src/rendering/SpriteBank';

const CANVAS_W = 1280;
const CANVAS_H = 720;

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
canvas.width = CANVAS_W;
canvas.height = CANVAS_H;
canvas.style.width = `${CANVAS_W}px`;
canvas.style.height = `${CANVAS_H}px`;

sprites.setSupersample(3);

const ENEMY_LIST = ['goblin', 'wolf', 'orc_warrior', 'dark_shaman', 'bat', 'troll', 'orc_warlord'];

const SIZES: Record<string, number> = {
  goblin: 8,
  wolf: 9,
  orc_warrior: 11,
  dark_shaman: 10,
  bat: 7,
  troll: 14,
  orc_warlord: 18,
};

function mkEnemy(dataId: string, x: number, y: number, opts: Partial<EnemyRenderData> = {}): EnemyRenderData {
  return {
    id: 1,
    dataId,
    x,
    y,
    hp: SIZES[dataId] * 10,
    maxHp: SIZES[dataId] * 10,
    speed: 40,
    armor: 0,
    magicResist: 0,
    flying: dataId === 'bat',
    color: '#7fbf3f',
    size: SIZES[dataId],
    hitFlash: 0,
    slowed: 0,
    alive: true,
    facingLeft: false,
    ...opts,
  };
}

let t = 0;
let last = performance.now();

function frame(now: number): void {
  t += Math.min(0.05, (now - last) / 1000);
  last = now;
  render(t);
  requestAnimationFrame(frame);
}

function label(text: string, x: number, y: number, color = '#cbd5e1'): void {
  ctx.font = '11px ui-monospace, Consolas, monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

function render(gt: number): void {
  // Backdrop that looks like both grass and a light sky so the rim light and
  // the dark outline are both easy to judge.
  const bg = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
  bg.addColorStop(0, '#6c8f4a');
  bg.addColorStop(0.5, '#4d7a35');
  bg.addColorStop(1, '#2f5424');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // ── Row A: 7 enemies, facing right, walk frame sampled per unit ──
  ENEMY_LIST.forEach((id, i) => {
    const x = 120 + i * 168;
    const y = 150;
    label(id, x, 70, '#e8f0c0');
    const e = mkEnemy(id, x, y, { id: i * 3 + 1, facingLeft: false });
    drawEnemyDirect(ctx, e, gt + i * 0.06);
  });

  // ── Row B: same 7 facing left, half of them in the hurt state ──
  ENEMY_LIST.forEach((id, i) => {
    const x = 120 + i * 168;
    const y = 330;
    const hurt = i % 2 === 0;
    label(hurt ? 'hurt L' : 'ok L', x, 250, hurt ? '#ffd9d9' : '#cbd5e1');
    const e = mkEnemy(id, x, y, {
      id: i * 5 + 2,
      facingLeft: true,
      hitFlash: hurt ? 1 : 0,
      hp: hurt ? SIZES[id] * 4 : SIZES[id] * 10,
      armor: i === 2 ? 0.4 : 0,
      magicResist: i === 3 ? 0.5 : 0,
    });
    drawEnemyDirect(ctx, e, gt + i * 0.09);
  });

  // ── Row C: slowed units (frost overlay) ──
  ['goblin', 'orc_warrior', 'troll', 'orc_warlord'].forEach((id, i) => {
    const x = 240 + i * 260;
    const y = 500;
    label('slowed', x, 420, '#bfe6ff');
    const e = mkEnemy(id, x, y, { id: i * 7 + 3, facingLeft: i % 2 === 0, slowed: 3, hp: SIZES[id] * 2 });
    drawEnemyDirect(ctx, e, gt + i * 0.11);
  });

  // ── Row D: soldiers, one hurt, one dead-faded ──
  const types: SoldierRenderData['type'][] = ['militia', 'footman', 'knight', 'reinforcement'];
  types.forEach((type, i) => {
    const x = 900 + i * 92;
    const y = 650;
    label(type, x, 585, '#e8e0c0');
    const s: SoldierRenderData = {
      id: i + 1,
      x,
      y,
      hp: i === 0 ? 12 : 60,
      maxHp: 60,
      type,
      hitFlash: i === 1 ? 1 : 0,
      facingLeft: i % 2 === 1,
    };
    drawSoldierDirect(ctx, s, gt + i * 0.13);
  });

  // ── Reference: bar badges at both extremes ──
  label('armor+resist', 200, 640, '#cbd5e1');
  const barRef = mkEnemy('orc_warlord', 200, 660, { armor: 0.4, magicResist: 0.5, hp: 800 * 0.18 });
  drawHealthBarDirect(ctx, barRef, 18, 0);
  const barRef2 = mkEnemy('goblin', 480, 660, { armor: 0.4, magicResist: 0.5, hp: 80 * 0.62 });
  drawHealthBarDirect(ctx, barRef2, 8, 0);
}

requestAnimationFrame(frame);
