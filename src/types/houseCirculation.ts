import type { HouseConfig, HouseRoom, HouseSide, HouseWall, RoomType } from './house';
import {planFreeFloor,freeWallSegments} from './houseFreeLayout';

export function cellWallKey(row:number,col:number,side:HouseSide) {
  if(side==='left')return `v:${row}:${col}`;
  if(side==='right')return `v:${row}:${col+1}`;
  return `h:${side==='back'?row:row+1}:${col}`;
}
const sides:HouseSide[]=['back','front','left','right'];
export function roomEdges(id:string) {
  const [r,col]=id.split(':').map(Number);
  return sides.map(side=>({side,key:cellWallKey(r,col,side)}));
}
export function neighbour(c:HouseConfig,id:string,side:HouseSide) {
  const [r,col]=id.split(':').map(Number), dr=side==='back'?-1:side==='front'?1:0, dc=side==='left'?-1:side==='right'?1:0;
  const nr=r+dr,nc=col+dc;
  return nr>=0 && nr<c.rows && nc>=0 && nc<c.columns ? `${nr}:${nc}` : undefined;
}
export const isOpening=(wall:HouseWall)=>wall.kind==='door' || wall.kind==='passage';
const priority=(room:HouseRoom)=>room.type==='hall'?0:room.type==='living'?1:room.type==='kitchen'?2:room.type==='office'?5:room.type==='bedroom'?7:6;
const hash=(value:string)=>{let h=2166136261;for(const ch of value)h=Math.imul(h^ch.charCodeAt(0),16777619);return h>>>0;};

/** Assign public circulation and peripheral private rooms for newly generated residential layouts. */
export function residentialFloor(c:HouseConfig,index:number) {
  const floor=c.floors[index];
  const names:Record<RoomType,string>={bedroom:'Quarto',bathroom:'Banheiro',kitchen:'Cozinha',living:'Sala',office:'Escritório',utility:'Lavanderia',hall:'Corredor',empty:'Cômodo'};
  const counts:Partial<Record<RoomType,number>>={};
  for(const room of floor.rooms) {
    const [r,col]=room.id.split(':').map(Number);
    const stair=c.floors.length===2 && c.stairs.enabled && room.id===c.stairs.cellId;
    let type:RoomType='bedroom';
    if(stair || (c.columns>=3 && col>0 && col<c.columns-1))type='hall';
    else if(c.columns===1)type=r===c.rows-1?'living':r===0?'bathroom':'hall';
    else if(col===c.columns-1 && r===c.rows-1)type='bathroom';
    else if(col===0 && index===0)type=r===c.rows-1?'living':r===0?'kitchen':'hall';
    else if(col===0 && index>0 && c.columns===2 && r<c.rows-1)type='hall';
    counts[type]=(counts[type]??0)+1;
    room.type=type;room.name=stair?'Escada':`${names[type]} ${counts[type]}`;
    room.finish=type==='bathroom'?'tile':'wood';
  }
}

/** One bathroom entrance, and a connected route through non-bathroom rooms. No route relies on a bathroom. */
export function planCirculation(c:HouseConfig,reset=false,onlyFloor?:number) {
  c.floors.forEach((floor,index)=>{
    if(onlyFloor!==undefined && index!==onlyFloor)return;
    if(floor.layout==='free'){planFreeFloor(c,index);return;}
    if(c.floors.length===2 && c.stairs.enabled) {
      const stair=floor.rooms.find(r=>r.id===c.stairs.cellId)!;stair.type='hall';stair.name='Escada';
    }
    const rooms=new Map(floor.rooms.map(r=>[r.id,r]));
    const bath=floor.rooms.filter(r=>r.type==='bathroom');
    const ordinary=floor.rooms.filter(r=>r.type!=='bathroom');
    const edges:{a:HouseRoom;b:HouseRoom;key:string}[]=[];
    for(const room of ordinary)for(const side of ['front','right'] as const) {
      const id=neighbour(c,room.id,side),other=id?rooms.get(id):undefined;
      if(other && other.type!=='bathroom')edges.push({a:room,b:other,key:roomEdges(room.id).find(e=>e.side===side)!.key});
    }
    const components=()=>{
      const parent=new Map(ordinary.map(r=>[r.id,r.id]));
      const find=(id:string):string=>parent.get(id)===id?id:find(parent.get(id)!);
      const join=(a:string,b:string)=>parent.set(find(a),find(b));
      return {find,join,count:()=>new Set(ordinary.map(r=>find(r.id))).size};
    };
    const possible=components();edges.forEach(e=>possible.join(e.a.id,e.b.id));
    if(ordinary.length && possible.count()>1)throw new Error('Essa disposição de banheiros separa os outros cômodos. Posicione o banheiro na periferia ou use Organizar planta residencial para criar uma circulação independente.');
    if(!ordinary.length && floor.rooms.length>1)throw new Error('É necessário um corredor, sala ou outro ambiente de acesso; banheiros não podem ser ligados em sequência.');
    if(reset) {
      for(const room of floor.rooms)for(const edge of roomEdges(room.id))if(neighbour(c,room.id,edge.side))floor.walls[edge.key].kind='solid';
    }
    const door=(key:string,privacy:boolean)=>{
      const w=floor.walls[key],wasDoor=w.kind==='door';
      Object.assign(w,{kind:'door',width:wasDoor?w.width:90,height:wasDoor?w.height:Math.min(210,floor.height-20),open:wasDoor?w.open:!privacy});
      w.sill=Math.max(20,Math.min(w.sill,floor.height-w.height-10));
    };
    const connected=components();
    // Only adjacent circulation cells merge into one open corridor. Rooms retain
    // their partition and a bounded doorway, including older generated layouts.
    for(const e of edges)if(floor.walls[e.key].kind==='passage'
      && ((e.a.type==='hall') !== (e.b.type==='hall')))door(e.key,false);
    edges.filter(e=>isOpening(floor.walls[e.key])).forEach(e=>connected.join(e.a.id,e.b.id));
    const seed=floor.rooms.reduce((sum,r)=>sum+r.furnitureSeed,0);
    edges.sort((a,b)=>(priority(a.a)+priority(a.b))*1000+hash(a.key+seed)%997-((priority(b.a)+priority(b.b))*1000+hash(b.key+seed)%997));
    for(const e of edges)if(connected.find(e.a.id)!==connected.find(e.b.id)) {
      if(e.a.type==='hall' && e.b.type==='hall')floor.walls[e.key].kind='passage';
      else door(e.key,true);
      connected.join(e.a.id,e.b.id);
    }
    for(const room of bath) {
      const candidates=roomEdges(room.id).flatMap(edge=>{
        const id=neighbour(c,room.id,edge.side),other=id?rooms.get(id):undefined;
        return other && other.type!=='bathroom'?[{...edge,other}]:[];
      });
      if(!candidates.length && ordinary.length)throw new Error(`O banheiro ${room.name} precisa encostar em um ambiente que não seja outro banheiro.`);
      // Prefer a deliberately retained entrance; otherwise choose a hall/social area before an en-suite.
      candidates.sort((a,b)=>(isOpening(floor.walls[a.key])?-1000:0)+priority(a.other)*10-((isOpening(floor.walls[b.key])?-1000:0)+priority(b.other)*10));
      const chosen=candidates[0]?.key ?? roomEdges(room.id).find(e=>e.side==='front')!.key;
      for(const edge of roomEdges(room.id))if(edge.key!==chosen && isOpening(floor.walls[edge.key]))floor.walls[edge.key].kind='solid';
      door(chosen,true);
    }
    // The ground-floor entrance belongs to a social/circulation room, never a through-bathroom.
    if(index===0 && ordinary.length) {
      const outside=ordinary.flatMap(room=>roomEdges(room.id).filter(e=>!neighbour(c,room.id,e.side)).map(e=>({...e,room})));
      if(!outside.some(e=>floor.walls[e.key].kind==='door')) {
        outside.sort((a,b)=>(a.side==='front'?0:20)+priority(a.room)-((b.side==='front'?0:20)+priority(b.room)));
        if(!outside[0])throw new Error('A planta precisa de uma entrada externa fora dos banheiros.');
        door(outside[0].key,false);floor.walls[outside[0].key].open=false;
      }
    }
  });
  return c;
}

export function floorConnections(c:HouseConfig,index:number) {
  const floor=c.floors[index];
  if(floor.layout==='free')return freeWallSegments(c,index).filter(s=>s.rooms.length===2 && isOpening(s.config)).map(s=>({a:s.rooms[0],b:s.rooms[1],key:s.key}));
  return floor.rooms.flatMap(room=>roomEdges(room.id).flatMap(edge=>{
    const other=neighbour(c,room.id,edge.side);
    return other && room.id<other && isOpening(floor.walls[edge.key])?[{a:room.id,b:other,key:edge.key}]:[];
  }));
}
