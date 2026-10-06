// ─── Utility Functions ───────────────────────────────────────────
import { Vec2 } from '../data/types';

export function dist(a: Vec2, b: Vec2): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function distSq(a: Vec2, b: Vec2): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function lerpVec(a: Vec2, b: Vec2, t: number): Vec2 {
  return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) };
}

export function normalize(v: Vec2): Vec2 {
  const len = Math.sqrt(v.x * v.x + v.y * v.y);
  if (len === 0) return { x: 0, y: 0 };
  return { x: v.x / len, y: v.y / len };
}

export function angle(from: Vec2, to: Vec2): number {
  return Math.atan2(to.y - from.y, to.x - from.x);
}

/** Interpolate between two angles along the shortest arc. */
export function lerpAngle(from: number, to: number, t: number): number {
  let delta = (to - from) % (Math.PI * 2);
  if (delta > Math.PI) delta -= Math.PI * 2;
  if (delta < -Math.PI) delta += Math.PI * 2;
  return from + delta * t;
}

export function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

export function pointInCircle(p: Vec2, center: Vec2, radius: number): boolean {
  return distSq(p, center) <= radius * radius;
}

/** Seeded random for lane offset consistency */
let _seed = 42;
export function seededRandom(): number {
  _seed = (_seed * 16807) % 2147483647;
  return (_seed - 1) / 2147483646;
}
export function setSeed(s: number) { _seed = s; }
