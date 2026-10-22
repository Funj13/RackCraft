import {useRef,useState} from 'react';
import {HouseConfig,roomBounds} from '../types/house';

export function HousePlan({config,index,selected,onSelect,onMove}:{config:HouseConfig;index:number;selected:string;onSelect:(id:string)=>void;onMove:(id:string,x:number,z:number,snap?:boolean)=>void}){
  const [ghost,setGhost]=useState<{id:string;x:number;z:number}>();
  const drag=useRef<{id:string;px:number;py:number;x:number;z:number;width:number;height:number;moved:boolean}|undefined>(undefined);
  return <div aria-label="Planta interativa: arraste os cômodos para mover" className="relative w-full rounded bg-slate-800/70 overflow-hidden" style={{height:Math.min(300,230*config.depth/config.width),touchAction:'none'}}>
    {config.floors[index].rooms.map(room=>{
      const b=roomBounds(config,index,room.id),x=ghost?.id===room.id?ghost.x:b.minX,z=ghost?.id===room.id?ghost.z:b.minZ;
      const stair=config.floors.length===2 && config.stairs.enabled && room.id===config.stairs.cellId;
      const collides=config.floors[index].rooms.some(other=>{if(other.id===room.id)return false;const a=roomBounds(config,index,other.id),t=config.wallThickness-0.01;return x<a.maxX+t && x+b.width+t>a.minX && z<a.maxZ+t && z+b.depth+t>a.minZ;});
      return <button key={`${index}/${room.id}`} aria-label={`Selecionar ${stair?'Escada':room.name}, célula ${room.id}`} aria-pressed={selected===room.id}
        title={`${room.name} · ${Math.round(b.width)} × ${Math.round(b.depth)} cm${stair?'':' · Arraste para mover; setas para ajuste de 10 cm'}`}
        className={`absolute p-1 text-[10px] text-slate-950 select-none rounded-sm ${stair?'cursor-default':'cursor-grab active:cursor-grabbing'} ${selected===room.id?'ring-2 ring-inset ring-sky-400':'opacity-80'} ${ghost?.id===room.id?'z-10 shadow-lg':''}`}
        style={{left:`${(x+config.width/2)/config.width*100}%`,top:`${(z+config.depth/2)/config.depth*100}%`,width:`${b.width/config.width*100}%`,height:`${b.depth/config.depth*100}%`,backgroundColor:ghost?.id===room.id && collides?'#ef8b8b':room.finish==='tile'?'#b4b4b4':room.floorColor}}
        onClick={()=>onSelect(room.id)}
        onPointerDown={e=>{
          onSelect(room.id);if(stair || e.button!==0)return;
          const rect=e.currentTarget.parentElement!.getBoundingClientRect();
          drag.current={id:room.id,px:e.clientX,py:e.clientY,x:b.minX,z:b.minZ,width:rect.width,height:rect.height,moved:false};
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={e=>{
          const start=drag.current;if(!start || start.id!==room.id)return;
          if(Math.hypot(e.clientX-start.px,e.clientY-start.py)<3 && !start.moved)return;
          start.moved=true;
          setGhost({id:room.id,x:Math.max(-config.width/2,Math.min(config.width/2-b.width,start.x+(e.clientX-start.px)/start.width*config.width)),z:Math.max(-config.depth/2,Math.min(config.depth/2-b.depth,start.z+(e.clientY-start.py)/start.height*config.depth))});
        }}
        onPointerUp={e=>{
          const start=drag.current;
          if(start?.moved && ghost?.id===room.id)onMove(room.id,ghost.x,ghost.z);
          drag.current=undefined;setGhost(undefined);if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);
        }}
        onPointerCancel={()=>{drag.current=undefined;setGhost(undefined);}}
        onKeyDown={e=>{
          if(stair || !['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;
          e.preventDefault();const step=e.shiftKey?1:10;
          onMove(room.id,b.minX+(e.key==='ArrowLeft'?-step:e.key==='ArrowRight'?step:0),b.minZ+(e.key==='ArrowUp'?-step:e.key==='ArrowDown'?step:0),false);
        }}>
        {stair?'↗ Escada':room.name}<span className="block text-[9px] mt-1">{Math.round(b.width)} × {Math.round(b.depth)}</span>
      </button>;
    })}
  </div>;
}
