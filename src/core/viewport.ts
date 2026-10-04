// ─── Viewport ────────────────────────────────────────────────────
// Single source of truth for how the fixed 1280×720 design space maps
// onto the real window. Everything that converts between screen pixels
// and design coordinates (renderer, input) must go through this module
// so the game is never stretched on non-16:9 displays.
//
// A0 of the Last Bastion 2.0 roadmap.

import { Vec2, DESIGN_WIDTH, DESIGN_HEIGHT } from '../data/types';

/** Margin (in design px) that UI should stay inside on notched devices. */
export const SAFE_AREA = 24;

export interface ViewportState {
  /** Uniform scale factor: design px → CSS px. */
  scale: number;
  /** CSS-px offset of the design origin inside the canvas. */
  offsetX: number;
  offsetY: number;
  /** Canvas size in CSS px. */
  width: number;
  height: number;
  /** Device pixel ratio actually used (capped). */
  dpr: number;
}

const state: ViewportState = {
  scale: 1,
  offsetX: 0,
  offsetY: 0,
  width: DESIGN_WIDTH,
  height: DESIGN_HEIGHT,
  dpr: 1,
};

/** Recompute the letterbox for a canvas of `width`×`height` CSS pixels. */
export function updateViewport(width: number, height: number, dprCap = 2): ViewportState {
  const dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, dprCap));
  // Uniform scale keeps circles round and prevents art distortion.
  const scale = Math.min(width / DESIGN_WIDTH, height / DESIGN_HEIGHT);
  state.scale = scale;
  state.offsetX = (width - DESIGN_WIDTH * scale) / 2;
  state.offsetY = (height - DESIGN_HEIGHT * scale) / 2;
  state.width = width;
  state.height = height;
  state.dpr = dpr;
  return state;
}

export function getViewport(): Readonly<ViewportState> {
  return state;
}

/**
 * Convert a DOM pointer position (clientX/clientY) into design-space
 * coordinates, honouring the letterbox offsets. `canvasRect` must be the
 * canvas' own bounding rect.
 */
export function screenToWorld(clientX: number, clientY: number, canvasRect: DOMRect): Vec2 {
  const { scale, offsetX, offsetY } = state;
  return {
    x: (clientX - canvasRect.left - offsetX) / scale,
    y: (clientY - canvasRect.top - offsetY) / scale,
  };
}

/** Convert design-space coordinates back to CSS pixels inside the canvas. */
export function worldToScreen(x: number, y: number): Vec2 {
  const { scale, offsetX, offsetY } = state;
  return { x: x * scale + offsetX, y: y * scale + offsetY };
}

/** True when a design-space point is inside the playable 1280×720 area. */
export function isInsideDesignSpace(p: Vec2): boolean {
  return p.x >= 0 && p.y >= 0 && p.x <= DESIGN_WIDTH && p.y <= DESIGN_HEIGHT;
}
