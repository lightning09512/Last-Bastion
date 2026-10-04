// ─── Input Manager ───────────────────────────────────────────────
// Handles mouse and touch input, translating screen coords to game coords.

import { Vec2, DESIGN_WIDTH, DESIGN_HEIGHT } from '../data/types';

export interface InputState {
  /** Current pointer position in game (design) coordinates */
  pointer: Vec2;
  /** Whether pointer is currently pressed/down */
  isDown: boolean;
  /** Set to true on the frame of a new click/tap, consumed after reading */
  justClicked: boolean;
  /** The game-coord position of the click/tap */
  clickPos: Vec2;
  /** Keys pressed this frame */
  keysJustPressed: Set<string>;
}

export class InputManager {
  private canvas: HTMLCanvasElement;
  private state: InputState = {
    pointer: { x: 0, y: 0 },
    isDown: false,
    justClicked: false,
    clickPos: { x: 0, y: 0 },
    keysJustPressed: new Set(),
  };

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.setupListeners();
  }

  private screenToGame(screenX: number, screenY: number): Vec2 {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = DESIGN_WIDTH / rect.width;
    const scaleY = DESIGN_HEIGHT / rect.height;
    return {
      x: (screenX - rect.left) * scaleX,
      y: (screenY - rect.top) * scaleY,
    };
  }

  private setupListeners(): void {
    // Mouse events
    this.canvas.addEventListener('mousemove', (e) => {
      this.state.pointer = this.screenToGame(e.clientX, e.clientY);
    });

    this.canvas.addEventListener('mousedown', (e) => {
      if (e.button === 0) {
        this.state.isDown = true;
        const pos = this.screenToGame(e.clientX, e.clientY);
        this.state.pointer = pos;
        this.state.justClicked = true;
        this.state.clickPos = { ...pos };
      }
    });

    this.canvas.addEventListener('mouseup', (e) => {
      if (e.button === 0) {
        this.state.isDown = false;
      }
    });

    // Touch events
    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      const pos = this.screenToGame(touch.clientX, touch.clientY);
      this.state.pointer = pos;
      this.state.isDown = true;
      this.state.justClicked = true;
      this.state.clickPos = { ...pos };
    }, { passive: false });

    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      this.state.pointer = this.screenToGame(touch.clientX, touch.clientY);
    }, { passive: false });

    this.canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      this.state.isDown = false;
    }, { passive: false });

    // Keyboard events
    window.addEventListener('keydown', (e) => {
      this.state.keysJustPressed.add(e.key.toLowerCase());
    });

    // Prevent context menu
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  getState(): InputState {
    return this.state;
  }

  /** Call at end of frame to consume one-shot flags */
  consumeClick(): void {
    this.state.justClicked = false;
    this.state.keysJustPressed.clear();
  }
}
