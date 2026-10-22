import { useState } from 'react';
import { HouseEditor } from './HouseEditor';
import { RoomEditor } from './RoomEditor';

export function EnvironmentEditor() {
  const [mode,setMode]=useState<'house'|'room'>('house');
  const [roomOpened,setRoomOpened]=useState(false);
  return <div className="h-full min-h-0 flex flex-col">
    <nav aria-label="Tipos de ambiente" className="flex gap-2 px-4 py-2 bg-slate-950 border-b border-slate-800 text-xs shrink-0">
      <button aria-pressed={mode==='house'} className={`rounded-lg px-3 py-1.5 ${mode==='house' ? 'bg-sky-600' : 'bg-slate-800'}`} onClick={()=>setMode('house')}>Casa completa</button>
      <button aria-pressed={mode==='room'} className={`rounded-lg px-3 py-1.5 ${mode==='room' ? 'bg-sky-600' : 'bg-slate-800'}`} onClick={()=>{setRoomOpened(true);setMode('room');}}>Quarto individual</button>
    </nav>
    <div className="flex-1 min-h-0" hidden={mode!=='house'}><HouseEditor /></div>
    <div className="flex-1 min-h-0" hidden={mode!=='room'}>{roomOpened && <RoomEditor />}</div>
  </div>;
}
