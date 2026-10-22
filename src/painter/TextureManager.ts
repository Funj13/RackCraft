import * as THREE from 'three';
import { PRESET_DECALS } from './DecalStamps';

export interface UVFaceRegion {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FaceRegionsMap {
  top: UVFaceRegion;
  front: UVFaceRegion;
  back: UVFaceRegion;
  bottom: UVFaceRegion;
  left: UVFaceRegion;
  right: UVFaceRegion;
}

export class TextureManager {
  public canvas: HTMLCanvasElement;
  public ctx: CanvasRenderingContext2D;
  public threeTexture: THREE.CanvasTexture;
  public size: number;
  private undoStack: ImageData[] = [];
  private redoStack: ImageData[] = [];
  private maxHistory: number = 20;

  // Layout das regiões UV mapeadas
  public faceRegions: FaceRegionsMap = {
    top: { name: 'Painel Superior (Topo)', x: 0, y: 0, width: 0, height: 0 },
    front: { name: 'Painel Frontal (LEDs/Portas)', x: 0, y: 0, width: 0, height: 0 },
    back: { name: 'Painel Traseiro (Portas/Fonte)', x: 0, y: 0, width: 0, height: 0 },
    bottom: { name: 'Painel Inferior (Base)', x: 0, y: 0, width: 0, height: 0 },
    left: { name: 'Lateral Esquerda', x: 0, y: 0, width: 0, height: 0 },
    right: { name: 'Lateral Direita', x: 0, y: 0, width: 0, height: 0 },
  };

  constructor(size: number = 1024) {
    this.size = size;
    this.canvas = document.createElement('canvas');
    this.canvas.width = size;
    this.canvas.height = size;
    const context = this.canvas.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('Could not get 2D context for texture canvas');
    this.ctx = context;

    this.calculateRegions();

    // Cria a textura Three.js ANTES de resetWithColor para não disparar TypeError
    this.threeTexture = new THREE.CanvasTexture(this.canvas);
    this.threeTexture.colorSpace = THREE.SRGBColorSpace;
    this.threeTexture.wrapS = THREE.ClampToEdgeWrapping;
    this.threeTexture.wrapT = THREE.ClampToEdgeWrapping;
    this.threeTexture.minFilter = THREE.LinearMipmapLinearFilter;
    this.threeTexture.magFilter = THREE.LinearFilter;
    this.threeTexture.generateMipmaps = true;

    this.resetWithColor('#1e293b'); // Cinza ardósia padrão
    this.saveState();
  }

  public calculateRegions() {
    const s = this.size;
    this.faceRegions = {
      top: { name: 'Painel Superior (Topo)', x: 0.15 * s, y: 0.05 * s, width: 0.70 * s, height: 0.35 * s },
      front: { name: 'Painel Frontal (LEDs/Portas)', x: 0.15 * s, y: 0.42 * s, width: 0.70 * s, height: 0.14 * s },
      back: { name: 'Painel Traseiro (Portas/Fonte)', x: 0.15 * s, y: 0.58 * s, width: 0.70 * s, height: 0.14 * s },
      bottom: { name: 'Painel Inferior (Base)', x: 0.15 * s, y: 0.74 * s, width: 0.70 * s, height: 0.23 * s },
      left: { name: 'Lateral Esquerda', x: 0.02 * s, y: 0.20 * s, width: 0.11 * s, height: 0.60 * s },
      right: { name: 'Lateral Direita', x: 0.87 * s, y: 0.20 * s, width: 0.11 * s, height: 0.60 * s }
    };
  }

  public resetWithColor(baseColor: string = '#1e293b') {
    this.ctx.fillStyle = baseColor;
    this.ctx.fillRect(0, 0, this.size, this.size);

    // Adiciona uma textura sutil de granulação fosca / plástico/metal semi-realista
    const imgData = this.ctx.getImageData(0, 0, this.size, this.size);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const noise = (Math.random() - 0.5) * 8;
      data[i] = Math.min(255, Math.max(0, data[i] + noise));
      data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));
      data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise));
    }
    this.ctx.putImageData(imgData, 0, 0);

    this.drawFaceOutlines(false);
    this.notifyTextureUpdated();
  }

  public drawFaceOutlines(temporary: boolean = false) {
    if (!temporary) return;
    this.ctx.save();
    this.ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([6, 6]);

    for (const region of Object.values(this.faceRegions)) {
      this.ctx.strokeRect(region.x, region.y, region.width, region.height);
      this.ctx.fillStyle = 'rgba(56, 189, 248, 0.7)';
      this.ctx.font = '14px monospace';
      this.ctx.fillText(region.name, region.x + 8, region.y + 20);
    }
    this.ctx.restore();
  }

  public saveState() {
    this.redoStack = [];
    const currentState = this.ctx.getImageData(0, 0, this.size, this.size);
    this.undoStack.push(currentState);
    if (this.undoStack.length > this.maxHistory) {
      this.undoStack.shift();
    }
  }

  public undo(): boolean {
    if (this.undoStack.length <= 1) return false;
    const current = this.undoStack.pop();
    if (current) this.redoStack.push(current);
    const prev = this.undoStack[this.undoStack.length - 1];
    if (prev) {
      this.ctx.putImageData(prev, 0, 0);
      this.notifyTextureUpdated();
      return true;
    }
    return false;
  }

  public redo(): boolean {
    if (this.redoStack.length === 0) return false;
    const next = this.redoStack.pop();
    if (next) {
      this.undoStack.push(next);
      this.ctx.putImageData(next, 0, 0);
      this.notifyTextureUpdated();
      return true;
    }
    return false;
  }

  public drawBrush(u: number, v: number, size: number, color: string, opacity: number = 1) {
    const x = Math.floor(u * this.size);
    const y = Math.floor((1 - v) * this.size);

    this.ctx.save();
    this.ctx.globalAlpha = opacity;
    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    this.ctx.arc(x, y, size, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.restore();

    this.notifyTextureUpdated();
  }

  public drawBrushLine(u0: number, v0: number, u1: number, v1: number, size: number, color: string, opacity: number = 1) {
    const x0 = Math.floor(u0 * this.size);
    const y0 = Math.floor((1 - v0) * this.size);
    const x1 = Math.floor(u1 * this.size);
    const y1 = Math.floor((1 - v1) * this.size);

    this.ctx.save();
    this.ctx.globalAlpha = opacity;
    this.ctx.strokeStyle = color;
    this.ctx.fillStyle = color;
    this.ctx.lineWidth = size * 2;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';

    this.ctx.beginPath();
    this.ctx.moveTo(x0, y0);
    this.ctx.lineTo(x1, y1);
    this.ctx.stroke();
    this.ctx.restore();

    this.notifyTextureUpdated();
  }

  public floodFillUV(u: number, v: number, fillColor: string) {
    const startX = Math.floor(u * this.size);
    const startY = Math.floor((1 - v) * this.size);
    this.floodFill(startX, startY, fillColor);
  }

  public floodFill(startX: number, startY: number, fillColor: string) {
    if (startX < 0 || startX >= this.size || startY < 0 || startY >= this.size) return;

    const tempEl = document.createElement('div');
    tempEl.style.color = fillColor;
    document.body.appendChild(tempEl);
    const rgbStr = window.getComputedStyle(tempEl).color;
    document.body.removeChild(tempEl);
    const match = rgbStr.match(/\d+/g);
    if (!match) return;
    const fillR = parseInt(match[0], 10);
    const fillG = parseInt(match[1], 10);
    const fillB = parseInt(match[2], 10);

    const imgData = this.ctx.getImageData(0, 0, this.size, this.size);
    const data = imgData.data;
    const startIdx = (startY * this.size + startX) * 4;
    const targetR = data[startIdx];
    const targetG = data[startIdx + 1];
    const targetB = data[startIdx + 2];

    if (Math.abs(targetR - fillR) < 5 && Math.abs(targetG - fillG) < 5 && Math.abs(targetB - fillB) < 5) return;

    const matchTolerance = 32;
    const matchColor = (idx: number) => {
      const dr = Math.abs(data[idx] - targetR);
      const dg = Math.abs(data[idx + 1] - targetG);
      const db = Math.abs(data[idx + 2] - targetB);
      return (dr + dg + db) < matchTolerance;
    };

    const queue: [number, number][] = [[startX, startY]];
    const visited = new Uint8Array(this.size * this.size);

    while (queue.length > 0) {
      const [x, y] = queue.pop()!;
      const pixelIdx = y * this.size + x;
      if (visited[pixelIdx]) continue;
      visited[pixelIdx] = 1;

      const idx = pixelIdx * 4;
      if (!matchColor(idx)) continue;

      data[idx] = fillR;
      data[idx + 1] = fillG;
      data[idx + 2] = fillB;
      data[idx + 3] = 255;

      if (x > 0 && !visited[pixelIdx - 1]) queue.push([x - 1, y]);
      if (x < this.size - 1 && !visited[pixelIdx + 1]) queue.push([x + 1, y]);
      if (y > 0 && !visited[pixelIdx - this.size]) queue.push([x, y - 1]);
      if (y < this.size - 1 && !visited[pixelIdx + this.size]) queue.push([x, y + 1]);
    }

    this.ctx.putImageData(imgData, 0, 0);
    this.notifyTextureUpdated();
  }

  public stampDecal(u: number, v: number, decalId: string, scale: number = 1) {
    const decal = PRESET_DECALS.find(d => d.id === decalId);
    if (!decal) return;

    const x = Math.floor(u * this.size);
    const y = Math.floor((1 - v) * this.size);

    const img = new Image();
    const blob = new Blob([decal.svg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    img.onload = () => {
      const w = (img.width || 120) * scale;
      const h = (img.height || 45) * scale;
      this.ctx.drawImage(img, x - w / 2, y - h / 2, w, h);
      URL.revokeObjectURL(url);
      this.saveState();
      this.notifyTextureUpdated();
    };
    img.src = url;
  }

  public stampText(u: number, v: number, text: string, color: string = '#ffffff', fontSize: number = 24) {
    if (!text) return;
    const x = Math.floor(u * this.size);
    const y = Math.floor((1 - v) * this.size);
    this.ctx.save();
    this.ctx.font = `bold ${fontSize}px "SF Pro Text", "Segoe UI", monospace`;
    this.ctx.fillStyle = color;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(text, x, y);
    this.ctx.restore();
    this.saveState();
    this.notifyTextureUpdated();
  }

  public getColorAtUV(u: number, v: number): string {
    const x = Math.floor(u * this.size);
    const y = Math.floor((1 - v) * this.size);
    const p = this.ctx.getImageData(x, y, 1, 1).data;
    return `#${((1 << 24) + (p[0] << 16) + (p[1] << 8) + p[2]).toString(16).slice(1)}`;
  }

  public notifyTextureUpdated() {
    if (this.threeTexture) {
      this.threeTexture.needsUpdate = true;
    }
  }
}
