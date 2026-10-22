import {HouseConfig,HouseSide,HouseWall,roomBounds,roomWallKey,isExteriorWall} from './house';

export interface FreeWallSegment {key:string;axis:'h'|'v';line:number;start:number;end:number;opening:number;config:HouseWall;rooms:string[];sides:Record<string,HouseSide>}
const solid=(height:number):HouseWall=>({kind:'solid',width:90,height:Math.min(210,height-20),sill:20,open:false});
export function freeWallSegments(c:HouseConfig,index:number):FreeWallSegment[]{
  const floor=c.floors[index],t=c.wallThickness;
  const faces:{axis:'h'|'v';line:number;start:number;end:number;id:string;side:HouseSide}[]=[];
  for(const room of floor.rooms){
    const b=roomBounds(c,index,room.id);
    for(const side of ['back','front','left','right'] as HouseSide[]){
      const axis=side==='back'||side==='front'?'h':'v';
      faces.push({axis,line:side==='back'?b.minZ-t/2:side==='front'?b.maxZ+t/2:side==='left'?b.minX-t/2:b.maxX+t/2,
        start:(axis==='h'?b.minX:b.minZ)-t/2,end:(axis==='h'?b.maxX:b.maxZ)+t/2,id:room.id,side});
    }
  }
  const result:FreeWallSegment[]=[],groups=new Map<string,typeof faces>();
  for(const face of faces){const key=`${face.axis}:${face.line.toFixed(3)}`;groups.set(key,[...(groups.get(key)??[]),face]);}
  const counts=new Map<string,number>();
  for(const group of groups.values()){
    const points=[...new Set(group.flatMap(f=>[f.start,f.end]))].sort((a,b)=>a-b);
    for(let i=0;i<points.length-1;i++){
      const start=points[i],end=points[i+1],middle=(start+end)/2;
      const active=group.filter(f=>middle>f.start && middle<f.end).sort((a,b)=>a.id.localeCompare(b.id));
      if(!active.length)continue;
      const signature=active.map(f=>`${f.id}/${f.side}`).join('|');
      const previous=result[result.length-1];
      if(previous && previous.axis===active[0].axis && Math.abs(previous.line-active[0].line)<0.001 && previous.end===start
        && Object.entries(previous.sides).map(([id,side])=>`${id}/${side}`).join('|')===signature){previous.end=end;previous.opening=(previous.start+end)/2;continue;}
      const occurrence=counts.get(signature)??0;counts.set(signature,occurrence+1);
      const key=`free:${signature}:${occurrence}`,first=active[0],[r,col]=first.id.split(':').map(Number);
      const legacyKey=roomWallKey(r,col,first.side),legacy=floor.walls[legacyKey];
      const shared=active.length===2 && active[0].side!==active[1].side;
      const sameLegacy=shared && active.every(f=>{const [row,column]=f.id.split(':').map(Number);return roomWallKey(row,column,f.side)===legacyKey;});
      const inherited=(!shared && isExteriorWall(c,legacyKey)) || sameLegacy ? legacy : undefined;
      result.push({key,axis:first.axis,line:first.line,start,end,opening:middle,rooms:active.map(f=>f.id),sides:Object.fromEntries(active.map(f=>[f.id,f.side])),
        config:{...(floor.freeWalls?.[key]??inherited??solid(floor.height))}});
    }
  }
  for(const s of result){s.config.width=Math.max(40,Math.min(s.config.width,s.end-s.start-30));if(s.end-s.start<80)s.config.kind='solid';}
  return result;
}
const opening=(w:HouseWall)=>w.kind==='door'||w.kind==='passage';
const priority=(type:string)=>type==='hall'?0:type==='living'?1:type==='kitchen'?2:5;
/** Rebuild doors from actual touching rectangles, not cell IDs. Disconnected draft positions are allowed. */
export function planFreeFloor(c:HouseConfig,index:number){
  const floor=c.floors[index];
  if(c.floors.length===2 && c.stairs.enabled){const stair=floor.rooms.find(r=>r.id===c.stairs.cellId)!;stair.type='hall';stair.name='Escada';}
  const rooms=new Map(floor.rooms.map(r=>[r.id,r]));
  const segments=freeWallSegments(c,index),edges=segments.filter(s=>s.rooms.length===2 && s.end-s.start>=120);
  for(const s of segments){
    s.config.height=Math.min(s.config.height,floor.height-(s.config.kind==='window'?40:20));
    s.config.sill=Math.max(20,Math.min(s.config.sill,floor.height-s.config.height-10));
    const bathroom=s.rooms.some(id=>rooms.get(id)!.type==='bathroom');
    if(s.rooms.length>1 && !edges.includes(s))s.config.kind='solid';
    if(s.rooms.length===1 && bathroom && opening(s.config))s.config.kind='solid';
    if(s.rooms.length>1 && s.config.kind==='window')s.config.kind='solid';
    if(s.config.kind==='passage' && s.rooms.some(id=>rooms.get(id)!.type!=='hall'))s.config.kind='door';
  }
  const ordinary=floor.rooms.filter(r=>r.type!=='bathroom'),parent=new Map(ordinary.map(r=>[r.id,r.id]));
  const find=(id:string):string=>parent.get(id)===id?id:find(parent.get(id)!);
  const join=(a:string,b:string)=>parent.set(find(a),find(b));
  const door=(s:FreeWallSegment)=>{const existing=s.config.kind==='door';s.config={...s.config,kind:'door',width:Math.min(existing?s.config.width:90,s.end-s.start-30),height:Math.min(existing?s.config.height:210,floor.height-20),sill:20,open:existing?s.config.open:false};};
  const publicEdges=edges.filter(s=>s.rooms.every(id=>rooms.get(id)!.type!=='bathroom'));
  publicEdges.forEach(s=>{if(opening(s.config))join(s.rooms[0],s.rooms[1]);});
  publicEdges.sort((a,b)=>a.rooms.reduce((sum,id)=>sum+priority(rooms.get(id)!.type),0)-b.rooms.reduce((sum,id)=>sum+priority(rooms.get(id)!.type),0));
  for(const s of publicEdges)if(find(s.rooms[0])!==find(s.rooms[1])){
    if(s.rooms.every(id=>rooms.get(id)!.type==='hall'))s.config.kind='passage';else door(s);
    join(s.rooms[0],s.rooms[1]);
  }
  for(const room of floor.rooms.filter(r=>r.type==='bathroom')){
    const candidates=edges.filter(s=>s.rooms.includes(room.id) && s.rooms.some(id=>rooms.get(id)!.type!=='bathroom'));
    candidates.sort((a,b)=>(opening(a.config)?-100:0)+priority(rooms.get(a.rooms.find(id=>id!==room.id)!)!.type)-((opening(b.config)?-100:0)+priority(rooms.get(b.rooms.find(id=>id!==room.id)!)!.type)));
    for(const s of segments.filter(s=>s!==candidates[0] && s.rooms.includes(room.id) && opening(s.config)))s.config.kind='solid';
    if(candidates[0])door(candidates[0]);
  }
  if(index===0 && !segments.some(s=>s.rooms.length===1 && s.config.kind==='door')){
    const candidates=segments.filter(s=>s.rooms.length===1 && rooms.get(s.rooms[0])!.type!=='bathroom' && s.end-s.start>=120);
    candidates.sort((a,b)=>priority(rooms.get(a.rooms[0])!.type)+(Object.values(a.sides)[0]==='front'?0:10)-priority(rooms.get(b.rooms[0])!.type)-(Object.values(b.sides)[0]==='front'?0:10));
    if(candidates[0])door(candidates[0]);
  }
  floor.freeWalls=Object.fromEntries(segments.map(s=>[s.key,s.config]));
}
export function freeLayoutWarnings(c:HouseConfig,index:number){
  const floor=c.floors[index];if(floor.layout!=='free')return [];
  const segments=freeWallSegments(c,index),ordinary=floor.rooms.filter(r=>r.type!=='bathroom');
  const seen=new Set(ordinary.slice(0,1).map(r=>r.id));
  for(let pass=0;pass<ordinary.length;pass++)for(const s of segments.filter(s=>s.rooms.length===2 && opening(s.config) && s.rooms.every(id=>ordinary.some(r=>r.id===id)))){
    if(s.rooms.some(id=>seen.has(id)))s.rooms.forEach(id=>seen.add(id));
  }
  const warnings:string[]=[];
  if(seen.size<ordinary.length)warnings.push('Há ambientes sem ligação à circulação. Encoste as paredes para criar os acessos.');
  for(const room of floor.rooms.filter(r=>r.type==='bathroom'))if(!segments.some(s=>s.rooms.length===2 && s.rooms.includes(room.id) && opening(s.config)))warnings.push(`${room.name} está sem acesso. Encoste-o em sala, corredor ou quarto.`);
  return warnings;
}
export function enableFreeLayout(c:HouseConfig,index:number){
  const next=structuredClone(c),floor=next.floors[index];
  if(floor.layout==='free')return next;
  const bounds=floor.rooms.map(r=>roomBounds(c,index,r.id));
  floor.rooms.forEach((r,i)=>{const b=bounds[i];r.position={x:b.minX,z:b.minZ};r.size={width:b.width,depth:b.depth};});
  floor.layout='free';planFreeFloor(next,index);return next;
}
