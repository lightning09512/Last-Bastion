// ─── Last Bastion - Entry Point ──────────────────────────────────
import { Game } from './core/game';

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
