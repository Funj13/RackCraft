import React, { useState, useRef, useMemo } from 'react';
import { RouterConfig, PaintSettings, ElementId } from './types/router';
import { TextureManager } from './painter/TextureManager';
import { Viewport3D } from './components/Viewport3D';
import { UVEditorCanvas } from './components/UVEditorCanvas';
import { SidebarHardware } from './components/SidebarHardware';
import { SidebarPaint } from './components/SidebarPaint';
import { exportToGLB, exportPresetJSON, importPresetJSON, exportTexturePNG } from './io/GLBExporter';
import { buildCompleteRouter } from './generator/RouterBuilder';
import {
  Download,
  Upload,
  FileCode,
  Image as ImageIcon,
  Columns,
  Cpu,
  Paintbrush,
  HelpCircle,
  CheckCircle2,
  X
} from 'lucide-react';

export function App() {
  // Configuração padrão: Roteador Wi-Fi doméstico / pequeno escritório
  const [config, setConfig] = useState<RouterConfig>({
    name: 'Router_AX3000_Gigabit',
    chassis: {
      type: 'desktop_router',
      width: 24,
      height: 3.8,
      depth: 16,
      cornerRadius: 0.5,
      hasRackEars: false,
      ventilationSides: true,
      ventilationTop: false,
      baseColor: '#1e293b',
      bodyMetallic: 0.15,
      bodyRoughness: 0.65
    },
    ports: {
      rj45LanCount: 4,
      rj45WanCount: 1,
      rj45Arrangement: 'single_row',
      sfpCount: 0,
      sfpPlusCount: 0,
      sfp28Count: 0,
      qsfpCount: 0,
      hasConsolePort: false,
      usbPortCount: 1
    },
    power: {
      type: 'dc_barrel',
      hasPowerSwitch: true,
      powerLedOn: true
    },
    antennas: {
      count: 2,
      placement: 'rear',
      height: 9,
      angle: 15,
      color: '#1e293b'
    },
    frontPanel: {
      ledCount: 5,
      ledStatus: true,
      hasResetHole: true,
      hasWpsButton: true,
      hasOledScreen: false
    },
    accessories: {
      perforatedGrill: false,
      grillWidth: 10,
      grillPosition: 'front',
      fanTrayCount: 0,
      hasRackHandles: false,
      hasGroundingLug: false
    }
  });

  const [paintSettings, setPaintSettings] = useState<PaintSettings>({
    tool: 'brush',
    color: '#0284c7',
    brushSize: 8,
    opacity: 1,
    roughness: 0.5,
    metallic: 0.1,
    isEmissive: false,
    activeDecal: 'wifi6'
  });

  const [textureVersion, setTextureVersion] = useState<number>(1);
  const [showUVPanel, setShowUVPanel] = useState<boolean>(true);
  const [showHardwareSidebar, setShowHardwareSidebar] = useState<boolean>(true);
  const [showPaintSidebar, setShowPaintSidebar] = useState<boolean>(true);
  const [showUnrealHelp, setShowUnrealHelp] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Instância singleton do TextureManager
  const textureManager = useMemo(() => new TextureManager(1024), []);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedElementId, setSelectedElementId] = useState<ElementId | null>(null);
  const [viewportMode, setViewportMode] = useState<'paint' | 'move' | 'rotate' | 'write'>('move');

  const handleTextureUpdate = () => {
    setTextureVersion((v) => v + 1);
  };

  const handleUndo = () => {
    if (textureManager.undo()) handleTextureUpdate();
  };

  const handleRedo = () => {
    if (textureManager.redo()) handleTextureUpdate();
  };

  const handleResetTexture = () => {
    textureManager.resetWithColor(paintSettings.color);
    setConfig((prev) => ({
      ...prev,
      chassis: { ...prev.chassis, baseColor: paintSettings.color }
    }));
    handleTextureUpdate();
  };

  const handleColorPick = (color: string) => {
    setPaintSettings((prev) => ({ ...prev, color, tool: 'brush' }));
  };

  // Exportação GLB (Unreal Engine 5.4)
  const handleExportGLB = async () => {
    setIsExporting(true);
    try {
      const model = buildCompleteRouter(config, textureManager);
      await exportToGLB(model, `${config.name}.glb`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportJSON = () => {
    exportPresetJSON(config, textureManager, `${config.name}.json`);
  };

  const handleImportJSONClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    importPresetJSON(file, (loadedConfig, loadedImg) => {
      setConfig(loadedConfig);
      if (loadedImg.width > 0) {
        textureManager.ctx.drawImage(loadedImg, 0, 0, textureManager.size, textureManager.size);
        textureManager.saveState();
        textureManager.notifyTextureUpdated();
        handleTextureUpdate();
      }
    });
    e.target.value = '';
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 font-sans">
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Top Bar Header */}
      <header className="h-14 bg-slate-950 border-b border-slate-800 px-4 flex items-center justify-between z-10 select-none">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-sky-500 to-indigo-500 flex items-center justify-center shadow-lg shadow-sky-500/20">
            <Cpu className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-sm tracking-wide text-white">RackCraft 3D</h1>
              <span className="px-2 py-0.5 text-[10px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full">
                Unreal Engine 5.4 Ready
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Gerador Procedural e Texturizador 3D de Roteadores & Switches</p>
          </div>
        </div>

        {/* Toggles de Painéis e Ações */}
        <div className="flex items-center gap-2 text-xs">
          {/* Toggles de Visibilidade */}
          <button
            onClick={() => setShowHardwareSidebar(!showHardwareSidebar)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-medium transition ${
              showHardwareSidebar
                ? 'bg-slate-800 text-sky-400 border-slate-700'
                : 'text-slate-400 border-transparent hover:bg-slate-900'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Hardware</span>
          </button>

          <button
            onClick={() => setShowUVPanel(!showUVPanel)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-medium transition ${
              showUVPanel
                ? 'bg-slate-800 text-sky-400 border-slate-700'
                : 'text-slate-400 border-transparent hover:bg-slate-900'
            }`}
          >
            <Columns className="w-3.5 h-3.5" />
            <span>Mapa UV 2D</span>
          </button>

          <button
            onClick={() => setShowPaintSidebar(!showPaintSidebar)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-medium transition ${
              showPaintSidebar
                ? 'bg-slate-800 text-emerald-400 border-slate-700'
                : 'text-slate-400 border-transparent hover:bg-slate-900'
            }`}
          >
            <Paintbrush className="w-3.5 h-3.5" />
            <span>Pintura</span>
          </button>

          <div className="w-px h-5 bg-slate-800 mx-1" />

          {/* Import / Export JSON Preset */}
          <button
            onClick={handleImportJSONClick}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-lg border border-slate-800 transition"
            title="Importar preset salvo em JSON"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Carregar</span>
          </button>

          <button
            onClick={handleExportJSON}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-lg border border-slate-800 transition"
            title="Salvar preset completo com textura em JSON"
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>Salvar Preset</span>
          </button>

          <button
            onClick={() => exportTexturePNG(textureManager, `${config.name}-texture.png`)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-lg border border-slate-800 transition"
            title="Exportar apenas a textura como imagem PNG"
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>PNG</span>
          </button>

          {/* Botão de Ajuda Unreal Engine */}
          <button
            onClick={() => setShowUnrealHelp(true)}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
            title="Instruções para Unreal Engine 5.4"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          {/* BOTÃO PRINCIPAL: EXPORTAR GLB */}
          <button
            onClick={handleExportGLB}
            disabled={isExporting}
            className="flex items-center gap-2 px-4 py-1.5 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-semibold rounded-lg shadow-lg shadow-sky-500/25 transition active:scale-95 disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>{isExporting ? 'Exportando...' : 'Exportar .GLB (UE 5.4)'}</span>
          </button>
        </div>
      </header>

      {/* Workspace Principal */}
      <main className="flex-1 flex overflow-hidden">
        {/* Painel Esquerdo: Configurações de Hardware */}
        {showHardwareSidebar && (
          <SidebarHardware
            config={config}
            onChange={setConfig}
            onPresetColorChange={(color) => {
              textureManager.resetWithColor(color);
              handleTextureUpdate();
            }}
            selectedElementId={selectedElementId}
            onSelectElement={(id) => {
              setSelectedElementId(id);
              setViewportMode('move');
            }}
            onEnterWriteMode={() => setViewportMode('write')}
          />
        )}

        {/* Centro: Viewport 3D do Three.js */}
        <div className="flex-1 relative h-full">
          <Viewport3D
            config={config}
            onChangeConfig={setConfig}
            textureManager={textureManager}
            paintSettings={paintSettings}
            onColorPick={handleColorPick}
            textureVersion={textureVersion}
            selectedElementId={selectedElementId}
            onSelectElement={setSelectedElementId}
            viewportMode={viewportMode}
            onViewportModeChange={setViewportMode}
          />
        </div>

        {/* Centro-Direito Opcional: Canvas UV 2D estilo Minecraft/Blockbench */}
        {showUVPanel && (
          <div className="w-[440px] h-full flex-shrink-0">
            <UVEditorCanvas
              textureManager={textureManager}
              paintSettings={paintSettings}
              textureVersion={textureVersion}
              onTextureUpdate={handleTextureUpdate}
              onColorPick={handleColorPick}
              baseColor={config.chassis.baseColor}
            />
          </div>
        )}

        {/* Painel Direito: Ferramentas de Pintura */}
        {showPaintSidebar && (
          <SidebarPaint
            settings={paintSettings}
            onChange={setPaintSettings}
            onUndo={handleUndo}
            onRedo={handleRedo}
            onResetTexture={handleResetTexture}
          />
        )}
      </main>

      {/* Modal de Instruções para Unreal Engine 5.4 */}
      {showUnrealHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative text-sm">
            <button
              onClick={() => setShowUnrealHelp(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400">
                <Cpu className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-white">Como Importar na Unreal Engine 5.4</h3>
                <p className="text-xs text-slate-400">Direto e sem conversões complexas</p>
              </div>
            </div>

            <div className="space-y-3 text-slate-300 text-xs">
              <div className="flex items-start gap-2.5 p-3 rounded-lg bg-slate-950/60 border border-slate-800">
                <CheckCircle2 className="w-4 h-4 text-sky-400 flex-shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white block">1. Arraste o arquivo .GLB</strong>
                  Arraste o arquivo exportado diretamente para o seu <strong>Content Browser</strong> da Unreal Engine 5.4.
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-3 rounded-lg bg-slate-950/60 border border-slate-800">
                <CheckCircle2 className="w-4 h-4 text-sky-400 flex-shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white block">2. Configurações de Importação (Interchange)</strong>
                  A UE 5.4 usa o <em>Interchange Pipeline</em> por padrão. Mantenha marcadas as opções <strong>Import Materials</strong> e <strong>Import Textures</strong>.
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-3 rounded-lg bg-slate-950/60 border border-slate-800">
                <CheckCircle2 className="w-4 h-4 text-sky-400 flex-shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white block">3. Brilho dos LEDs com Lumen</strong>
                  Os LEDs frontais e portas ópticas vêm configurados com canais de emissão. Se desejar mais intensidade, abra a instância de material e multiplique o parâmetro <em>Emissive</em> por 5 ou 10 para iluminar o cenário com Lumen!
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-3 rounded-lg bg-slate-950/60 border border-slate-800">
                <CheckCircle2 className="w-4 h-4 text-sky-400 flex-shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white block">4. Escala e Colisões</strong>
                  A malha foi gerada em escala centimétrica padrão do Unreal (1 unidade = 1 cm). Você pode gerar Simple Box Collision direto no Static Mesh Editor.
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowUnrealHelp(false)}
              className="mt-5 w-full py-2.5 bg-sky-500 hover:bg-sky-400 text-white font-semibold rounded-xl transition"
            >
              Entendido!
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
