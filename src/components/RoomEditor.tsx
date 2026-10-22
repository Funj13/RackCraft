import { useMemo, useRef, useState } from 'react';
import { RoomConfig, defaultRoom, fitRoom, roomLimits, validateRoom } from '../types/room';
import { buildRoom, disposeModel } from '../generator/RoomBuilder';
import { AssetViewport } from './AssetViewport';
import { exportToGLB } from '../io/GLBExporter';
import { NumberField, Toggle, fieldClass } from './EditorFields';

export function RoomEditor() {
  const [config, setConfig] = useState<RoomConfig>(() => structuredClone(defaultRoom));
  const [cutaway, setCutaway] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');
  const file = useRef<HTMLInputElement>(null);
  const model = useMemo(() => buildRoom(config, cutaway), [config, cutaway]);
  const update = (patch: Partial<RoomConfig>) => setConfig(prev => fitRoom({ ...prev, ...patch }));
  const save = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify({ version: '2.0', category: 'environment', type: 'room', units: 'cm', config }, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = url; a.download = `${config.name}.json`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const exportGLB = async () => {
    setExporting(true); setError('');
    const asset = buildRoom(config);
    try { await exportToGLB(asset, `${config.name}.glb`); }
    catch (e) { setError(`Falha ao exportar: ${e instanceof Error ? e.message : String(e)}`); }
    finally { disposeModel(asset); setExporting(false); }
  };
  return <div className="h-full min-h-0 flex flex-col bg-slate-950 text-slate-100">
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 px-5 py-3">
      <div><h1 className="font-semibold">Ambientes · Quarto low-poly</h1><p className="text-xs text-slate-400">Dimensões em centímetros · Exportação em escala real</p></div>
      <div className="flex gap-2 text-xs">
        <button className="rounded-lg bg-slate-800 px-3 py-2" onClick={() => file.current?.click()}>Carregar ambiente</button>
        <button className="rounded-lg bg-slate-800 px-3 py-2" onClick={save}>Salvar preset</button>
        <button className="rounded-lg bg-sky-600 px-3 py-2 disabled:opacity-50" disabled={exporting} onClick={exportGLB}>{exporting ? 'Exportando…' : 'Exportar .GLB (UE 5.4)'}</button>
      </div>
      <input ref={file} type="file" accept=".json" className="hidden" onChange={async e => {
        const selected = e.target.files?.[0]; e.target.value = ''; if (!selected) return;
        try {
          const data = JSON.parse(await selected.text());
          if (data.category !== 'environment' || data.type !== 'room' || data.version !== '2.0' || data.units !== 'cm') throw new Error('Selecione um preset de ambiente RackCraft em centímetros');
          setConfig(validateRoom(data.config)); setError('');
        } catch (err) { setError(err instanceof Error ? err.message : 'Arquivo inválido'); }
      }} />
    </header>
    {error && <div role="alert" className="bg-red-950 px-5 py-2 text-sm text-red-200">{error}</div>}
    <div className="flex flex-1 min-h-0">
      <aside className="w-72 shrink-0 overflow-y-auto border-r border-slate-800 p-4 space-y-5">
        <label className="block text-xs text-slate-300">Nome do modelo<input className={fieldClass + ' mt-1'} maxLength={100} value={config.name} onChange={e => update({ name: e.target.value.replace(/[<>:"/\\|?*]/g, '_') || 'Quarto' })} /></label>
        <section className="space-y-3"><h2 className="text-sm font-semibold text-sky-300">Dimensões internas</h2>
          {(['width', 'depth', 'height', 'wallThickness', 'floorThickness'] as const).map((key, i) => <NumberField key={key} label={['Largura', 'Profundidade', 'Altura', 'Espessura da parede', 'Espessura do piso'][i]} value={config[key]} min={roomLimits[key][0]} max={roomLimits[key][1]} onChange={n => update({ [key]: n })} />)}
        </section>
        <section className="space-y-3"><h2 className="text-sm font-semibold text-sky-300">Estrutura</h2>
          {(['front', 'back', 'left', 'right'] as const).map((side, i) => <Toggle key={side} label={['Parede frontal', 'Parede traseira', 'Parede esquerda', 'Parede direita'][i]} value={config.walls[side]} onChange={v => update({ walls: { ...config.walls, [side]: v } })} />)}
          <Toggle label="Incluir teto" value={config.ceiling} onChange={v => update({ ceiling: v })} />
        </section>
        <section className="space-y-3"><h2 className="text-sm font-semibold text-sky-300">Porta · parede frontal</h2>
          <Toggle label="Incluir porta" value={config.door.enabled} onChange={v => update({ door: { ...config.door, enabled: v } })} />
          {config.door.enabled && <><NumberField label="Largura" value={config.door.width} min={60} max={config.width-40} onChange={n => update({ door: { ...config.door, width: n } })} />
            <NumberField label="Altura" value={config.door.height} min={180} max={config.height-10} onChange={n => update({ door: { ...config.door, height: n } })} />
            <Toggle label="Porta aberta" value={config.door.open} onChange={v => update({ door: { ...config.door, open: v } })} /></>}
          {!config.walls.front && <p className="text-xs text-amber-300">Ative a parede frontal para incluir a porta.</p>}
        </section>
        <section className="space-y-3"><h2 className="text-sm font-semibold text-sky-300">Janela · parede traseira</h2>
          <Toggle label="Incluir janela" value={config.window.enabled} onChange={v => update({ window: { ...config.window, enabled: v } })} />
          {config.window.enabled && <>{(['width', 'height', 'sill'] as const).map((key, i) => <NumberField key={key} label={['Largura', 'Altura', 'Altura do peitoril'][i]} value={config.window[key]} min={key === 'sill' ? 20 : 40}
            max={key === 'width' ? config.width-40 : key === 'height' ? config.height-40 : config.height-config.window.height-10}
            onChange={n => update({ window: { ...config.window, [key]: n } })} />)}</>}
          {!config.walls.back && <p className="text-xs text-amber-300">Ative a parede traseira para incluir a janela.</p>}
        </section>
        <section className="space-y-3"><h2 className="text-sm font-semibold text-sky-300">Materiais · cores</h2>
          {(Object.keys(config.colors) as (keyof RoomConfig['colors'])[]).map((key, i) => <label key={key} className="flex justify-between items-center text-xs">{['Paredes', 'Piso', 'Teto', 'Molduras', 'Porta', 'Vidro'][i]}<input aria-label={`Cor ${key}`} type="color" value={config.colors[key]} onChange={e => update({ colors: { ...config.colors, [key]: e.target.value } })} /></label>)}
        </section>
      </aside>
      <div className="flex-1 min-w-0 relative">
        <AssetViewport model={model} />
        <div className="absolute top-4 left-4 rounded-xl border border-slate-700 bg-slate-950/90 p-3 space-y-2 max-w-xs">
          <Toggle label="Vista em corte" value={cutaway} onChange={setCutaway} />
          <p className="text-xs text-slate-400">Oculta teto e paredes frontal/direita somente na visualização. A exportação usa a estrutura habilitada.</p>
        </div>
        <div className="absolute bottom-4 left-4 text-xs text-slate-300 bg-slate-950/90 rounded-lg p-3">{config.width} × {config.depth} × {config.height} cm · {(config.width*config.depth/10000).toFixed(1)} m²<br />Arraste para orbitar · Scroll para zoom · Botão direito para deslocar</div>
      </div>
    </div>
  </div>;
}
