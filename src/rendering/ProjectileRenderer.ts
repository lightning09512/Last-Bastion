// ─── Projectile & Effect Renderer ───────────────────────────────
// Kingdom Rush style rendering for arrows, mortar shells, magic orbs and the
// tapering speed trail that follows each of them.
//
// Everything expensive is baked ONCE into an offscreen canvas through
// `SpriteBank` (wood grain, steel facets, feather layers, iron shading,
// arcane motes …) at 2–3× resolution and then blitted back at design size.
// Rotation is applied at blit time, so a single horizontal bake serves every
// firing angle — no 16-direction sprite sheet, no per-frame path building and
// no per-frame gradients.

import { Vec2 } from '../data/types';
import { sprites } from './SpriteBank';

export interface ProjectileRenderData {
  x: number;
  y: number;
  damageType: 'physical' | 'magic';
  splashRadius: number;
  active: boolean;
  color: string;
  trail: Vec2[];
  /** Remembered impact point — used only for the mortar aim ring. */
  destX?: number;
  destY?: number;
}

export interface FloatingTextRenderData {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
  active: boolean;
  size: number;
}

export interface ParticleRenderData {
  x: number;
  y: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  active: boolean;
}

// ─── Bake metrics ────────────────────────────────────────────────
// Baked canvases stay inside the budget: arrow 40×14, shell 26×26, orb 34×34.

const ARROW_W = 40;
const ARROW_H = 14;
const BALL_W = 26;
const BALL_H = 26;
const ORB_W = 34;
const ORB_H = 34;
/** Shells are lobbed, so the sphere sits a little below the flight path. */
const BALL_LIFT = 5;

const OUTLINE = '#2a1f38';

// ─── Arrow ───────────────────────────────────────────────────────
// Horizontal bake, nose pointing at +x: shaft with dark grain, faceted steel
// head with a hard specular, three fletching layers and a dark outline pass
// under the silhouette so the arrow stays readable on any terrain.

function bakeArrow(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const cy = h / 2;
  const noseX = w - 2;
  const tailX = 3;

  // Soft drop shadow under the shaft.
  ctx.fillStyle = 'rgba(0,0,0,0.16)';
  ctx.beginPath();
  ctx.ellipse(w * 0.46, cy + 2.1, w * 0.42, 1.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Silhouette pass: one fat outline behind every part.
  ctx.strokeStyle = OUTLINE;
  ctx.lineCap = 'round';
  ctx.lineWidth = 4.4;
  ctx.beginPath();
  ctx.moveTo(tailX, cy);
  ctx.lineTo(noseX - 4, cy);
  ctx.stroke();

  // Shaft: warm wood with a warm top and a cool underside.
  const shaft = ctx.createLinearGradient(0, cy - 1.4, 0, cy + 1.4);
  shaft.addColorStop(0, '#a1652c');
  shaft.addColorStop(0.45, '#7c4a1c');
  shaft.addColorStop(1, '#4a2b10');
  ctx.strokeStyle = shaft;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(tailX, cy);
  ctx.lineTo(noseX - 4, cy);
  ctx.stroke();

  // Grain: two dark hairs, a knot and a bright wire along the top.
  ctx.strokeStyle = 'rgba(60,34,12,0.55)';
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(tailX + 2, cy - 0.75);
  ctx.lineTo(noseX - 6, cy - 0.7);
  ctx.moveTo(tailX + 3, cy + 0.8);
  ctx.lineTo(noseX - 7, cy + 0.75);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,214,150,0.5)';
  ctx.lineWidth = 0.55;
  ctx.beginPath();
  ctx.moveTo(tailX + 2, cy - 1.1);
  ctx.lineTo(noseX - 8, cy - 1.05);
  ctx.stroke();
  ctx.fillStyle = 'rgba(50,28,10,0.7)';
  ctx.beginPath();
  ctx.ellipse(w * 0.5, cy + 0.4, 1.5, 0.55, 0.2, 0, Math.PI * 2);
  ctx.fill();

  // Steel head: outline, lit top facet, shadowed bottom facet, edge line.
  const headBack = noseX - 8.5;
  ctx.fillStyle = OUTLINE;
  ctx.beginPath();
  ctx.moveTo(headBack - 0.8, cy - 4.1);
  ctx.lineTo(noseX + 0.8, cy);
  ctx.lineTo(headBack - 0.8, cy + 4.1);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#dfe7ef';
  ctx.beginPath();
  ctx.moveTo(headBack, cy - 3.3);
  ctx.lineTo(noseX, cy - 0.25);
  ctx.lineTo(headBack, cy + 0.2);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#7d8a9a';
  ctx.beginPath();
  ctx.moveTo(headBack, cy + 0.2);
  ctx.lineTo(noseX, cy - 0.25);
  ctx.lineTo(headBack, cy + 3.3);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(noseX - 0.6, cy - 2.9);
  ctx.lineTo(noseX - 0.6, cy - 0.4);
  ctx.stroke();

  // Specular spark on the cutting edge.
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(noseX - 3.2, cy - 1.5);
  ctx.lineTo(noseX - 0.4, cy - 0.35);
  ctx.lineTo(noseX - 2.6, cy - 0.1);
  ctx.closePath();
  ctx.fill();

  // Fletching: three stacked layers, silhouette first.
  const fletch = (len: number, half: number, fill: string): void => {
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.moveTo(tailX + len, cy);
    ctx.lineTo(tailX + 0.5, cy - half);
    ctx.lineTo(tailX + 2.6, cy);
    ctx.lineTo(tailX + 0.5, cy + half);
    ctx.closePath();
    ctx.fill();
  };
  fletch(10.5, 4.6, OUTLINE);
  fletch(9.5, 3.5, '#f4f7fb');
  fletch(6.5, 2.2, '#b9c6d6');

  // Nock and binding thread.
  ctx.fillStyle = '#3b2a16';
  ctx.fillRect(tailX + 1.6, cy - 1.7, 1.5, 3.4);
  ctx.strokeStyle = 'rgba(40,26,12,0.8)';
  ctx.lineWidth = 0.45;
  ctx.beginPath();
  ctx.moveTo(tailX + 3.4, cy - 1.7);
  ctx.lineTo(tailX + 3.4, cy + 1.7);
  ctx.moveTo(tailX + 4.6, cy - 1.7);
  ctx.lineTo(tailX + 4.6, cy + 1.7);
  ctx.stroke();
}

// ─── Mortar shell ────────────────────────────────────────────────
// Cast-iron sphere: dark outline, iron gradient, bounce light from the
// ground, a soft bloom and a hard specular pinpoint, plus casting dimples.

function bakeCannonball(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const cx = w / 2;
  const cy = h / 2;
  const r = 8.4;

  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.beginPath();
  ctx.ellipse(cx, cy + 2.6, r * 1.05, r * 0.9, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = OUTLINE;
  ctx.beginPath();
  ctx.arc(cx, cy, r + 0.9, 0, Math.PI * 2);
  ctx.fill();

  const iron = ctx.createRadialGradient(cx - 3, cy - 3.2, 0.8, cx + 0.6, cy + 0.6, r);
  iron.addColorStop(0, '#98a3b1');
  iron.addColorStop(0.32, '#5d6874');
  iron.addColorStop(0.68, '#333c47');
  iron.addColorStop(1, '#151a21');
  ctx.fillStyle = iron;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  // Casting seam.
  ctx.strokeStyle = 'rgba(12,16,20,0.6)';
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.arc(cx, cy, r - 1.1, -0.35, 1.5);
  ctx.stroke();

  // Warm bounce light from the ground.
  ctx.fillStyle = 'rgba(120,110,96,0.28)';
  ctx.beginPath();
  ctx.ellipse(cx + 0.5, cy + r * 0.55, r * 0.52, r * 0.24, 0.1, 0, Math.PI * 2);
  ctx.fill();

  // Specular: wide bloom plus a hard pinpoint.
  ctx.fillStyle = 'rgba(255,255,255,0.28)';
  ctx.beginPath();
  ctx.ellipse(cx - 3, cy - 3.3, 3.1, 2.2, -0.7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.beginPath();
  ctx.ellipse(cx - 3.5, cy - 3.8, 1.25, 0.85, -0.7, 0, Math.PI * 2);
  ctx.fill();

  // Pitted surface.
  ctx.fillStyle = 'rgba(20,24,30,0.45)';
  ctx.beginPath();
  ctx.arc(cx + 3.3, cy + 1.4, 1.05, 0, Math.PI * 2);
  ctx.arc(cx - 1.2, cy + 4.3, 0.8, 0, Math.PI * 2);
  ctx.arc(cx + 1.4, cy - 4.6, 0.7, 0, Math.PI * 2);
  ctx.fill();
}

// ─── Magic orb ───────────────────────────────────────────────────
// White-hot core inside an arcane aura (violet core → blue halo), a cracked
// inner glyph ring and four orbiting motes.

function bakeMagicOrb(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const cx = w / 2;
  const cy = h / 2;

  const haze = ctx.createRadialGradient(cx, cy, 1, cx, cy, w / 2 - 1);
  haze.addColorStop(0, 'rgba(214,196,255,0.85)');
  haze.addColorStop(0.28, 'rgba(150,110,240,0.55)');
  haze.addColorStop(0.55, 'rgba(88,160,255,0.28)');
  haze.addColorStop(0.82, 'rgba(120,90,220,0.09)');
  haze.addColorStop(1, 'rgba(140,110,255,0)');
  ctx.fillStyle = haze;
  ctx.beginPath();
  ctx.arc(cx, cy, w / 2 - 1, 0, Math.PI * 2);
  ctx.fill();

  const aura = ctx.createRadialGradient(cx, cy, 1.4, cx, cy, 9);
  aura.addColorStop(0, 'rgba(255,255,255,0.95)');
  aura.addColorStop(0.4, 'rgba(226,196,255,0.8)');
  aura.addColorStop(0.75, 'rgba(168,116,255,0.4)');
  aura.addColorStop(1, 'rgba(150,100,255,0)');
  ctx.fillStyle = aura;
  ctx.beginPath();
  ctx.arc(cx, cy, 9, 0, Math.PI * 2);
  ctx.fill();

  // Core: violet rim, white heart.
  ctx.fillStyle = '#7c4bd8';
  ctx.beginPath();
  ctx.arc(cx, cy, 4.7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(cx, cy, 3.3, 0, Math.PI * 2);
  ctx.fill();

  // Cracked glyph ring.
  ctx.strokeStyle = 'rgba(255,255,255,0.6)';
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.arc(cx, cy, 5.6, -0.6, 1.9);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, 5.6, 2.5, 3.9);
  ctx.stroke();

  // Orbiting motes of light.
  const motes: Array<[number, number, number]> = [
    [-6.2, -4.4, 1.35],
    [7.6, -2.2, 0.95],
    [4.4, 6.4, 1.15],
    [-5.4, 5.2, 0.8],
  ];
  for (let i = 0; i < motes.length; i++) {
    const mote = motes[i];
    const mx = cx + mote[0];
    const my = cy + mote[1];
    const r = mote[2];
    ctx.fillStyle = 'rgba(226,208,255,0.75)';
    ctx.beginPath();
    ctx.arc(mx, my, r + 0.9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(mx, my, r * 0.7, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ─── Direction ───────────────────────────────────────────────────

/**
 * Flight angle in radians, averaged over the last few trail samples so the
 * sprite does not twitch when the projectile re-aims at a new target.
 */
function trailDirection(proj: ProjectileRenderData): number {
  const trail = proj.trail;
  const n = trail.length;
  if (n === 0) return 0;

  const from = n > 3 ? n - 3 : 0;
  const first = trail[from];
  const last = trail[n - 1];

  let dx = proj.x - first.x;
  let dy = proj.y - first.y;
  if (dx * dx + dy * dy < 0.000001) {
    dx = proj.x - last.x;
    dy = proj.y - last.y;
  }
  if (dx * dx + dy * dy < 0.000001) return 0;
  return Math.atan2(dy, dx);
}

// ─── Trail ───────────────────────────────────────────────────────

function drawTrail(
  ctx: CanvasRenderingContext2D,
  proj: ProjectileRenderData,
  mode: 'arrow' | 'magic' | 'shell',
): void {
  const trail = proj.trail;
  const n = trail.length;

  if (mode === 'arrow') {
    if (n < 2) return;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.strokeStyle = proj.color;
    ctx.globalAlpha = 0.3;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(proj.x, proj.y);
    for (let i = n - 1; i >= 0; i--) ctx.lineTo(trail[i].x, trail[i].y);
    ctx.stroke();
    ctx.restore();
    return;
  }

  if (mode === 'magic') {
    // Arcane ribbon: wide additive haze with a bright inner filament.
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = proj.color;
    ctx.globalAlpha = 0.2;
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.moveTo(proj.x, proj.y);
    for (let i = n - 1; i >= 0; i--) ctx.lineTo(trail[i].x, trail[i].y);
    ctx.stroke();

    ctx.globalAlpha = 0.4;
    ctx.strokeStyle = '#e9d5ff';
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(proj.x, proj.y);
    for (let i = n - 1; i >= 0; i--) ctx.lineTo(trail[i].x, trail[i].y);
    ctx.stroke();
    ctx.restore();
    return;
  }

  // Mortar smoke: grey puffs that taper and fade down the flight path.
  if (n === 0) return;
  ctx.save();
  for (let i = 0; i < n; i++) {
    const p = trail[i];
    const age = (i + 1) / (n + 1); // 1 next to the shell, → 0 at the tail
    const r = 1.4 + age * 6.4;
    ctx.globalAlpha = 0.06 + age * 0.26;
    ctx.fillStyle = age > 0.62 ? '#8d8880' : '#5f5c58';
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 0.05 + age * 0.13;
    ctx.fillStyle = '#c8c4bc';
    ctx.beginPath();
    ctx.arc(p.x - r * 0.28, p.y - r * 0.35, r * 0.58, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// ─── Optional splash marker ──────────────────────────────────────

/**
 * Faint ring painted on the ground where a mortar shell will land. It fades
 * in over the last stretch of the flight, so the player can read the splash
 * area without the ring cluttering the screen the whole time.
 */
function drawAimRing(ctx: CanvasRenderingContext2D, proj: ProjectileRenderData): void {
  const destX = proj.destX;
  const destY = proj.destY;
  if (destX === undefined || destY === undefined) return;

  const dx = destX - proj.x;
  const dy = destY - proj.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  // Fade in only while the shell is in flight, and fade out again up close.
  let alpha = 0.2;
  if (dist > 120) alpha = 0.06;
  if (dist < 14) alpha = 0.05 + (dist / 14) * 0.1;
  if (alpha <= 0.02) return;

  const radius = Math.min(Math.max(proj.splashRadius * 0.85, 11), 44);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = proj.color;
  ctx.lineWidth = 1.2;
  ctx.setLineDash([5, 4]);
  ctx.beginPath();
  ctx.arc(destX, destY, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.globalAlpha = alpha * 0.45;
  ctx.beginPath();
  ctx.moveTo(destX - radius * 0.35, destY);
  ctx.lineTo(destX + radius * 0.35, destY);
  ctx.moveTo(destX, destY - radius * 0.35);
  ctx.lineTo(destX, destY + radius * 0.35);
  ctx.stroke();
  ctx.restore();
}

// ─── Direct Canvas2D Rendering ───────────────────────────────────

export function drawProjectileDirect(
  ctx: CanvasRenderingContext2D,
  proj: ProjectileRenderData,
): void {
  if (!proj.active) return;

  const isCannon = proj.splashRadius > 0;
  const isMagic = !isCannon && proj.damageType === 'magic';
  const angle = trailDirection(proj);
  const hadSmoothing = ctx.imageSmoothingEnabled;

  if (isCannon) {
    drawAimRing(ctx, proj);
    drawTrail(ctx, proj, 'shell');
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.translate(proj.x, proj.y + BALL_LIFT);
    ctx.rotate(angle);
    ctx.drawImage(
      sprites.get('proj:cannonball', BALL_W, BALL_H, bakeCannonball),
      -BALL_W / 2, -BALL_H / 2, BALL_W, BALL_H,
    );
    ctx.restore();
  } else if (isMagic) {
    // Gentle pulse: the aura breathes, the core stays put.
    const pulse = 0.88 + 0.12 * Math.sin(proj.x * 0.09 + proj.y * 0.07);
    drawTrail(ctx, proj, 'magic');
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.translate(proj.x, proj.y);
    ctx.rotate(angle);
    ctx.globalCompositeOperation = 'lighter';
    ctx.drawImage(
      sprites.get('proj:orb', ORB_W, ORB_H, bakeMagicOrb),
      -(ORB_W * pulse) / 2, -(ORB_H * pulse) / 2, ORB_W * pulse, ORB_H * pulse,
    );
    ctx.drawImage(
      sprites.get('proj:orb', ORB_W, ORB_H, bakeMagicOrb),
      -ORB_W * 0.34, -ORB_H * 0.34, ORB_W * 0.68, ORB_H * 0.68,
    );
    ctx.restore();
  } else {
    drawTrail(ctx, proj, 'arrow');
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.translate(proj.x, proj.y);
    ctx.rotate(angle);
    ctx.drawImage(
      sprites.get('proj:arrow', ARROW_W, ARROW_H, bakeArrow),
      -ARROW_W / 2, -ARROW_H / 2, ARROW_W, ARROW_H,
    );
    ctx.restore();
  }

  ctx.imageSmoothingEnabled = hadSmoothing;
}
