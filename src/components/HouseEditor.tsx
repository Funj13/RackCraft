import { useEffect, useMemo, useRef, useState } from 'react';
import { HouseConfig, HouseSide, HouseWall, OpeningKind, cellDimensions, createHouse, fitHouse, houseMinimumSize,
  isExteriorWall, randomHouse, roomToHouse, roomWallKey, setFloorCount, validateHouse, RoomType, resizeRoomAxis, resizeRoom, moveRoom, expandLivingBesideBathroom, roomBounds, stairMinimumDepth, bedroomColors, randomizeRoomSizes, inferRoomType, cellBounds, floorElevation } from '../types/house';
import {enableFreeLayout,freeLayoutWarnings} from '../types/houseFreeLayout';
import {houseWalls} from '../types/houseWalls';
import {HousePlan} from './HousePlan';
import { buildHouse } from '../generator/HouseBuilder';
import { disposeModel } from '../generator/RoomBuilder';
import { exportToGLB } from '../io/GLBExporter';
import { AssetViewport } from './AssetViewport';
import { NumberField, Toggle, fieldClass } from './EditorFields';
import { BedroomLibrary, loadBedroomLibrary } from '../generator/BedroomLibrary';
import { FurnitureReport,editableFurniture,furnitureBounds,assertFurnitureFits,findFurniturePlacement } from '../generator/FurnitureBuilder';
import {FurnitureInstance} from '../types/furniture';
import {FurnitureEditor} from './FurnitureEditor';
import {FurnitureSelection} from './AssetViewport';
import { isOpening, neighbour, planCirculation, residentialFloor, roomEdges } from '../types/houseCirculation';

const buttonClass='rounded-lg bg-slate-800 px-3 py-2 hover:bg-slate-700 transition';
const sides: HouseSide[]=['back','front','left','right'];
const sideNames: Record<HouseSide,string>={back:'Fundo',front:'Frente',left:'Esquerda',right:'Direita'};

export function HouseEditor() {
  const [storedConfig,setConfig]=useState<HouseConfig>(()=>createHouse(true));
  const config=useMemo(()=>validateHouse(storedConfig),[storedConfig]);
  const [selectedFloor,setSelectedFloor]=useState(0);
  const [selection,setSelection]=useState<string|{room:string;object?:string}>('1:0');
  const selectedRoom=typeof selection==='string'?selection:selection.room;
  const selectedObject=typeof selection==='string'?undefined:selection.object;
  const setSelectedRoom=(room:string)=>setSelection(room);
  const [cutaway,setCutaway]=useState(true);
  const [isolate,setIsolate]=useState(false);
  const [showRoof,setShowRoof]=useState(true);
  const [focusSelected,setFocusSelected]=useState(false);
  const [exporting,setExporting]=useState(false);
  const [error,setError]=useState('');
  const [previous,setPrevious]=useState<HouseConfig | null>(null);
  const [designRevision,setDesignRevision]=useState(0);
  const [library,setLibrary]=useState<BedroomLibrary>();
  const [referenceError,setReferenceError]=useState('');
  const [snapRooms,setSnapRooms]=useState(true);
  useEffect(()=>{
    let active=true;
    loadBedroomLibrary().then(value=>{if(active)setLibrary(value);}).catch(error=>{if(active)setReferenceError(String(error));});
    return()=>{active=false;};
  },[]);
  const file=useRef<HTMLInputElement>(null);
  const activeIndex=Math.min(selectedFloor,config.floors.length-1);
  const floor=config.floors[activeIndex];
  const free=floor.layout==='free';
  const layoutWarnings=config.floors.flatMap((f,i)=>freeLayoutWarnings(config,i).map(w=>`${f.name}: ${w}`));
  const room=floor.rooms.find(r=>r.id===selectedRoom) ?? floor.rooms[0];
  const [row,col]=room.id.split(':').map(Number);
  const allocation=cellDimensions(config,room.id);
  const dimensions=roomBounds(config,activeIndex,room.id);
  const boundaries=free?houseWalls(config,activeIndex).filter(s=>s.rooms.includes(room.id) && s.end-s.start>=60).map(s=>({side:s.sides![room.id],key:s.key,wall:s.config,exterior:s.rooms.length===1,adjacent:s.rooms.find(id=>id!==room.id),length:s.end-s.start}))
    :sides.map(side=>{const key=roomWallKey(row,col,side);return {side,key,wall:floor.walls[key],exterior:isExteriorWall(config,key),adjacent:neighbour(config,room.id,side),length:side==='front'||side==='back'?dimensions.width:dimensions.depth};});
  const minimum=houseMinimumSize(config);
  const staircase=config.floors.length===2 && config.stairs.enabled;
  const selectedBounds=dimensions,floorY=floorElevation(config,activeIndex);
  const focusedRoomId=focusSelected?room.id:undefined;
  const model=useMemo(()=>buildHouse(config,{cutaway,showRoof,floor:isolate ? activeIndex : undefined,room:focusedRoomId},library),[config,cutaway,showRoof,isolate,activeIndex,library,focusedRoomId]);
  const report=(model.userData.furnitureReports as Record<string,FurnitureReport>)[`${activeIndex}/${room.id}`];
  const applyChange=(make:()=>HouseConfig)=>{
    try {const next=validateHouse(make());if(library)assertFurnitureFits(next,library);setConfig(next);setError('');return true;}
    catch(e){setError(e instanceof Error?e.message:String(e));return false;}
  };
  const update=(patch: Partial<HouseConfig>)=>applyChange(()=>fitHouse({...config,...patch}));
  const editFloor=(patch: Partial<typeof floor>)=>update({floors:config.floors.map((f,i)=>i===activeIndex ? {...f,...patch} : f)});
  const editWall=(side: HouseSide,patch: Partial<HouseWall>,selectedKey?:string)=>{
    if(free){
      const key=selectedKey!,walls=structuredClone(floor.freeWalls!),segments=houseWalls(config,activeIndex),segment=segments.find(s=>s.key===key)!;
      if(patch.kind==='door' || patch.kind==='passage')for(const id of segment.rooms.filter(id=>floor.rooms.find(r=>r.id===id)!.type==='bathroom')){
        segments.filter(s=>s.key!==key && s.rooms.includes(id) && isOpening(walls[s.key])).forEach(s=>{walls[s.key].kind='solid';});
        patch={...patch,kind:'door'};
      }
      walls[key]={...walls[key],...patch};editFloor({freeWalls:walls});return;
    }
    const key=roomWallKey(row,col,side);
    const walls=structuredClone(floor.walls);
    if(patch.kind==='door' || patch.kind==='passage') {
      const adjacent=neighbour(config,room.id,side);
      const bathrooms=floor.rooms.filter(r=>r.type==='bathroom' && (r.id===room.id || r.id===adjacent));
      for(const bathroom of bathrooms)for(const edge of roomEdges(bathroom.id)) {
        if(edge.key!==key && isOpening(walls[edge.key]))walls[edge.key].kind='solid';
      }
      if(bathrooms.length)patch={...patch,kind:'door',open:false};
    }
    walls[key]={...walls[key],...patch};
    editFloor({walls});
  };
  const generate=()=>{
    setPrevious(structuredClone(config)); setConfig(randomHouse()); setSelectedFloor(0); setSelectedRoom('0:0'); setError('');
    setIsolate(false); setDesignRevision(v=>v+1);
  };
  const move=(id:string,x:number,z:number,snap=snapRooms)=>applyChange(()=>{
    const next=moveRoom(config,activeIndex,id,x,z,snap);if(JSON.stringify(next)!==JSON.stringify(config))setPrevious(structuredClone(config));return next;
  });
  const editObjects=(index:number,roomId:string,objects:FurnitureInstance[])=>applyChange(()=>{
    if(!library)throw new Error('Aguarde a biblioteca de objetos carregar.');
    const target=config.floors[index].rooms.find(r=>r.id===roomId)!,bounds=roomBounds(config,index,roomId);
    if(config.floors.length===2 && config.stairs.enabled && roomId===config.stairs.cellId)throw new Error('A célula da escada precisa ficar livre.');
    for(const item of objects){const b=furnitureBounds(item,library);
      if(b.min.x < -bounds.width/2-0.01 || b.max.x>bounds.width/2+0.01 || b.min.z < -bounds.depth/2-0.01 || b.max.z>bounds.depth/2+0.01 || b.max.y>config.floors[index].height-1)
        throw new Error('O objeto precisa caber dentro do cômodo, abaixo do teto. Reduza a escala ou ajuste sua posição.');
    }
    const next=structuredClone(config);const nextRoom=next.floors[index].rooms.find(r=>r.id===roomId)!;nextRoom.objects=objects;nextRoom.furnished=true;
    const valid=validateHouse(next);if(JSON.stringify(valid)!==JSON.stringify(config))setPrevious(structuredClone(config));
    return valid;
  });
  const selectObject=(s:FurnitureSelection)=>{setSelectedFloor(s.floor);setSelection({room:s.roomId,object:s.id});};
  const moveObject=(s:FurnitureSelection,position:{x:number;y:number;z:number})=>{
    if(!library)return false;
    const target=config.floors[s.floor].rooms.find(r=>r.id===s.roomId)!;
    const items=editableFurniture(config,s.floor,target,library),base=target.finish==='plain'?0.41:target.finish==='tile'?0.78:0.75;
    return editObjects(s.floor,s.roomId,items.map(item=>item.id===s.id?{...item,x:position.x,y:Math.max(0,position.y-base),z:position.z}:item));
  };
  const transferObject=(id:string,destinationIndex:number,destinationId:string)=>{
    const success=applyChange(()=>{
      if(!library)throw new Error('Aguarde os objetos carregarem.');
      const source=editableFurniture(config,activeIndex,room,library),item=source.find(o=>o.id===id)!;
      const destination=config.floors[destinationIndex].rooms.find(r=>r.id===destinationId)!;
      const objects=editableFurniture(config,destinationIndex,destination,library);
      const placed=findFurniturePlacement(item.kind,config,destinationIndex,destination,objects,library,item);
      const next=structuredClone(config),target=next.floors[destinationIndex].rooms.find(r=>r.id===destinationId)!;
      next.floors[activeIndex].rooms.find(r=>r.id===room.id)!.objects=source.filter(o=>o.id!==id);
      target.objects=[...objects,placed];target.furnished=true;
      assertFurnitureFits(next,library);setPrevious(structuredClone(config));return next;
    });
    if(success){setSelectedFloor(destinationIndex);setSelection({room:destinationId,object:id});}
  };
  const save=()=>{
    const url=URL.createObjectURL(new Blob([JSON.stringify({version:'4.0',category:'environment',type:'house',units:'cm',config},null,2)],{type:'application/json'}));
    const a=document.createElement('a'); a.href=url; a.download=`${config.name}.json`; a.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  };
  const exportGLB=async()=>{
    if(!library)return;
    setExporting(true); setError(''); const asset=buildHouse(config,{},library);
    try { await exportToGLB(asset,`${config.name}.glb`); }
    catch(e) { setError(`Falha ao exportar: ${e instanceof Error ? e.message : String(e)}`); }
    finally { disposeModel(asset); setExporting(false); }
  };
  return <div className="h-full min-h-0 flex flex-col bg-slate-950 text-slate-100">
    <header className="flex flex-wrap justify-between items-center gap-3 px-5 py-3 border-b border-slate-800">
      <div><h1 className="font-semibold">Casa completa · low-poly</h1><p className="text-xs text-slate-400">Planta modular · Até 2 pavimentos · Medidas em centímetros</p></div>
      <div className="flex flex-wrap gap-2 text-xs">
        <button className="rounded-lg px-3 py-2 bg-violet-600 hover:bg-violet-500" onClick={generate}>🎲 Gerar casa aleatória</button>
        {previous && <button className={buttonClass} onClick={()=>{setConfig(previous);setPrevious(null);setSelectedFloor(0);setDesignRevision(v=>v+1);}}>Desfazer alteração</button>}
        <button className={buttonClass} onClick={()=>file.current?.click()}>Carregar casa</button>
        <button className={buttonClass} onClick={save}>Salvar casa</button>
        <button className="rounded-lg px-3 py-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-50" onClick={exportGLB} disabled={exporting || !library || layoutWarnings.length>0}>{exporting ? 'Exportando…' : 'Exportar casa .GLB'}</button>
      </div>
      <input ref={file} type="file" accept=".json" className="hidden" onChange={async e=>{
        const selected=e.target.files?.[0]; e.target.value=''; if(!selected) return;
        try {
          if(selected.size>2_000_000) throw new Error('O preset deve ter até 2 MB');
          const data=JSON.parse(await selected.text());
          if(data.category!=='environment' || data.units!=='cm') throw new Error('Selecione um preset de ambiente em centímetros');
          const house=data.type==='house' && ['3.0','4.0'].includes(data.version) ? validateHouse(data.config)
            : data.type==='room' && data.version==='2.0' ? roomToHouse(data.config) : null;
          if(!house) throw new Error('Versão ou tipo de preset incompatível');
          assertFurnitureFits(house,library??await loadBedroomLibrary());
          setConfig(house); setSelectedFloor(0); setSelectedRoom('0:0'); setPrevious(null); setError('');
          setDesignRevision(v=>v+1);
        } catch(err) { setError(err instanceof Error ? err.message : 'Arquivo inválido'); }
      }} />
    </header>
    {error && <div role="alert" className="bg-red-950 text-red-200 px-5 py-2 text-sm">{error}</div>}
    {layoutWarnings.length>0 && <div role="status" className="bg-amber-950 text-amber-200 px-5 py-2 text-xs">{layoutWarnings.join(' ')} A exportação fica disponível quando os acessos estiverem conectados; você pode salvar o rascunho.</div>}
    {!library && <div role="status" className="px-5 py-2 text-xs bg-slate-900 text-slate-300">{referenceError ? `Erro na biblioteca Bedroom: ${referenceError}. Recarregue a página para tentar novamente.` : 'Carregando os materiais e as peças originais do Bedroom.glb…'}</div>}
    <div className="flex flex-1 min-h-0">
      <aside className="w-80 shrink-0 overflow-y-auto border-r border-slate-800 p-4 space-y-5">
        <label className="block text-xs text-slate-300">Nome da casa<input className={fieldClass+' mt-1'} maxLength={100} value={config.name} onChange={e=>update({name:e.target.value.replace(/[<>:"/\\|?*]/g,'_') || 'Casa'})} /></label>
        <section className="space-y-3"><h2 className="font-semibold text-sm text-sky-300">Planta da casa</h2>
          <div className="grid grid-cols-2 gap-2"><NumberField label="Colunas" disabled={config.floors.some(f=>f.layout==='free')} unit="" value={config.columns} min={1} max={4} onChange={n=>update({columns:Math.round(n)})} />
            <NumberField label="Linhas" disabled={config.floors.some(f=>f.layout==='free')} unit="" value={config.rows} min={1} max={4} onChange={n=>update({rows:Math.round(n)})} /></div>
          <NumberField label="Largura da casa" value={config.width} min={minimum.width} max={4000} onChange={n=>update({width:n})} />
          <NumberField label="Profundidade da casa" value={config.depth} min={minimum.depth} max={4000} onChange={n=>update({depth:n})} />
          <div className="grid grid-cols-2 gap-2"><NumberField label="Paredes" value={config.wallThickness} min={5} max={40} onChange={n=>update({wallThickness:n})} />
            <NumberField label="Lajes" value={config.slabThickness} min={5} max={40} onChange={n=>update({slabThickness:n})} /></div>
          <p className="text-xs text-slate-500">Colunas e linhas têm tamanhos próprios. As medidas mínimas se ajustam à circulação e à escada.</p>
          <button disabled={config.floors.some(f=>f.layout==='free')} className={buttonClass+' text-xs disabled:opacity-50'} onClick={()=>applyChange(()=>{const next=randomizeRoomSizes(config);validateHouse(next);setPrevious(structuredClone(config));setDesignRevision(v=>v+1);return next;})}>Sortear tamanhos dos cômodos</button>
          {free && <p className="text-xs text-slate-400">Na planta livre, ajuste posições e tamanhos por cômodo. Linhas e colunas ficam como referência; Gerar casa aleatória inicia outra planta.</p>}
          <p className="text-xs text-slate-400">Banheiros têm uma única entrada e nunca são passagem. A circulação entre os demais cômodos é mantida automaticamente.</p>
          <button className={buttonClass+' text-xs'} onClick={()=>applyChange(()=>{
            const next=structuredClone(config);next.floors.forEach((_,i)=>residentialFloor(next,i));
            planCirculation(next,true);setPrevious(structuredClone(config));setDesignRevision(v=>v+1);return next;
          })}>Organizar planta residencial</button>
        </section>
        <section className="space-y-3"><h2 className="font-semibold text-sm text-sky-300">Pavimentos</h2>
          <div className="flex gap-2 text-xs">{([1,2] as const).map(n=><button key={n} aria-pressed={config.floors.length===n} className={config.floors.length===n ? 'rounded-lg bg-sky-600 px-3 py-2' : buttonClass} onClick={()=>applyChange(()=>setFloorCount(config,n))}>{n===1 ? 'Casa térrea' : 'Dois andares'}</button>)}</div>
          <label className="block text-xs text-slate-300">Pavimento em edição<select className={fieldClass+' mt-1'} value={activeIndex} onChange={e=>setSelectedFloor(+e.target.value)}>{config.floors.map((f,i)=><option key={f.id} value={i}>{f.name}</option>)}</select></label>
          <NumberField label="Pé-direito do pavimento" value={floor.height} min={220} max={600} onChange={n=>editFloor({height:n})} />
          {config.floors.length===2 && <><Toggle label="Incluir escada e vão na laje" value={config.stairs.enabled} onChange={v=>update({stairs:{...config.stairs,enabled:v}})} />
            {config.stairs.enabled && <label className="block text-xs text-slate-300">Célula da escada<select className={fieldClass+' mt-1'} value={config.stairs.cellId} onChange={e=>update({stairs:{...config.stairs,cellId:e.target.value}})}>{config.floors[0].rooms.filter(r=>r.id.startsWith('0:')).map(r=><option key={r.id} value={r.id}>Fundo · coluna {+r.id.split(':')[1]+1}</option>)}</select></label>}
            <p className="text-xs text-slate-500">A escada reserva uma célula nos dois pavimentos. Desative-a para exportar andares independentes.</p>
          </>}
        </section>
        <section className="space-y-3"><h2 className="font-semibold text-sm text-sky-300">Cômodo selecionado</h2>
          <p className="text-xs text-slate-400">Escolha uma célula na planta à direita.</p>
          <label className="block text-xs text-slate-300">Nome do cômodo<input className={fieldClass+' mt-1'} maxLength={100} value={room.name} onChange={e=>{
            const name=e.target.value || 'Cômodo',inferred=inferRoomType(name);
            const type=inferred!=='empty' && (room.type==='empty' || inferRoomType(room.name)===room.type) ? inferred : room.type;
            editFloor({rooms:floor.rooms.map(r=>r.id===room.id ? {...r,name,type,finish:type!==r.type ? type==='bathroom'?'tile':'wood' : r.finish} : r)});
          }} /></label>
          {staircase && room.id===config.stairs.cellId && <p className="text-xs text-amber-300">Esta célula contém a escada e a circulação.</p>}
          {!(staircase && room.id===config.stairs.cellId) && <>
            <NumberField label="Largura deste cômodo" value={+dimensions.width.toFixed(1)} min={120} max={free?config.width/2-dimensions.minX:allocation.width} onChange={n=>applyChange(()=>resizeRoom(config,activeIndex,room.id,'width',n))} />
            <NumberField label="Profundidade deste cômodo" value={+dimensions.depth.toFixed(1)} min={120} max={free?config.depth/2-dimensions.minZ:allocation.depth} onChange={n=>applyChange(()=>resizeRoom(config,activeIndex,room.id,'depth',n))} />
            <p className="text-[11px] text-slate-400">Só este cômodo neste pavimento será alterado. O espaço liberado fica livre na grade; os vizinhos não mudam de tamanho.</p>
            {room.size && !free && <button className={buttonClass+' text-xs'} onClick={()=>editFloor({rooms:floor.rooms.map(r=>r.id===room.id?{...r,size:undefined}:r)})}>Ocupar toda a célula novamente</button>}
            <p className="text-[11px] text-slate-400">Arraste este cômodo na planta à direita para reposicionar. No modo livre ele também pode crescer além da antiga célula, sem sobrepor os vizinhos.</p>
            <Toggle label="Encaixar paredes ao mover" value={snapRooms} onChange={setSnapRooms} />
            {!free && <button className={buttonClass+' text-xs'} onClick={()=>applyChange(()=>{const next=enableFreeLayout(config,activeIndex);setPrevious(structuredClone(config));return next;})}>Ativar planta livre</button>}
            {free && <div className="grid grid-cols-2 gap-2">
              <NumberField label="Posição X desde a esquerda" value={+(dimensions.minX+config.width/2).toFixed(1)} min={0} max={config.width-dimensions.width} onChange={n=>move(room.id,n-config.width/2,dimensions.minZ,false)} />
              <NumberField label="Posição Z desde o fundo" value={+(dimensions.minZ+config.depth/2).toFixed(1)} min={0} max={config.depth-dimensions.depth} onChange={n=>move(room.id,dimensions.minX,n-config.depth/2,false)} />
            </div>}
            {room.type==='bathroom' && <button className={buttonClass+' text-xs'} onClick={()=>applyChange(()=>{const next=expandLivingBesideBathroom(config,activeIndex,room.id);setPrevious(structuredClone(config));return next;})}>Encostar banheiro à direita e ampliar sala</button>}
          </>}
          {!free && <details className="text-xs space-y-2"><summary className="cursor-pointer">Dimensões da grade (afetam vizinhos)</summary>
            <NumberField label="Largura da coluna" value={+allocation.width.toFixed(1)} min={staircase && col===+config.stairs.cellId.split(':')[1] ? 400 : 200} max={4000-config.width+allocation.width} onChange={n=>applyChange(()=>resizeRoomAxis(config,room.id,'width',n))} />
            <NumberField label="Profundidade da linha" value={+allocation.depth.toFixed(1)} min={staircase && row===+config.stairs.cellId.split(':')[0] ? stairMinimumDepth(config) : 200} max={4000-config.depth+allocation.depth} onChange={n=>applyChange(()=>resizeRoomAxis(config,room.id,'depth',n))} />
            <p className="text-slate-500">A grade ajusta a mesma coluna/linha nos dois pavimentos. Aumente-a para reservar mais espaço.</p>
          </details>}
          <label className="block text-xs">Tipo de cômodo<select disabled={staircase && room.id===config.stairs.cellId} className={fieldClass+' mt-1'} value={room.type} onChange={e=>{
            const type=e.target.value as RoomType;
            editFloor({rooms:floor.rooms.map(r=>r.id===room.id ? {...r,type,finish:type==='bathroom'?'tile':'wood'} : r)});
          }}>{(['bedroom','bathroom','kitchen','living','office','utility','hall','empty'] as const).map((type,i)=><option key={type} value={type}>{['Quarto','Banheiro','Cozinha','Sala','Escritório','Lavanderia','Corredor / circulação','Vazio'][i]}</option>)}</select></label>
          <Toggle label="Gerar móveis neste cômodo" value={room.furnished} onChange={v=>editFloor({rooms:floor.rooms.map(r=>r.id===room.id?{...r,furnished:v}:r)})} />
          <button className={buttonClass+' text-xs'} onClick={()=>applyChange(()=>{
            const next=structuredClone(config),target=next.floors[activeIndex].rooms.find(r=>r.id===room.id)!;
            target.objects=undefined;target.furnitureSeed=Math.floor(Math.random()*1_000_000);target.furnished=true;
            setPrevious(structuredClone(config));return next;
          })}>{room.objects!==undefined?'Regenerar móveis (substituir edição)':'Reorganizar móveis'}</button>
          {report && <p className="text-xs text-slate-400">{report.placed.length} conjunto(s) de móveis.{report.omitted.length>0 && <span className="text-amber-300"> {report.omitted.map(name=>name.replace(/_/g,' ')).join(', ')} não coube(ram) sem bloquear circulação; aumente o cômodo ou reorganize.</span>}</p>}
          <label className="block text-xs">Revestimento do piso<select className={fieldClass+' mt-1'} value={room.finish} onChange={e=>editFloor({rooms:floor.rooms.map(r=>r.id===room.id?{...r,finish:e.target.value as typeof room.finish}:r)})}><option value="wood">Tábuas originais Bedroom</option><option value="tile">Cerâmica low-poly</option><option value="plain">Cor lisa</option></select></label>
          {room.finish==='plain' && <label className="flex items-center justify-between text-xs">Cor do piso deste cômodo<input aria-label="Cor do piso do cômodo" type="color" value={room.floorColor} onChange={e=>editFloor({rooms:floor.rooms.map(r=>r.id===room.id ? {...r,floorColor:e.target.value} : r)})} /></label>}
          {boundaries.map(({side,key,wall,exterior,adjacent:adjacentId,length})=>{
            const adjacentRoom=floor.rooms.find(r=>r.id===adjacentId);
            const corridorPartition=!!adjacentRoom && ((room.type==='hall') !== (adjacentRoom.type==='hall'));
            const maxWidth=length-30;
            const change=(patch:Partial<HouseWall>)=>editWall(side,patch,key);
            return <details key={`${activeIndex}:${room.id}:${key}`} className="rounded-lg bg-slate-900 border border-slate-800 p-3">
              <summary className="cursor-pointer text-xs font-medium">{sideNames[side]} · {exterior ? 'externa' : 'compartilhada'}{free && adjacentRoom?` · ${adjacentRoom.name}`:''}</summary>
              <div className="space-y-3 pt-3">
                <label className="block text-xs">Abertura na parede {sideNames[side].toLowerCase()}<select className={fieldClass+' mt-1'} value={wall.kind} onChange={e=>{
                  const kind=e.target.value as OpeningKind;
                  change({kind,...(kind==='door' ? {width:90,height:Math.min(210,floor.height-20),open:true} : kind==='window' ? {width:130,height:Math.min(110,floor.height-40),sill:100} : {})});
                }}><option value="solid">Parede fechada</option><option value="door">Porta</option><option value="window">Janela</option><option value="passage" disabled={corridorPartition}>Passagem livre</option></select></label>
                {corridorPartition && <p className="text-[11px] text-slate-400">A divisão entre cômodo e corredor mantém parede e acesso por porta.</p>}
                {(wall.kind==='door' || wall.kind==='window') && <>
                  <NumberField label={`Largura da abertura ${sideNames[side].toLowerCase()}`} value={wall.width} min={wall.kind==='door' ? 60 : 40} max={maxWidth} onChange={n=>change({width:n})} />
                  <NumberField label={`Altura da abertura ${sideNames[side].toLowerCase()}`} value={wall.height} min={wall.kind==='door' ? 180 : 40} max={floor.height-(wall.kind==='window' ? 40 : 20)} onChange={n=>change({height:n})} />
                  {wall.kind==='window' ? <NumberField label={`Peitoril ${sideNames[side].toLowerCase()}`} value={wall.sill} min={20} max={floor.height-wall.height-10} onChange={n=>change({sill:n})} />
                    : <Toggle label={`Porta aberta ${sideNames[side].toLowerCase()}`} value={wall.open} onChange={v=>change({open:v})} />}
                </>}
                {!exterior && <p className="text-[11px] text-slate-400">Esta alteração também aparece no cômodo vizinho.</p>}
              </div>
            </details>;
          })}
        </section>
        <section className="space-y-3"><h2 className="font-semibold text-sm text-sky-300">Cobertura</h2>
          <label className="block text-xs">Tipo de telhado<select className={fieldClass+' mt-1'} value={config.roof.type} onChange={e=>update({roof:{...config.roof,type:e.target.value as HouseConfig['roof']['type']}})}><option value="gable">Duas águas</option><option value="flat">Plano</option><option value="none">Sem cobertura</option></select></label>
          {config.roof.type==='gable' && <NumberField label="Altura do telhado" value={config.roof.height} min={40} max={300} onChange={n=>update({roof:{...config.roof,height:n}})} />}
          {config.roof.type!=='none' && <><NumberField label="Beiral" value={config.roof.overhang} min={0} max={100} onChange={n=>update({roof:{...config.roof,overhang:n}})} />
            <label className="flex justify-between text-xs">Cor do telhado<input aria-label="Cor do telhado" type="color" value={config.roof.color} onChange={e=>update({roof:{...config.roof,color:e.target.value}})} /></label></>}
        </section>
        {library && !(staircase && room.id===config.stairs.cellId) && <FurnitureEditor config={config} index={activeIndex} room={room} library={library} selected={selectedObject}
          onSelect={object=>setSelection({room:room.id,object})} onChange={objects=>editObjects(activeIndex,room.id,objects)} onError={setError} onTransfer={transferObject}/>}
        <section className="space-y-3"><h2 className="font-semibold text-sm text-sky-300">Portas para Unreal</h2>
          <Toggle label="Incluir folhas das portas" value={config.doorLeaves!==false} onChange={doorLeaves=>update({doorLeaves})}/>
          <p className="text-xs text-slate-400">Desative para deixar os vãos e batentes sem folhas nem maçanetas. Vale para a prévia e o GLB; instale suas portas interativas na Unreal. Não remove paredes ou acessos.</p>
        </section>
        <section className="space-y-3"><h2 className="font-semibold text-sm text-sky-300">Materiais da casa</h2>
          <label className="block text-xs">Estilo de materiais<select className={fieldClass+' mt-1'} value={config.style} onChange={e=>update({style:e.target.value as HouseConfig['style']})}><option value="bedroom">Bedroom original</option><option value="custom">Cores personalizadas</option></select></label>
          <p className="text-xs text-slate-500">Bedroom reutiliza os materiais PBR, rodapés, portas, molduras, tomadas e interruptores do modelo enviado.</p>
          <Toggle label="Rodapés, portas detalhadas e tomadas" value={config.details} onChange={v=>update({details:v})} />
          <button className={buttonClass+' text-xs'} onClick={()=>update({style:'bedroom',details:true,colors:structuredClone(bedroomColors)})}>Aplicar aparência Bedroom</button>
          <button className={buttonClass+' text-xs'} onClick={()=>update({floors:config.floors.map(f=>({...f,rooms:f.rooms.map(r=>({...r,furnished:true}))}))})}>Mobiliar todos os cômodos</button>
          {config.style==='custom' && (['wall','ceiling','trim','door','glass'] as const).map((key,i)=><label key={key} className="flex items-center justify-between text-xs">{['Paredes','Lajes e teto','Molduras','Portas','Vidros'][i]}<input aria-label={`Cor da casa ${key}`} type="color" value={config.colors[key]} onChange={e=>update({colors:{...config.colors,[key]:e.target.value}})} /></label>)}
        </section>
      </aside>
      <div className="flex-1 min-w-0 relative">
        <AssetViewport model={model} focusKey={`${focusSelected ? `${activeIndex}/${room.id}` : isolate ? `floor-${activeIndex}` : 'house'}:${designRevision}`}
          selectedFurniture={selectedObject?{id:selectedObject,roomId:room.id,floor:activeIndex}:undefined} onSelectFurniture={selectObject} onMoveFurniture={moveObject}
          focusBounds={focusSelected ? {...selectedBounds,minY:floorY,maxY:floorY+floor.height} : undefined} />
        <div className="absolute top-4 left-4 rounded-xl bg-slate-950/90 border border-slate-700 p-3 space-y-2 max-w-64">
          <Toggle label="Vista em corte" value={cutaway} onChange={setCutaway} />
          <Toggle label="Isolar pavimento em edição" value={isolate} onChange={v=>{setIsolate(v);if(!v)setFocusSelected(false);}} />
          <Toggle label="Focar cômodo selecionado" value={focusSelected} onChange={v=>{setFocusSelected(v);if(v){setIsolate(true);setCutaway(true);}}} />
          {!cutaway && <Toggle label="Mostrar cobertura" value={showRoof} onChange={setShowRoof} />}
          <p className="text-[11px] text-slate-400">A exportação inclui todos os pavimentos e a cobertura configurada.</p>
        </div>
        <div className="absolute top-20 right-4 w-64 rounded-xl bg-slate-950/95 border border-slate-700 p-3 space-y-2">
          <h2 className="text-xs font-semibold">Planta · {floor.name}</h2>
          <p className="text-[10px] text-center text-slate-500">FUNDO</p>
          <HousePlan config={config} index={activeIndex} selected={room.id} onSelect={setSelectedRoom} onMove={move} />
          <p className="text-[10px] text-center text-slate-500">FRENTE / ENTRADA</p>
          <p className="text-[10px] text-slate-400">Arraste para mover · Setas: 10 cm · Área escura: espaço livre. {free?'Planta livre ativa.':''}</p>
          <div className="flex gap-1">{config.floors.map((f,i)=><button key={f.id} className={`flex-1 rounded px-2 py-1 text-[11px] ${i===activeIndex ? 'bg-sky-600' : 'bg-slate-800'}`} onClick={()=>setSelectedFloor(i)}>{f.name}</button>)}</div>
        </div>
        <div className="absolute bottom-4 left-4 rounded-lg bg-slate-950/90 p-3 text-xs text-slate-300">
          {config.floors.length} pavimento(s) · {config.rows*config.columns} células por andar · {(config.floors.reduce((sum,f,i)=>sum+f.rooms.reduce((area,r)=>{const b=roomBounds(config,i,r.id);return area+b.width*b.depth;},0),0)/10000).toFixed(1)} m² de cômodos
          <p className="text-[11px] text-slate-500 mt-1">Arraste para orbitar · Scroll para zoom · Botão direito para deslocar</p>
        </div>
      </div>
    </div>
  </div>;
}
