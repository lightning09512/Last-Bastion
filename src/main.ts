// ─── Last Bastion - Entry Point ──────────────────────────────────
import { Game } from './core/game';
import { postFx } from './core/postfx';

// Wait for DOM and fonts
window.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
  const loadingScreen = document.getElementById('loading-screen') as HTMLDivElement;
  const loadingBar = document.getElementById('loading-bar') as HTMLDivElement;
  const loadingText = document.getElementById('loading-text') as HTMLDivElement;

  if (!canvas) {
    console.error('Canvas not found!');
    return;
  }

  // Simulate asset loading (we use procedural graphics, so this is quick)
  let progress = 0;
  const loadInterval = setInterval(() => {
    progress += 10 + Math.random() * 15;
    if (progress >= 100) {
      progress = 100;
      clearInterval(loadInterval);

      loadingText.textContent = 'Battle ready!';
      loadingBar.style.width = '100%';

      setTimeout(() => {
        // Fade out loading screen
        loadingScreen.style.transition = 'opacity 0.5s';
        loadingScreen.style.opacity = '0';
        setTimeout(() => {
          loadingScreen.style.display = 'none';
          // Start game
          const game = new Game(canvas);

          // QA hooks: ?debug=1 shows the F1 overlay, ?level=<id> skips the menus,
          // ?fx=0 disables post-processing (low-end devices / reduced motion).
          const params = new URLSearchParams(window.location.search);
          if (params.get('fx') === '0') {
            postFx.settings = { bloom: 0, grade: 0, fog: 0, grain: 0, vignette: 0.6 };
          }
          const debug = params.get('debug') === '1';
          if (debug) {
            game.enableDebug();
            // Expose the instance so automated browser checks can drive it.
            (window as unknown as Record<string, unknown>).__lastBastion = game;
          }
          const levelId = params.get('level');
          if (levelId) game.startLevelById(levelId);

          game.start();
        }, 500);
      }, 300);
    } else {
      loadingBar.style.width = `${progress}%`;
      const messages = [
        'Sharpening arrows...',
        'Training soldiers...',
        'Brewing potions...',
        'Fortifying walls...',
        'Scouting enemy camps...',
        'Polishing shields...',
      ];
      loadingText.textContent = messages[Math.floor(Math.random() * messages.length)];
    }
  }, 150);
});
