// ─── Isolated UI preview (temporary, deleted after self-review) ───
// The shared bundle is temporarily broken by another agent's in-flight
// TowerRenderer refactor, so this harness renders UIRenderer + Icons on
// their own canvas and lets the browser checker screenshot every screen.

import {
  drawParchmentWorldMap,
  drawEpicTitleScreen,
  drawMedievalTopHUD,
  drawStageBriefingModal,
  getLevelNodePositions,
} from '../src/rendering/UIRenderer';
import { drawIconSheet, ICON_NAMES } from '../src/rendering/Icons';
import { LevelData, SaveData, DESIGN_WIDTH, DESIGN_HEIGHT } from '../src/data/types';

const canvas = document.getElementById('c') as HTMLCanvasElement;
const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;

const levels: LevelData[] = [
  { id: 'level_1', name: 'The Green Valley', startingGold: 200, startingLives: 20, path: [], buildSlots: [], waves: [{ groups: [], earlyCallBonus: 5 }, { groups: [], earlyCallBonus: 5 }, { groups: [], earlyCallBonus: 5 }], basePosition: { x: 0, y: 0 }, spawnPosition: { x: 0, y: 0 } },
  { id: 'level_2', name: 'Forest Pass', startingGold: 220, startingLives: 20, path: [], buildSlots: [], waves: [{ groups: [], earlyCallBonus: 5 }, { groups: [], earlyCallBonus: 5 }, { groups: [], earlyCallBonus: 5 }, { groups: [], earlyCallBonus: 5 }], basePosition: { x: 0, y: 0 }, spawnPosition: { x: 0, y: 0 } },
  { id: 'level_3', name: 'Broken Bridge', startingGold: 240, startingLives: 20, path: [], buildSlots: [], waves: [{ groups: [], earlyCallBonus: 5 }, { groups: [], earlyCallBonus: 5 }], basePosition: { x: 0, y: 0 }, spawnPosition: { x: 0, y: 0 } },
  { id: 'level_4', name: 'Dark Swamp', startingGold: 260, startingLives: 20, path: [], buildSlots: [], waves: [{ groups: [], earlyCallBonus: 5 }], basePosition: { x: 0, y: 0 }, spawnPosition: { x: 0, y: 0 } },
  { id: 'level_5', name: "Warlord's Gate", startingGold: 300, startingLives: 20, path: [], buildSlots: [], waves: [{ groups: [], earlyCallBonus: 5 }], basePosition: { x: 0, y: 0 }, spawnPosition: { x: 0, y: 0 } },
];

const save: SaveData = {
  levelStars: { level_1: 3, level_2: 2, level_3: 1 },
  upgrades: {},
  totalStars: 6,
  endlessBestWave: 0,
  tutorialDismissed: true,
  settings: { muted: false },
};

const params = new URLSearchParams(location.search);
const shot = params.get('shot') ?? 'title';
const pointer = { x: Number(params.get('mx') ?? 640), y: Number(params.get('my') ?? 420) };

function frame(time: number): void {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);

  if (shot === 'title') {
    drawEpicTitleScreen(ctx, time, pointer, false, false);
  } else if (shot === 'lore') {
    drawEpicTitleScreen(ctx, time, pointer, false, true);
  } else if (shot === 'map') {
    drawParchmentWorldMap(ctx, time, pointer, levels, save, 3, null, false);
  } else if (shot === 'brief') {
    drawParchmentWorldMap(ctx, time, pointer, levels, save, 0, 0, false);
  } else if (shot === 'hud') {
    ctx.fillStyle = '#2c4a1f';
    ctx.fillRect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);
    drawMedievalTopHUD(ctx, 1240, 17, 20, 3, 12, false, 2, true, 6.4, 35, pointer, time);
  } else if (shot === 'hudpause') {
    ctx.fillStyle = '#2c4a1f';
    ctx.fillRect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);
    drawMedievalTopHUD(ctx, 90, 4, 20, 9, 12, true, 1, false, 0, 0, { x: 1180, y: 25 }, time);
  } else if (shot === 'icons') {
    ctx.fillStyle = '#221a12';
    ctx.fillRect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);
    drawIconSheet(ctx, 40, 40, 30, 10);
    drawIconSheet(ctx, 40, 260, 24, 10);
    drawIconSheet(ctx, 40, 420, 48, 8);
    ctx.fillStyle = '#f0e6d2';
    ctx.font = '16px Inter, sans-serif';
    ctx.fillText(`${ICON_NAMES.length} icons — 48 / 30 / 24 px`, 40, 640);
  } else if (shot === 'briefonly') {
    drawStageBriefingModal(ctx, levels[4], 5, 2, pointer, time);
  }

  requestAnimationFrame(frame);
}

void getLevelNodePositions(5);
frame(2.6);
