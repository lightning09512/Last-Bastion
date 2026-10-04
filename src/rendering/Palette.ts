// ─── Palette & Art Tokens ────────────────────────────────────────
// The art direction in code form: one dark outline colour for the whole
// game (never pure black), one rim-light colour, and per-level accent
// tokens used by terrain, props, VFX and post-processing.

/** Outline colour shared by every silhouette (Kingdom Rush style). */
export const SHADOW_TINT = '#2a1f38';

/** Warm highlight used for rim lights. */
export const RIM_LIGHT = 'rgba(255,247,209,0.78)';

/** Cool shadow colour for the unlit side of a body. */
export const COOL_SHADOW = '#3b2a4d';

export interface ThemeArt {
  /** Colour the ground darkens towards at the edges of the map. */
  groundTint: string;
  /** Ambient light multiplied over the whole scene. */
  ambient: string;
  /** Fog / haze colour. */
  fog: string;
  /** Highlight colour for grass blades and foliage tips. */
  foliageTip: string;
  foliageBase: string;
  /** Accent for UI panels and medals on this level. */
  accent: string;
  /** Primary / secondary colours for this level's VFX. */
  vfxPrimary: string;
  vfxSecondary: string;
  /** Scorch/decal colour left on the ground. */
  decal: string;
}

const DEFAULT_ART: ThemeArt = {
  groundTint: '#2c4a1f',
  ambient: 'rgba(255,244,214,0.10)',
  fog: 'rgba(206,232,192,0.10)',
  foliageTip: '#9ede63',
  foliageBase: '#2f7a2c',
  accent: '#f0c040',
  vfxPrimary: '#ffb648',
  vfxSecondary: '#ffe9a8',
  decal: 'rgba(38,26,20,0.35)',
};

export const THEME_ART: Record<string, ThemeArt> = {
  level_1: {
    ...DEFAULT_ART,
    groundTint: '#31541f',
    ambient: 'rgba(255,246,214,0.10)',
    fog: 'rgba(210,236,196,0.08)',
    foliageTip: '#a8e667',
    foliageBase: '#2f7f2c',
    accent: '#f0c040',
    vfxPrimary: '#ffb648',
    vfxSecondary: '#ffe9a8',
    decal: 'rgba(40,28,18,0.30)',
  },
  level_2: {
    ...DEFAULT_ART,
    groundTint: '#24401c',
    ambient: 'rgba(226,255,226,0.12)',
    fog: 'rgba(150,200,150,0.14)',
    foliageTip: '#7fd05a',
    foliageBase: '#1d5c22',
    accent: '#c9e06a',
    vfxPrimary: '#b6e35c',
    vfxSecondary: '#e8ffb0',
    decal: 'rgba(26,34,20,0.36)',
  },
  level_3: {
    ...DEFAULT_ART,
    groundTint: '#2b3a44',
    ambient: 'rgba(214,230,246,0.12)',
    fog: 'rgba(176,190,206,0.16)',
    foliageTip: '#8fa98a',
    foliageBase: '#3d6a48',
    accent: '#9fc6d8',
    vfxPrimary: '#7fc8ff',
    vfxSecondary: '#dff2ff',
    decal: 'rgba(24,26,32,0.36)',
  },
  level_4: {
    ...DEFAULT_ART,
    groundTint: '#22301c',
    ambient: 'rgba(196,226,196,0.10)',
    fog: 'rgba(110,150,110,0.22)',
    foliageTip: '#86c04a',
    foliageBase: '#1f4526',
    accent: '#9be564',
    vfxPrimary: '#7ef07a',
    vfxSecondary: '#d6ffd0',
    decal: 'rgba(18,26,18,0.42)',
  },
  level_5: {
    ...DEFAULT_ART,
    groundTint: '#3a2a24',
    ambient: 'rgba(255,186,128,0.14)',
    fog: 'rgba(120,60,44,0.20)',
    foliageTip: '#e0894a',
    foliageBase: '#4a3a28',
    accent: '#ff9a4d',
    vfxPrimary: '#ff7a3c',
    vfxSecondary: '#ffd08a',
    decal: 'rgba(30,16,12,0.42)',
  },
};

export function getThemeArt(levelId: string): ThemeArt {
  return THEME_ART[levelId] ?? DEFAULT_ART;
}
