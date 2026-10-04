// ─── Three.js Renderer ───────────────────────────────────────────
// Core rendering engine using Three.js for 2.5D isometric visuals
// Replaces Canvas2D renderer with WebGL for premium Kingdom Rush quality

import * as THREE from 'three';
import { DESIGN_WIDTH, DESIGN_HEIGHT } from '../data/types';

export class ThreeRenderer {
  scene: THREE.Scene;
  camera: THREE.OrthographicCamera;
  renderer: THREE.WebGLRenderer;
  
  // Render layers for proper z-ordering
  terrainLayer: THREE.Group;
  pathLayer: THREE.Group;
  decorationLayer: THREE.Group;
  buildSlotLayer: THREE.Group;
  towerBaseLayer: THREE.Group;
  entityLayer: THREE.Group;   // enemies + soldiers
  towerTopLayer: THREE.Group; // tower upper parts (above entities)
  projectileLayer: THREE.Group;
  effectLayer: THREE.Group;
  uiLayer: THREE.Group;
  
  // Texture cache
  private textureCache: Map<string, THREE.Texture> = new Map();
  private materialCache: Map<string, THREE.Material> = new Map();
  
  // Screen shake
  private shakeIntensity = 0;
  private shakeDecay = 0;
  private shakeOffset = new THREE.Vector2();

  constructor(canvas: HTMLCanvasElement) {
    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a2e0a);
    
    // Orthographic camera (top-down, but we'll add slight isometric feel)
    const aspect = DESIGN_WIDTH / DESIGN_HEIGHT;
    this.camera = new THREE.OrthographicCamera(
      0, DESIGN_WIDTH,
      0, DESIGN_HEIGHT,
      -1000, 1000
    );
    // Flip Y so 0,0 is top-left matching our design coordinate system
    this.camera.position.set(0, 0, 100);
    this.camera.up.set(0, -1, 0);
    this.camera.lookAt(0, 0, 0);
    this.camera.updateProjectionMatrix();

    // WebGL Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.sortObjects = false; // We control z-order with layers
    
    // Create render layers (z-order from back to front)
    this.terrainLayer = new THREE.Group();
    this.terrainLayer.position.z = 0;
    this.scene.add(this.terrainLayer);
    
    this.pathLayer = new THREE.Group();
    this.pathLayer.position.z = 1;
    this.scene.add(this.pathLayer);
    
    this.decorationLayer = new THREE.Group();
    this.decorationLayer.position.z = 2;
    this.scene.add(this.decorationLayer);
    
    this.buildSlotLayer = new THREE.Group();
    this.buildSlotLayer.position.z = 3;
    this.scene.add(this.buildSlotLayer);
    
    this.towerBaseLayer = new THREE.Group();
    this.towerBaseLayer.position.z = 4;
    this.scene.add(this.towerBaseLayer);
    
    this.entityLayer = new THREE.Group();
    this.entityLayer.position.z = 5;
    this.scene.add(this.entityLayer);
    
    this.towerTopLayer = new THREE.Group();
    this.towerTopLayer.position.z = 6;
    this.scene.add(this.towerTopLayer);
    
    this.projectileLayer = new THREE.Group();
    this.projectileLayer.position.z = 7;
    this.scene.add(this.projectileLayer);
    
    this.effectLayer = new THREE.Group();
    this.effectLayer.position.z = 8;
    this.scene.add(this.effectLayer);
    
    this.uiLayer = new THREE.Group();
    this.uiLayer.position.z = 9;
    this.scene.add(this.uiLayer);
    
    // Handle resize
    window.addEventListener('resize', () => this.resize());
    this.resize();
  }
  
  resize(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    
    // Maintain aspect ratio - fit design resolution into window
    const scaleX = w / DESIGN_WIDTH;
    const scaleY = h / DESIGN_HEIGHT;
    const scale = Math.min(scaleX, scaleY);
    
    // Center the view
    const viewW = DESIGN_WIDTH * (w / (DESIGN_WIDTH * scale));
    const viewH = DESIGN_HEIGHT * (h / (DESIGN_HEIGHT * scale));
    const offsetX = (viewW - DESIGN_WIDTH) / 2;
    const offsetY = (viewH - DESIGN_HEIGHT) / 2;
    
    this.camera.left = -offsetX;
    this.camera.right = DESIGN_WIDTH + offsetX;
    this.camera.top = -offsetY;
    this.camera.bottom = DESIGN_HEIGHT + offsetY;
    this.camera.updateProjectionMatrix();
    
    this.renderer.setSize(w, h);
  }
  
  render(): void {
    // Apply screen shake
    if (this.shakeIntensity > 0.01) {
      this.shakeOffset.set(
        (Math.random() - 0.5) * this.shakeIntensity,
        (Math.random() - 0.5) * this.shakeIntensity,
      );
      this.scene.position.set(this.shakeOffset.x, this.shakeOffset.y, 0);
      this.shakeIntensity *= this.shakeDecay;
    } else {
      this.scene.position.set(0, 0, 0);
      this.shakeIntensity = 0;
    }
    
    this.renderer.render(this.scene, this.camera);
  }
  
  triggerShake(intensity: number, decay = 0.85): void {
    this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
    this.shakeDecay = decay;
  }
  
  // ─── Layer management ────────────────────────────────────────
  
  clearLayer(layer: THREE.Group): void {
    while (layer.children.length > 0) {
      const child = layer.children[0];
      layer.remove(child);
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    }
  }
  
  clearAllDynamic(): void {
    this.clearLayer(this.entityLayer);
    this.clearLayer(this.projectileLayer);
    this.clearLayer(this.effectLayer);
    this.clearLayer(this.uiLayer);
  }
  
  clearAll(): void {
    this.clearLayer(this.terrainLayer);
    this.clearLayer(this.pathLayer);
    this.clearLayer(this.decorationLayer);
    this.clearLayer(this.buildSlotLayer);
    this.clearLayer(this.towerBaseLayer);
    this.clearAllDynamic();
    this.clearLayer(this.towerTopLayer);
  }

  // ─── Procedural Texture Generation ───────────────────────────
  
  generateProceduralTexture(
    width: number, height: number,
    drawFn: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
    cacheKey?: string,
  ): THREE.Texture {
    if (cacheKey && this.textureCache.has(cacheKey)) {
      return this.textureCache.get(cacheKey)!;
    }
    
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;
    drawFn(ctx, width, height);
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    
    if (cacheKey) {
      this.textureCache.set(cacheKey, texture);
    }
    return texture;
  }
  
  // ─── Sprite Helpers ──────────────────────────────────────────
  
  createSprite(
    texture: THREE.Texture,
    x: number, y: number,
    width: number, height: number,
    layer: THREE.Group,
  ): THREE.Mesh {
    const geometry = new THREE.PlaneGeometry(width, height);
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, 0);
    layer.add(mesh);
    return mesh;
  }
  
  createColoredRect(
    x: number, y: number,
    width: number, height: number,
    color: number | string,
    layer: THREE.Group,
    opacity = 1,
  ): THREE.Mesh {
    const geometry = new THREE.PlaneGeometry(width, height);
    const material = new THREE.MeshBasicMaterial({
      color: typeof color === 'string' ? new THREE.Color(color) : color,
      transparent: opacity < 1,
      opacity,
      depthTest: false,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, 0);
    layer.add(mesh);
    return mesh;
  }
  
  createCircle(
    x: number, y: number,
    radius: number,
    color: number | string,
    layer: THREE.Group,
    opacity = 1,
    segments = 32,
  ): THREE.Mesh {
    const geometry = new THREE.CircleGeometry(radius, segments);
    const material = new THREE.MeshBasicMaterial({
      color: typeof color === 'string' ? new THREE.Color(color) : color,
      transparent: opacity < 1,
      opacity,
      depthTest: false,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, 0);
    layer.add(mesh);
    return mesh;
  }
  
  // ─── Color Utilities ─────────────────────────────────────────
  
  static adjustColor(hex: string, amount: number): string {
    let r = parseInt(hex.slice(1, 3), 16);
    let g = parseInt(hex.slice(3, 5), 16);
    let b = parseInt(hex.slice(5, 7), 16);
    r = Math.max(0, Math.min(255, r + Math.round(amount * 255)));
    g = Math.max(0, Math.min(255, g + Math.round(amount * 255)));
    b = Math.max(0, Math.min(255, b + Math.round(amount * 255)));
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }
  
  static darken(hex: string, amount: number): string {
    return ThreeRenderer.adjustColor(hex, -amount);
  }
  
  static lighten(hex: string, amount: number): string {
    return ThreeRenderer.adjustColor(hex, amount);
  }
  
  dispose(): void {
    this.textureCache.forEach(t => t.dispose());
    this.materialCache.forEach(m => m.dispose());
    this.renderer.dispose();
  }
}
