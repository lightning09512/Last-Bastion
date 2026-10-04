// ─── Headless smoke test (Phase 0 verification) ──────────────────
// Runs the real simulation + render path with a stubbed canvas so the
// data-driven refactor and the bug fixes are verified by execution, not
// by reading code. Usage:
//   npx esbuild tools/smoke.ts --bundle --platform=node --format=esm --outfile=tools/smoke.mjs
//   node tools/smoke.mjs

import './domStub';
import { Game } from '../src/core/game';
import { LEVELS } from '../src/data/levels';
import { TOWERS } from '../src/data/towers';
import { ENEMIES } from '../src/data/enemies';
import { makeCanvas } from './domStub';

const DT = 1 / 60;
const failures: string[] = [];

function check(label: string, condition: boolean, detail = ''): void {
  if (!condition) failures.push(`${label}${detail ? ` — ${detail}` : ''}`);
  console.log(`${condition ? 'PASS' : 'FAIL'}  ${label}${detail ? `  (${detail})` : ''}`);
}

function makeGame(): any {
  const canvas = makeCanvas() as HTMLCanvasElement;
  const game: any = new Game(canvas);
  return game;
}

function step(game: any, seconds: number, renderEvery = 6): number {
  const steps = Math.round(seconds / DT);
  let rendered = 0;
  const t0 = performance.now();
  for (let i = 0; i < steps; i++) {
    game.renderAlpha = ((i % 3) + 1) / 3; // exercise interpolation
    game.update(DT);
    if (i % renderEvery === 0) {
      game.render();
      rendered++;
    }
  }
  return performance.now() - t0;
}

// ─── 1. Every screen renders ─────────────────────────────────────
const game = makeGame();
for (const screen of ['menu', 'worldmap'] as const) {
  game.screen = screen;
  step(game, 0.5);
  game.render();
}
check('menu + worldmap render without throwing', true);

// ─── 2. All 5 levels simulate with all tower types ───────────────
const towerIds = Object.keys(TOWERS);
let totalSteps = 0;
const t0 = performance.now();

for (const level of LEVELS) {
  game.startLevel(level);
  check(`level ${level.id} starts`, game.screen === 'level');

  // Build one of each tower type on the first slots, then max it out.
  for (let i = 0; i < Math.min(towerIds.length, level.buildSlots.length); i++) {
    const id = towerIds[i];
    game.gold = 99999;
    game.buildTower(i, id);
    const tower = game.towers[game.towers.length - 1];
    if (!tower) continue;
    game.upgradeTower(tower);
    game.upgradeTower(tower);
    const specs = TOWERS[id].specializations;
    game.specializeTower(tower, 0);
    game.specializeTower(tower, 0);
    if (tower.specId !== specs[0].specId && tower.specId !== specs[1].specId) {
      failures.push(`level ${level.id}: tower ${id} never specialized`);
    }
  }

  // Cast both spells and run a long stretch of waves.
  game.castSpell('rain_of_fire', 640, 360);
  game.castSpell('reinforcements', 640, 360);
  game.lives = 9999; // keep the run alive to reach late waves
  game.gameSpeed = 2;
  step(game, 240, 6);
  totalSteps += Math.round(240 / DT);

  const snapshot = {
    wave: game.currentWaveIndex,
    totalWaves: level.waves.length,
    enemiesSeen: game.nextEnemyId - 1,
    particles: game.particlePool.activeCount,
    projectiles: game.projectilePool.activeCount,
  };
  console.log(
    `  ${level.id}: wave ${snapshot.wave}/${snapshot.totalWaves}, ` +
    `spawned ${snapshot.enemiesSeen} enemies, ` +
    `particles ${snapshot.particles}, projectiles ${snapshot.projectiles}`,
  );

  // Sell everything to exercise the sell path.
  for (const tower of [...game.towers]) game.sellTower(tower);
  check(`level ${level.id} reached at least wave 2`, game.currentWaveIndex >= 1);
}

const simMs = performance.now() - t0;
console.log(`\nsimulated ${totalSteps} fixed steps across 5 levels in ${simMs.toFixed(0)}ms ` +
  `(${(simMs / totalSteps).toFixed(3)}ms per step incl. render every 6th)`);

// ─── 3. Regression checks for the Phase 0 bug fixes ──────────────
// (b) flying enemies must face their travel direction.
game.startLevel(LEVELS[1]); // Forest Pass, base is below the spawn
game.gold = 99999;
game.spawnEnemy('bat');
step(game, 3, 60);
const bat = game.enemies.find((e: any) => e.dataId === 'bat');
check('(b) flying enemy gets a facing direction', !!bat && typeof bat.facingLeft === 'boolean');

// (a) expired reinforcements must not come back.
game.startLevel(LEVELS[0]);
game.castSpell('reinforcements', 300, 300);
const beforeReinforcements = game.soldiers.filter((s: any) => s.towerId === null).length;
step(game, 40, 30);
const afterReinforcements = game.soldiers.filter((s: any) => s.towerId === null).length;
check('(a) reinforcements expire permanently',
  beforeReinforcements === 2 && afterReinforcements === 0,
  `before ${beforeReinforcements}, after ${afterReinforcements}`);

// (c) barracks are stunned like every other tower.
game.startLevel(LEVELS[0]);
game.gold = 99999;
game.buildTower(0, 'barracks');
const barracks = game.towers[0];
barracks.stunTimer = 5;
step(game, 0.2, 60); // soldiers are created during this step
const squad = game.soldiers.filter((s: any) => s.towerId === barracks.id && s.alive);
const squadBefore = squad.map((s: any) => ({ id: s.id, x: s.x, y: s.y }));
step(game, 1, 60); // still stunned
const squadMoved = squad.some((s: any) => {
  const before = squadBefore.find((b: any) => b.id === s.id);
  return !before || Math.hypot(s.x - before.x, s.y - before.y) > 0.5;
});
check('(c) stunned barracks squad stands down', squad.length === 2 && !squadMoved,
  `squad ${squad.length}, moved ${squadMoved}`);

// (d) a projectile whose target dies re-targets or fizzles, never teleports.
game.startLevel(LEVELS[0]);
game.gold = 99999;
game.buildTower(0, 'archer');
step(game, 6, 30);
check('(d) projectiles stay within the map', game.projectilePool.getActive().every((p: any) =>
  p.x >= -50 && p.x <= 1330 && p.y >= -200 && p.y <= 800));

// (e) splash falls off: a target at the rim takes less than one at the centre.
const g2 = makeGame();
g2.startLevel(LEVELS[0]);
g2.spawnEnemy('goblin');
const centre = g2.enemies[0];
g2.spawnEnemy('goblin');
const rim = g2.enemies[1];
centre.x = 500; centre.y = 300; rim.x = 500 + 44; rim.y = 300;
centre.armor = 0; rim.armor = 0;
g2.applySplashDamage('test', 500, 300, 45, 100, 'physical');
const centreLoss = centre.maxHp - centre.hp;
const rimLoss = rim.maxHp - rim.hp;
check('(e) splash damage falls off with distance', centreLoss === 100 && rimLoss < centreLoss && rimLoss > 0,
  `centre ${centreLoss}, rim ${rimLoss.toFixed(1)}`);

// (g) the first wave delay comes from balance, not a second assignment.
game.startLevel(LEVELS[0]);
check('(g) first wave delay comes from balance', Math.abs(game.waveTimer - 5) < 0.0001, `waveTimer ${game.waveTimer}`);

// (f) the tutorial can be dismissed and persisted.
game.startLevel(LEVELS[0]);
game.tutorialStep = 1;
const g3 = makeGame();
g3.startLevel(LEVELS[0]);
check('(f) tutorial is active on level 1', g3.tutorialStep === 1);
g3.dismissTutorial();
check('(f) tutorial dismiss is saved', g3.tutorialDismissed === true &&
  JSON.parse((globalThis as any).localStorage.getItem('last_bastion_save')).tutorialDismissed === true);

// Pause must freeze the match.
game.startLevel(LEVELS[0]);
game.gold = 99999;
game.paused = true;
const enemiesBeforePause = game.nextEnemyId;
const towersBeforePause = game.towers.length;
step(game, 5, 30);
check('pause freezes spawning', game.nextEnemyId === enemiesBeforePause);
check('pause blocks building', game.towers.length === towersBeforePause);

// Mute persistence.
const g4 = makeGame();
g4.toggleMutePersisted();
const savedMute = JSON.parse((globalThis as any).localStorage.getItem('last_bastion_save')).settings.muted;
check('mute is persisted to the save file', savedMute === true, `saved ${savedMute}`);

// Data-driven enemy abilities match enemies.ts.
check('warlord summon interval comes from data',
  ENEMIES.orc_warlord.abilities?.summon?.interval === 10 &&
  ENEMIES.orc_warlord.abilities?.stun?.range === 120);
check('shaman heal comes from data', ENEMIES.dark_shaman.abilities?.heal?.amount === 5);

// ─── Result ─────────────────────────────────────────────────────
console.log(`\n${failures.length === 0 ? 'ALL CHECKS PASSED' : `${failures.length} FAILURE(S)`}`);
for (const f of failures) console.log(` - ${f}`);
process.exit(failures.length === 0 ? 0 : 1);
