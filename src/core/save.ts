// ─── Save Manager ────────────────────────────────────────────────
// Persist game progress in localStorage with try/catch safety.

import { SaveData } from '../data/types';

const SAVE_KEY = 'last_bastion_save';

const DEFAULT_SAVE: SaveData = {
  levelStars: {},
  upgrades: {},
  totalStars: 0,
  endlessBestWave: 0,
  settings: {
    muted: false,
  },
};

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_SAVE, ...parsed };
    }
  } catch (e) {
    console.warn('Failed to load save data:', e);
  }
  return { ...DEFAULT_SAVE };
}

export function writeSave(data: SaveData): void {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('Failed to save data:', e);
  }
}

export function clearSave(): void {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch (e) {
    console.warn('Failed to clear save:', e);
  }
}
