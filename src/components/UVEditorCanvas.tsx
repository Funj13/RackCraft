import React, { useEffect, useRef, useState } from 'react';
import { TextureManager } from '../painter/TextureManager';
import { PaintSettings } from '../types/router';
import { ZoomIn, ZoomOut, Grid, RotateCcw, Paintbrush } from 'lucide-react';

interface UVEditorCanvasProps {
  textureManager: TextureManager;
  paintSettings: PaintSettings;
  textureVersion: number;
  onTextureUpdate: () => void;
  onColorPick?: (color: string) => void;
  baseColor: string;
}

export const UVEditorCanvas: React.FC<UVEditorCanvasProps> = ({
  textureManager,
  paintSettings,
  textureVersion,
  onTextureUpdate,
  onColorPick,
  baseColor
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isPaintingRef = useRef<boolean>(false);
  const lastPosRef = useRef<{ u: number; v: number } | null>(null);

  const [showUVGrid, setShowUVGrid] = useState<boolean>(true);
  const [zoom, setZoom] = useState<number>(1);

  // Redesenha o canvas 2D sempre que o TextureManager for atualizado ou trocar zoom/grid
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Desenha a textura atual
    ctx.drawImage(textureManager.canvas, 0, 0, canvas.width, canvas.height);

    // Se as guias UV estiverem ativas, desenha sobreposição das faces
    if (showUVGrid) {
      ctx.save();
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);

      const scale = canvas.width / textureManager.size;

      for (const [key, region] of Object.entries(textureManager.faceRegions)) {
        const rx = region.x * scale;
        const ry = region.y * scale;
        const rw = region.width * scale;
        const rh = region.height * scale;

        ctx.strokeStyle = 'rgba(56, 189, 248, 0.7)';
        ctx.strokeRect(rx, ry, rw, rh);

        ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
        ctx.fillRect(rx + 4, ry + 4, Math.min(rw - 8, 160), 20);

        ctx.fillStyle = '#38bdf8';
        ctx.font = '10px ui-monospace, SFMono-Regular, monospace';
        ctx.fillText(region.name, rx + 8, ry + 17);
      }
      ctx.restore();
    }
  }, [textureVersion, showUVGrid, zoom]);

  const getUVFromEvent = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const u = Math.min(1, Math.max(0, x / rect.width));
    const v = Math.min(1, Math.max(0, 1 - y / rect.height));
    return { u, v };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const uv = getUVFromEvent(e);
    if (!uv) return;

    isPaintingRef.current = true;
    lastPosRef.current = uv;

    if (paintSettings.tool === 'picker') {
      const pickedColor = textureManager.getColorAtUV(uv.u, uv.v);
      onColorPick?.(pickedColor);
    } else if (paintSettings.tool === 'bucket') {
      textureManager.saveState();
      textureManager.floodFillUV(uv.u, uv.v, paintSettings.color);
      onTextureUpdate();
    } else if (paintSettings.tool === 'decal' && paintSettings.activeDecal) {
      textureManager.stampDecal(uv.u, uv.v, paintSettings.activeDecal, 1.0);
      onTextureUpdate();
    } else if (paintSettings.tool === 'brush') {
      textureManager.saveState();
      textureManager.drawBrush(uv.u, uv.v, paintSettings.brushSize, paintSettings.color, paintSettings.opacity);
      onTextureUpdate();
    } else if (paintSettings.tool === 'eraser') {
      textureManager.saveState();
      textureManager.drawBrush(uv.u, uv.v, paintSettings.brushSize, baseColor, 1);
      onTextureUpdate();
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isPaintingRef.current || !lastPosRef.current) return;
    const uv = getUVFromEvent(e);
    if (!uv) return;

    if (paintSettings.tool === 'brush') {
      textureManager.drawBrushLine(
        lastPosRef.current.u,
        lastPosRef.current.v,
        uv.u,
        uv.v,
        paintSettings.brushSize,
        paintSettings.color,
        paintSettings.opacity
      );
      onTextureUpdate();
    } else if (paintSettings.tool === 'eraser') {
      textureManager.drawBrushLine(
        lastPosRef.current.u,
        lastPosRef.current.v,
        uv.u,
        uv.v,
        paintSettings.brushSize,
        baseColor,
        1
      );
      onTextureUpdate();
    }
    lastPosRef.current = uv;
  };

  const handlePointerUp = () => {
    isPaintingRef.current = false;
    lastPosRef.current = null;
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 border-l border-slate-800 text-xs select-none">
      {/* Header com controles do Canvas UV */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-950/70 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Paintbrush className="w-4 h-4 text-sky-400" />
          <span className="font-semibold text-slate-200">Mapa de Textura 2D (UV Sheet)</span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowUVGrid(!showUVGrid)}
            className={`p-1.5 rounded hover:bg-slate-800 transition ${
              showUVGrid ? 'text-sky-400 bg-slate-800/80' : 'text-slate-400'
            }`}
            title="Alternar Contornos das Faces"
          >
            <Grid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setZoom(Math.max(0.7, zoom - 0.15))}
            className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition"
            title="Diminuir Zoom"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-[11px] text-slate-400 w-8 text-center">{Math.round(zoom * 100)}%</span>
          <button
            onClick={() => setZoom(Math.min(2.0, zoom + 0.15))}
            className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition"
            title="Aumentar Zoom"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Área de Visualização do Canvas */}
      <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-slate-950/40">
        <div
          className="relative rounded-lg shadow-2xl border border-slate-700/60 overflow-hidden bg-slate-900 transition-transform duration-75"
          style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
        >
          <canvas
            ref={canvasRef}
            width={512}
            height={512}
            className="w-[420px] h-[420px] block cursor-crosshair"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
          />
        </div>
      </div>

      {/* Legenda das Faces */}
      <div className="px-3 py-2 bg-slate-950/80 border-t border-slate-800 flex flex-wrap gap-2 text-[10px] text-slate-400">
        <span className="text-sky-400">🟦 Topo</span>
        <span className="text-emerald-400">🟩 Frente (LEDs/Portas)</span>
        <span className="text-amber-400">🟨 Traseira (Portas/Fonte)</span>
        <span className="text-purple-400">🟪 Laterais</span>
      </div>
    </div>
  );
};
