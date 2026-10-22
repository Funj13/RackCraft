import React from 'react';
import { PaintSettings, PaintTool, DecalItem } from '../types/router';
import { PRESET_DECALS } from '../painter/DecalStamps';
import {
  Paintbrush,
  PaintBucket,
  Eraser,
  Pipette,
  Stamp,
  Undo2,
  Redo2,
  RotateCcw,
  Sparkles,
  Download
} from 'lucide-react';

interface SidebarPaintProps {
  settings: PaintSettings;
  onChange: (updater: (prev: PaintSettings) => PaintSettings) => void;
  onUndo: () => void;
  onRedo: () => void;
  onResetTexture: () => void;
}

export const SidebarPaint: React.FC<SidebarPaintProps> = ({
  settings,
  onChange,
  onUndo,
  onRedo,
  onResetTexture
}) => {
  const setTool = (tool: PaintTool) => {
    onChange((prev) => ({ ...prev, tool }));
  };

  const setColor = (color: string) => {
    onChange((prev) => ({ ...prev, color }));
  };

  const presetColors = [
    { label: 'Preto Fosco', hex: '#0f172a' },
    { label: 'Cinza Ardósia', hex: '#1e293b' },
    { label: 'Cinza Cisco', hex: '#334155' },
    { label: 'Metal Escuro', hex: '#18181b' },
    { label: 'Branco Ubiquiti', hex: '#f8fafc' },
    { label: 'Azul MikroTik', hex: '#0284c7' },
    { label: 'Amarelo LAN', hex: '#eab308' },
    { label: 'Azul WAN', hex: '#38bdf8' },
    { label: 'Verde LED', hex: '#22c55e' },
    { label: 'Laranja Alert', hex: '#f97316' },
    { label: 'Vermelho Power', hex: '#ef4444' },
    { label: 'Roxo 100G', hex: '#a855f7' }
  ];

  return (
    <div className="w-80 h-full bg-slate-900 border-l border-slate-800 flex flex-col text-xs select-none overflow-hidden">
      {/* Cabeçalho */}
      <div className="px-4 py-3 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Paintbrush className="w-4 h-4 text-emerald-400" />
          <span className="font-bold text-slate-100 text-sm">Pintura & Texturização</span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={onUndo}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition"
            title="Desfazer (Undo)"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            onClick={onRedo}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition"
            title="Refazer (Redo)"
          >
            <Redo2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Conteúdo com Scroll */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Barra de Ferramentas de Desenho */}
        <section className="space-y-2">
          <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Ferramentas (Estilo Minecraft Skin)
          </label>
          <div className="grid grid-cols-5 gap-1.5 bg-slate-950/50 p-1.5 rounded-xl border border-slate-800">
            <button
              onClick={() => setTool('brush')}
              className={`p-2 rounded-lg flex flex-col items-center gap-1 transition ${
                settings.tool === 'brush'
                  ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
              title="Pincel"
            >
              <Paintbrush className="w-4 h-4" />
              <span className="text-[10px]">Pincel</span>
            </button>

            <button
              onClick={() => setTool('bucket')}
              className={`p-2 rounded-lg flex flex-col items-center gap-1 transition ${
                settings.tool === 'bucket'
                  ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
              title="Balde de Tinta"
            >
              <PaintBucket className="w-4 h-4" />
              <span className="text-[10px]">Balde</span>
            </button>

            <button
              onClick={() => setTool('eraser')}
              className={`p-2 rounded-lg flex flex-col items-center gap-1 transition ${
                settings.tool === 'eraser'
                  ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
              title="Borracha"
            >
              <Eraser className="w-4 h-4" />
              <span className="text-[10px]">Borracha</span>
            </button>

            <button
              onClick={() => setTool('picker')}
              className={`p-2 rounded-lg flex flex-col items-center gap-1 transition ${
                settings.tool === 'picker'
                  ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
              title="Conta-gotas"
            >
              <Pipette className="w-4 h-4" />
              <span className="text-[10px]">Gotas</span>
            </button>

            <button
              onClick={() => setTool('decal')}
              className={`p-2 rounded-lg flex flex-col items-center gap-1 transition ${
                settings.tool === 'decal'
                  ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
              title="Carimbos & Logos"
            >
              <Stamp className="w-4 h-4" />
              <span className="text-[10px]">Decals</span>
            </button>
          </div>
        </section>

        {/* Ajustes do Pincel */}
        {settings.tool !== 'decal' && (
          <section className="space-y-3 bg-slate-950/40 p-3 rounded-xl border border-slate-800">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Parâmetros do Traço
            </span>

            <div className="space-y-1.5">
              <div className="flex justify-between text-slate-300">
                <span>Tamanho do Pincel:</span>
                <span className="text-emerald-400 font-mono font-bold">{settings.brushSize} px</span>
              </div>
              <input
                type="range"
                min={2}
                max={32}
                value={settings.brushSize}
                onChange={(e) =>
                  onChange((prev) => ({ ...prev, brushSize: parseInt(e.target.value, 10) }))
                }
                className="w-full accent-emerald-400"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-slate-300">
                <span>Opacidade:</span>
                <span className="text-slate-400">{Math.round(settings.opacity * 100)}%</span>
              </div>
              <input
                type="range"
                min={0.1}
                max={1.0}
                step={0.05}
                value={settings.opacity}
                onChange={(e) =>
                  onChange((prev) => ({ ...prev, opacity: parseFloat(e.target.value) }))
                }
                className="w-full accent-emerald-400"
              />
            </div>
          </section>
        )}

        {/* Paleta de Cores */}
        <section className="space-y-2.5 bg-slate-950/40 p-3 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Cor Selecionada
            </span>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={settings.color}
                onChange={(e) => setColor(e.target.value)}
                className="w-7 h-7 rounded border-0 cursor-pointer bg-transparent"
              />
              <span className="font-mono text-xs text-slate-200 uppercase">{settings.color}</span>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-1.5 pt-1">
            {presetColors.map((c) => (
              <button
                key={c.hex}
                onClick={() => setColor(c.hex)}
                style={{ backgroundColor: c.hex }}
                className={`h-7 rounded-md border transition relative ${
                  settings.color.toLowerCase() === c.hex.toLowerCase()
                    ? 'border-white scale-105 shadow-md shadow-white/20 ring-2 ring-emerald-400'
                    : 'border-slate-700/60 hover:scale-105'
                }`}
                title={c.label}
              />
            ))}
          </div>
        </section>

        {/* Carimbos & Decalques (Decals) */}
        {settings.tool === 'decal' && (
          <section className="space-y-2 bg-slate-950/40 p-3 rounded-xl border border-slate-800">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Escolha um Carimbo ou Escreva
            </span>

            {/* Escrever Texto Direto na Textura */}
            <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-200">Carimbar Texto na Textura:</span>
                <button
                  onClick={() => onChange((prev) => ({ ...prev, activeDecal: 'custom_text' }))}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
                    settings.activeDecal === 'custom_text'
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {settings.activeDecal === 'custom_text' ? '✓ Ativo' : 'Ativar'}
                </button>
              </div>
              <input
                type="text"
                value={settings.customText || ''}
                onChange={(e) =>
                  onChange((prev) => ({
                    ...prev,
                    customText: e.target.value,
                    activeDecal: 'custom_text'
                  }))
                }
                placeholder="Ex: CISCO, CONSOLE, WAN..."
                className="w-full bg-slate-950 border border-slate-700 text-slate-100 rounded px-2 py-1 text-xs outline-none focus:border-emerald-400 font-mono"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1 max-h-56 overflow-y-auto pr-1">
              {PRESET_DECALS.map((d) => (
                <button
                  key={d.id}
                  onClick={() => onChange((prev) => ({ ...prev, activeDecal: d.id }))}
                  className={`p-2 rounded-lg border text-left flex flex-col items-center justify-center gap-1.5 transition ${
                    settings.activeDecal === d.id
                      ? 'border-emerald-400 bg-emerald-500/20 text-emerald-300'
                      : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div
                    className="w-16 h-8 flex items-center justify-center pointer-events-none"
                    dangerouslySetInnerHTML={{ __html: d.svg }}
                  />
                  <span className="text-[10px] font-medium text-center line-clamp-1">{d.name}</span>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Ação rápida: Preencher Chassi Inteiro */}
        <button
          onClick={onResetTexture}
          className="w-full py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium rounded-xl flex items-center justify-center gap-2 border border-slate-700 transition"
        >
          <RotateCcw className="w-4 h-4 text-sky-400" />
          <span>Preencher Chassi com a Cor Atual</span>
        </button>
      </div>
    </div>
  );
};
