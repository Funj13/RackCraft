import {useMemo,useRef,useState} from 'react';
import {HouseConfig,HouseRoom,roomBounds} from '../types/house';
import {FurnitureInstance,FurnitureKind,furnitureKinds,furnitureLabel} from '../types/furniture';
import {BedroomLibrary} from '../generator/BedroomLibrary';
import {editableFurniture,findFurniturePlacement,furnitureBounds,overlaps,roomCirculation} from '../generator/FurnitureBuilder';
import {NumberField,fieldClass} from './EditorFields';

export function FurnitureEditor({config,index,room,library,selected,onSelect,onChange,onError,onTransfer}:{config:HouseConfig;index:number;room:HouseRoom;library:BedroomLibrary;selected?:string;onSelect:(id?:string)=>void;onChange:(objects:FurnitureInstance[])=>boolean;onError:(message:string)=>void;onTransfer:(id:string,index:number,roomId:string)=>void}){
  const [kind,setKind]=useState<FurnitureKind>('Mesa');
  const [ghost,setGhost]=useState<{id:string;x:number;z:number}>();
  const drag=useRef<{id:string;px:number;py:number;x:number;z:number;w:number;h:number;moved:boolean}|undefined>(undefined);
  const items=useMemo(()=>editableFurniture(config,index,room,library),[config,index,room,library]);
  const item=items.find(o=>o.id===selected),size=roomBounds(config,index,room.id);
  const footprints=useMemo(()=>items.map(o=>furnitureBounds(o,library)),[items,library]);
  const routes=roomCirculation(config,index,room.id);
  const warnings=items.some((o,i)=>{const b=footprints[i],box={minX:b.min.x,maxX:b.max.x,minZ:b.min.z,maxZ:b.max.z};return routes.some(r=>overlaps(box,r))||footprints.slice(i+1).some(other=>overlaps(box,{minX:other.min.x,maxX:other.max.x,minZ:other.min.z,maxZ:other.max.z}));});
  const edit=(id:string,patch:Partial<FurnitureInstance>)=>onChange(items.map(o=>o.id===id?{...o,...patch}:o));
  const button='rounded bg-slate-800 px-3 py-2 text-xs hover:bg-slate-700 disabled:opacity-40';
  return <section className="space-y-3 border-t border-slate-700 pt-4">
    <h2 className="text-sm font-semibold text-sky-300">Objetos do cenário</h2>
    <p className="text-xs text-slate-400">Selecione na lista, na planta abaixo ou clicando no móvel em 3D. Arraste o gizmo 3D ou a peça nesta planta para mover.</p>
    <label className="block text-xs">Catálogo de objetos<select className={fieldClass+' mt-1'} value={kind} onChange={e=>setKind(e.target.value as FurnitureKind)}>{furnitureKinds.map(k=><option key={k} value={k}>{furnitureLabel(k)}</option>)}</select></label>
    <button className={button} onClick={()=>{
      try{const added=findFurniturePlacement(kind,config,index,room,items,library);if(onChange([...items,added]))onSelect(added.id);}
      catch(e){onError(e instanceof Error?e.message:String(e));}
    }}>Adicionar objeto</button>
    <label className="block text-xs">Objetos neste cômodo<select size={Math.min(5,Math.max(2,items.length))} className={fieldClass+' mt-1'} value={item?.id??''} onChange={e=>onSelect(e.target.value || undefined)}>
      <option value="">Nenhum selecionado</option>{items.map((o,i)=><option key={o.id} value={o.id}>{i+1}. {furnitureLabel(o.kind)}</option>)}
    </select></label>
    {!room.furnished && <p className="text-xs text-amber-300">A mobília deste cômodo está oculta. Adicionar ou editar uma peça volta a exibi-la.</p>}
    <div className="relative rounded bg-slate-800 overflow-hidden" aria-label="Planta dos objetos do cômodo" style={{height:Math.min(230,270*size.depth/size.width),touchAction:'none'}}>
      {items.map((o,i)=>{
        const b=footprints[i],g=ghost?.id===o.id?ghost:undefined,dx=g?g.x-o.x:0,dz=g?g.z-o.z:0;
        return <button key={o.id} title={furnitureLabel(o.kind)} aria-label={`Mover objeto ${i+1}: ${furnitureLabel(o.kind)}`} aria-pressed={selected===o.id}
          className={`absolute text-[9px] rounded border cursor-grab select-none ${selected===o.id?'bg-sky-600 border-sky-200 z-10':'bg-slate-500 border-slate-300'}`}
          style={{left:`${(b.min.x+dx+size.width/2)/size.width*100}%`,top:`${(b.min.z+dz+size.depth/2)/size.depth*100}%`,width:`${(b.max.x-b.min.x)/size.width*100}%`,height:`${(b.max.z-b.min.z)/size.depth*100}%`}}
          onClick={()=>onSelect(o.id)}
          onPointerDown={e=>{onSelect(o.id);if(e.button!==0)return;const rect=e.currentTarget.parentElement!.getBoundingClientRect();drag.current={id:o.id,px:e.clientX,py:e.clientY,x:o.x,z:o.z,w:rect.width,h:rect.height,moved:false};e.currentTarget.setPointerCapture(e.pointerId);}}
          onPointerMove={e=>{const start=drag.current;if(!start || start.id!==o.id)return;if(Math.hypot(e.clientX-start.px,e.clientY-start.py)<3 && !start.moved)return;start.moved=true;setGhost({id:o.id,x:Math.round(start.x+(e.clientX-start.px)/start.w*size.width),z:Math.round(start.z+(e.clientY-start.py)/start.h*size.depth)});}}
          onPointerUp={e=>{if(drag.current?.moved && ghost?.id===o.id)edit(o.id,{x:ghost.x,z:ghost.z});drag.current=undefined;setGhost(undefined);if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);}}
          onPointerCancel={()=>{drag.current=undefined;setGhost(undefined);}}
          onKeyDown={e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();const step=e.shiftKey?1:10;edit(o.id,{x:o.x+(e.key==='ArrowRight'?step:e.key==='ArrowLeft'?-step:0),z:o.z+(e.key==='ArrowDown'?step:e.key==='ArrowUp'?-step:0)});}}>{i+1}</button>;
      })}
    </div>
    <p className="text-[11px] text-slate-400">Planta de objetos · setas: 10 cm · X/Z medidos a partir do centro do cômodo.</p>
    {warnings && <p className="text-xs text-amber-300">Há peças sobrepostas ou sobre a área de circulação. A edição manual permite isso; confira os acessos antes de exportar.</p>}
    {item && <>
      <p className="text-xs font-medium">Selecionado: {furnitureLabel(item.kind)}</p>
      <div className="grid grid-cols-2 gap-2">
        <NumberField label="Objeto posição X" value={+item.x.toFixed(1)} min={-size.width/2} max={size.width/2} onChange={x=>edit(item.id,{x})}/>
        <NumberField label="Objeto posição Z" value={+item.z.toFixed(1)} min={-size.depth/2} max={size.depth/2} onChange={z=>edit(item.id,{z})}/>
        <NumberField label="Objeto altura do piso" value={+item.y.toFixed(1)} min={0} max={config.floors[index].height} onChange={y=>edit(item.id,{y})}/>
        <NumberField label="Objeto rotação" value={+item.rotation.toFixed(1)} min={-360} max={360} unit="°" onChange={rotation=>edit(item.id,{rotation})}/>
        <NumberField label="Objeto escala" value={item.scale} min={0.1} max={3} unit="×" onChange={scale=>edit(item.id,{scale})}/>
      </div>
      <label className="block text-xs">Transferir objeto para outro cômodo<select className={fieldClass+' mt-1'} value="" onChange={e=>{if(!e.target.value)return;const [floor,...id]=e.target.value.split('/');onTransfer(item.id,+floor,id.join('/'));}}>
        <option value="">Escolher destino…</option>{config.floors.flatMap((floor,i)=>floor.rooms.filter(r=>!(i===index && r.id===room.id) && !(config.floors.length===2 && config.stairs.enabled && r.id===config.stairs.cellId)).map(r=><option key={`${i}/${r.id}`} value={`${i}/${r.id}`}>{floor.name} · {r.name}</option>))}
      </select></label>
      <button className="rounded bg-red-950 hover:bg-red-900 text-red-200 px-3 py-2 text-xs" onClick={()=>{if(onChange(items.filter(o=>o.id!==item.id)))onSelect(undefined);}}>Remover objeto selecionado</button>
    </>}
    {items.length>0 && <button className={button} onClick={()=>{if(onChange([]))onSelect(undefined);}}>Remover todos os objetos deste cômodo</button>}
    <p className="text-[11px] text-slate-500">A primeira edição fixa os móveis gerados. Remoções e posições ficam salvas no JSON e no GLB. Desfazer alteração recupera a última edição.</p>
  </section>;
}
