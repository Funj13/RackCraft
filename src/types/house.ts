import { defaultRoom, RoomConfig, validateRoom } from './room';
import { planCirculation, residentialFloor } from './houseCirculation';
import { enableFreeLayout, freeWallSegments } from './houseFreeLayout';
import {FurnitureInstance,furnitureKinds} from './furniture';

export type HouseSide = 'front' | 'back' | 'left' | 'right';
export type OpeningKind = 'solid' | 'door' | 'window' | 'passage';
export interface HouseWall {
  kind: OpeningKind;
  width: number;
  height: number;
  sill: number;
  open: boolean;
}
export type RoomType = 'bedroom' | 'bathroom' | 'kitchen' | 'living' | 'office' | 'utility' | 'hall' | 'empty';
export interface HouseRoom {
  id: string; name: string; floorColor: string;
  type: RoomType;
  furnished: boolean;
  furnitureSeed: number;
  finish: 'wood' | 'tile' | 'plain';
  size?: { width:number; depth:number };
  position?: {x:number;z:number};
  objects?:FurnitureInstance[];
}
export interface HouseFloor {
  id: string;
  name: string;
  height: number;
  rooms: HouseRoom[];
  walls: Record<string, HouseWall>;
  layout?: 'free';
  freeWalls?: Record<string,HouseWall>;
}
export interface HouseConfig {
  name: string;
  width: number;
  depth: number;
  columns: number;
  rows: number;
  columnWidths: number[];
  rowDepths: number[];
  style: 'bedroom' | 'custom';
  details: boolean;
  doorLeaves?:boolean;
  wallThickness: number;
  slabThickness: number;
  floors: HouseFloor[];
  stairs: { enabled: boolean; cellId: string };
  roof: { type: 'gable' | 'flat' | 'none'; height: number; overhang: number; color: string };
  colors: RoomConfig['colors'];
}
export const bedroomColors:RoomConfig['colors']={wall:'#6c6c6c',floor:'#b7946f',ceiling:'#bbcbe5',trim:'#b4b4b4',door:'#dedede',glass:'#d7dee7'};

export const cellId = (row: number, column: number) => `${row}:${column}`;
export function roomWallKey(row: number, column: number, side: HouseSide) {
  if (side === 'left') return `v:${row}:${column}`;
  if (side === 'right') return `v:${row}:${column+1}`;
  return `h:${side === 'back' ? row : row+1}:${column}`;
}
export function cellDimensions(c: HouseConfig, id = '0:0') {
  const [row,col]=id.split(':').map(Number);
  return { width: c.columnWidths?.[col] ?? (c.width-(c.columns-1)*c.wallThickness)/c.columns,
    depth: c.rowDepths?.[row] ?? (c.depth-(c.rows-1)*c.wallThickness)/c.rows };
}
export function cellBounds(c: HouseConfig, id: string) {
  const [row, col] = id.split(':').map(Number);
  const size = cellDimensions(c,id);
  const x = -c.width/2 + (c.columnWidths?.slice(0,col).reduce((sum,v)=>sum+v,0) ?? col*size.width)+col*c.wallThickness;
  const z = -c.depth/2 + (c.rowDepths?.slice(0,row).reduce((sum,v)=>sum+v,0) ?? row*size.depth)+row*c.wallThickness;
  return { ...size, minX: x, minZ: z, maxX: x+size.width, maxZ: z+size.depth,
    centerX: x+size.width/2, centerZ: z+size.depth/2 };
}
/** Individual room footprint inside its unchanged grid allocation. */
export function roomBounds(c:HouseConfig,floorIndex:number,id:string) {
  const cell=cellBounds(c,id),floor=c.floors[floorIndex],room=floor.rooms.find(r=>r.id===id)!;
  if(floor.layout==='free' && room.position && room.size){
    const {width,depth}=room.size,{x:minX,z:minZ}=room.position;
    return {width,depth,minX,minZ,maxX:minX+width,maxZ:minZ+depth,centerX:minX+width/2,centerZ:minZ+depth/2};
  }
  if(!room.size)return cell;
  const width=room.size.width,depth=room.size.depth;
  const [r,col]=id.split(':').map(Number);
  const opening=(side:HouseSide)=>['door','passage'].includes(floor.walls[roomWallKey(r,col,side)].kind);
  // Prefer the connected side, otherwise an exterior edge, keeping the footprint stable.
  const minX=opening('left')?cell.minX:opening('right')?cell.maxX-width:col===0?cell.minX:col===c.columns-1?cell.maxX-width:cell.centerX-width/2;
  const minZ=opening('back')?cell.minZ:opening('front')?cell.maxZ-depth:r===0?cell.minZ:r===c.rows-1?cell.maxZ-depth:cell.centerZ-depth/2;
  return {width,depth,minX,minZ,maxX:minX+width,maxZ:minZ+depth,centerX:minX+width/2,centerZ:minZ+depth/2};
}
export function resizeRoom(c:HouseConfig,floorIndex:number,id:string,axis:'width'|'depth',size:number) {
  const next=structuredClone(c),bounds=roomBounds(c,floorIndex,id);
  const room=next.floors[floorIndex].rooms.find(r=>r.id===id)!;
  room.size={width:bounds.width,depth:bounds.depth,[axis]:size};
  return validateHouse(next);
}
export function moveRoom(c:HouseConfig,index:number,id:string,x:number,z:number,snap=true){
  const next=enableFreeLayout(c,index),room=next.floors[index].rooms.find(r=>r.id===id)!;
  if(next.floors.length===2 && next.stairs.enabled && id===next.stairs.cellId)throw new Error('A escada fica alinhada nos dois pavimentos e não pode ser movida isoladamente.');
  const width=room.size!.width,depth=room.size!.depth,t=next.wallThickness;
  const snapAxis=(value:number,axis:'x'|'z')=>{
    const size=axis==='x'?width:depth,total=axis==='x'?next.width:next.depth;
    const candidates=[-total/2,total/2-size];
    for(const other of next.floors[index].rooms.filter(r=>r.id!==id)){
      const b=roomBounds(next,index,other.id),min=axis==='x'?b.minX:b.minZ,max=axis==='x'?b.maxX:b.maxZ;
      candidates.push(min,max-size,max+t,min-t-size);
    }
    const nearest=candidates.sort((a,b)=>Math.abs(a-value)-Math.abs(b-value))[0];
    return Math.abs(nearest-value)<=15?nearest:Math.round(value/10)*10;
  };
  room.position={x:snap?snapAxis(x,'x'):x,z:snap?snapAxis(z,'z'):z};
  return validateHouse(next);
}
/** Move the bathroom into the right-hand gap and give its old strip to the living room. */
export function expandLivingBesideBathroom(c:HouseConfig,index:number,bathroomId:string){
  const next=enableFreeLayout(c,index),floor=next.floors[index],bath=floor.rooms.find(r=>r.id===bathroomId)!;
  if(bath.type!=='bathroom')throw new Error('Selecione o banheiro que deseja deslocar.');
  const before=roomBounds(next,index,bathroomId);
  const living=floor.rooms.filter(r=>r.type==='living').find(r=>{const b=roomBounds(next,index,r.id);return b.maxX<=before.minX+1 && Math.abs(b.minZ-before.minZ)<1 && Math.abs(b.depth-before.depth)<1;});
  if(!living)throw new Error('Esta ação precisa de uma sala à esquerda, com a mesma profundidade do banheiro. Mova e redimensione os cômodos pela planta para outras disposições.');
  const left=roomBounds(next,index,living.id),x=next.width/2-before.width;
  if(x-next.wallThickness-left.minX<=left.width+0.01)throw new Error('Não há espaço livre para ampliar a sala à direita.');
  bath.position!.x=x;
  living.size!.width=x-next.wallThickness-left.minX;
  const segments=freeWallSegments(next,index);floor.freeWalls??={};
  const entrance=segments.filter(s=>s.rooms.includes(bathroomId) && s.rooms.includes(living.id) && s.end-s.start>=120).sort((a,b)=>(b.end-b.start)-(a.end-a.start))[0];
  if(!entrance)throw new Error('Não há trecho de parede suficiente para ligar a sala ao banheiro.');
  for(const segment of segments.filter(s=>s.rooms.includes(bathroomId))){
    floor.freeWalls[segment.key]=segment.key===entrance.key?{...segment.config,kind:'door',width:90,height:Math.min(210,floor.height-20),sill:20,open:false}
      :{...segment.config,kind:segment.config.kind==='window'?'window':'solid'};
  }
  return validateHouse(next);
}
export function wallKeys(c: Pick<HouseConfig, 'columns' | 'rows'>) {
  const keys: string[] = [];
  for (let r=0; r<=c.rows; r++) for (let col=0; col<c.columns; col++) keys.push(`h:${r}:${col}`);
  for (let r=0; r<c.rows; r++) for (let col=0; col<=c.columns; col++) keys.push(`v:${r}:${col}`);
  return keys;
}
export function isExteriorWall(c: HouseConfig, key: string) {
  const [axis, a, b] = key.split(':');
  return axis === 'h' ? +a === 0 || +a === c.rows : +b === 0 || +b === c.columns;
}
export function floorElevation(c: HouseConfig, index: number) {
  return c.floors.slice(0, index).reduce((y, f) => y+f.height+c.slabThickness, 0);
}
export function stairMinimumDepth(c: HouseConfig) {
  return Math.ceil(Math.ceil((c.floors[0].height+c.slabThickness)/18)/2)*24 + 200;
}
export function houseMinimumSize(c: HouseConfig) {
  const stairs = c.floors.length === 2 && c.stairs.enabled;
  return { width: c.columns*200+(stairs ? 200 : 0)+(c.columns-1)*c.wallThickness,
    depth: c.rows*200+(stairs ? stairMinimumDepth(c)-200 : 0)+(c.rows-1)*c.wallThickness };
}

export function inferRoomType(name: string): RoomType {
  const text=name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  if(/quarto|suite|bedroom/.test(text)) return 'bedroom';
  if(/banheiro|lavabo|bath/.test(text)) return 'bathroom';
  if(/cozinha|kitchen/.test(text)) return 'kitchen';
  if(/escritorio|office/.test(text)) return 'office';
  if(/sala|living/.test(text)) return 'living';
  if(/lavanderia|utility/.test(text)) return 'utility';
  if(/corredor|circulacao|escada|hall/.test(text)) return 'hall';
  return 'empty';
}

// Allocate clear room dimensions proportionally, without shrinking any axis below its minimum.
function fitAxis(total: number, count: number, values: number[] | undefined, minimum: number[]) {
  const weights=Array.from({length:count},(_,i)=>values?.[i] && values[i]>0 ? values[i] : total/count);
  const sizes=Array(count).fill(0) as number[];
  let available=total, pending=weights.map((_,i)=>i);
  while(pending.length) {
    const sum=pending.reduce((s,i)=>s+weights[i],0);
    const constrained=pending.filter(i=>available*weights[i]/sum<minimum[i]);
    if(!constrained.length) { pending.forEach(i=>{sizes[i]=available*weights[i]/sum;}); break; }
    constrained.forEach(i=>{sizes[i]=minimum[i];available-=minimum[i];});
    pending=pending.filter(i=>!constrained.includes(i));
  }
  return sizes;
}

export function resizeRoomAxis(c: HouseConfig, id: string, axis: 'width'|'depth', size: number): HouseConfig {
  const next=structuredClone(c), [row,col]=id.split(':').map(Number);
  if(axis==='width') {
    next.columnWidths[col]=size;
    next.width=next.columnWidths.reduce((sum,n)=>sum+n,0)+(next.columns-1)*next.wallThickness;
  } else {
    next.rowDepths[row]=size;
    next.depth=next.rowDepths.reduce((sum,n)=>sum+n,0)+(next.rows-1)*next.wallThickness;
  }
  return fitHouse(next);
}

export function randomizeRoomSizes(c:HouseConfig,random:()=>number=Math.random):HouseConfig {
  const next=structuredClone(c);
  const axis=(count:number)=>{
    const values=Array.from({length:count},()=>280+Math.floor(random()*17)*20);
    if(count>1 && new Set(values).size===1)values[0]+=40;
    return values;
  };
  next.columnWidths=axis(next.columns);next.rowDepths=axis(next.rows);
  if(next.floors.length===2 && next.stairs.enabled) {
    const [r,col]=next.stairs.cellId.split(':').map(Number);
    next.columnWidths[col]=Math.max(400,next.columnWidths[col]);
    next.rowDepths[r]=Math.max(stairMinimumDepth(next),next.rowDepths[r]);
  }
  next.width=next.columnWidths.reduce((sum,n)=>sum+n,0)+(next.columns-1)*next.wallThickness;
  next.depth=next.rowDepths.reduce((sum,n)=>sum+n,0)+(next.rows-1)*next.wallThickness;
  return fitHouse(next);
}

function initialWall(c: HouseConfig, key: string, floorIndex: number): HouseWall {
  const exterior = isExteriorWall(c, key);
  const frontDoor = floorIndex === 0 && key === `h:${c.rows}:0`;
  return { kind: frontDoor || !exterior ? 'door' : 'window', width: frontDoor || !exterior ? 90 : 130,
    height: frontDoor || !exterior ? 210 : 110, sill: 100, open: !exterior };
}

/** Preserve matching cells/edges when changing the grid, clamp openings and reserve stair space. */
export function fitHouse(value: HouseConfig): HouseConfig {
  const c = structuredClone(value);
  c.columns = Math.max(1, Math.min(4, Math.round(c.columns)));
  c.rows = Math.max(1, Math.min(4, Math.round(c.rows)));
  if (!c.floors[0].rooms.some(room => room.id === c.stairs.cellId) || +c.stairs.cellId.split(':')[1]>=c.columns) c.stairs.cellId = cellId(0,c.columns-1);
  const minimum = houseMinimumSize(c);
  c.width = Math.max(minimum.width, Math.min(4000, c.width));
  c.depth = Math.max(minimum.depth, Math.min(4000, c.depth));
  const stairs=c.floors.length===2 && c.stairs.enabled;
  const [stairRow,stairCol]=c.stairs.cellId.split(':').map(Number);
  c.columnWidths=fitAxis(c.width-(c.columns-1)*c.wallThickness,c.columns,c.columnWidths,
    Array.from({length:c.columns},(_,i)=>stairs && i===stairCol ? 400 : 200));
  c.rowDepths=fitAxis(c.depth-(c.rows-1)*c.wallThickness,c.rows,c.rowDepths,
    Array.from({length:c.rows},(_,i)=>stairs && i===stairRow ? stairMinimumDepth(c) : 200));
  c.floors = c.floors.map((floor, index) => {
    const rooms: HouseRoom[] = [];
    for (let r=0; r<c.rows; r++) for (let col=0; col<c.columns; col++) {
      const id = cellId(r,col);
      rooms.push(floor.rooms.find(room => room.id === id) ?? { id, name: `Cômodo ${r*c.columns+col+1}`, floorColor: c.colors.floor,
        type: 'empty', furnished: true, furnitureSeed: r*101+col*31+index*997, finish:'wood' });
    }
    rooms.forEach(room=>{if(room.size && floor.layout!=='free'){const size=cellDimensions(c,room.id);room.size.width=Math.min(room.size.width,size.width);room.size.depth=Math.min(room.size.depth,size.depth);}});
    const walls = Object.fromEntries(wallKeys(c).map(key => {
      const wall = { ...(floor.walls[key] ?? initialWall(c, key, index)) };
      const [axis,a,b]=key.split(':');
      const length = axis==='h' ? c.columnWidths[+b] : c.rowDepths[+a];
      wall.width = Math.max(40, Math.min(wall.width, length-30));
      wall.height = Math.max(40, Math.min(wall.height, floor.height-(wall.kind === 'window' ? 40 : 20)));
      wall.sill = Math.max(20, Math.min(wall.sill, floor.height-wall.height-10));
      return [key, wall];
    }));
    return { ...floor, rooms, walls };
  });
  if (!c.floors[0].rooms.some(room => room.id === c.stairs.cellId)) c.stairs.cellId = cellId(0,c.columns-1);
  return planCirculation(c);
}

export function createHouse(twoFloors = false): HouseConfig {
  const c: HouseConfig = {
    name: 'Casa_LowPoly', width: 900, depth: 800, columns: 2, rows: 2,
    wallThickness: 15, slabThickness: 18, columnWidths:[], rowDepths:[], style:'bedroom', details:true,
    floors: [{ id: 'floor-0', name: 'Térreo', height: 280, rooms: [], walls: {} }],
    stairs: { enabled: true, cellId: '0:1' },
    roof: { type: 'gable', height: 150, overhang: 35, color: '#85483a' },
    colors: structuredClone(bedroomColors)
  };
  if (twoFloors) c.floors.push({ id: 'floor-1', name: '1º andar', height: 280, rooms: [], walls: {} });
  const fitted = fitHouse(c);
  fitted.floors.forEach((_,i)=>residentialFloor(fitted,i));
  return planCirculation(fitted,true);
}

export function setFloorCount(c: HouseConfig, count: 1 | 2): HouseConfig {
  const next = structuredClone(c);
  const added=count===2 && next.floors.length===1;
  if (count === 1) next.floors = next.floors.slice(0,1);
  else if (next.floors.length === 1) next.floors.push({ id: 'floor-1', name: '1º andar', height: next.floors[0].height, rooms: [], walls: {} });
  const fitted=fitHouse(next);
  if(added){residentialFloor(fitted,1);planCirculation(fitted,true,1);}
  return fitted;
}

export function randomHouse(random: () => number = Math.random): HouseConfig {
  const pick = <T,>(items: T[]) => items[Math.min(items.length-1, Math.floor(random()*items.length))];
  const c = createHouse(random() < 0.6);
  c.columns = pick([2,2,3]); c.rows = pick([2,2,3]);
  c.columnWidths=Array.from({length:c.columns},()=>pick([280,320,380,440,500]));
  c.rowDepths=Array.from({length:c.rows},()=>pick([280,340,400,460,520]));
  c.width = c.columnWidths.reduce((s,n)=>s+n,0)+(c.columns-1)*c.wallThickness;
  c.depth = c.rowDepths.reduce((s,n)=>s+n,0)+(c.rows-1)*c.wallThickness;
  c.name = 'Casa_Aleatoria';
  const palette = pick([
    ['#e8dfcb','#a57850','#85483a'], ['#d8e0e6','#9b8b78','#384653'],
    ['#e5ddd6','#b58b65','#a65338'], ['#d4ddce','#94806a','#425950']
  ]);
  c.roof.color = palette[2];
  c.roof.type = pick(['gable', 'gable', 'flat'] as ('gable'|'flat')[]);
  c.roof.height = pick([100,140,180]);
  c.floors.forEach(floor => { floor.rooms = []; floor.walls = {}; floor.height = pick([260,280,300]); });
  c.stairs.cellId=cellId(0,c.columns-1);
  if(c.floors.length===2 && c.stairs.enabled) {
    c.columnWidths[c.columns-1]=Math.max(400,c.columnWidths[c.columns-1]);
    c.rowDepths[0]=Math.max(stairMinimumDepth(c),c.rowDepths[0]);
    c.width=c.columnWidths.reduce((s,n)=>s+n,0)+(c.columns-1)*c.wallThickness;
    c.depth=c.rowDepths.reduce((s,n)=>s+n,0)+(c.rows-1)*c.wallThickness;
  }
  const fitted = fitHouse(c);
  fitted.floors.forEach((floor, i) => {
    residentialFloor(fitted,i);
    floor.rooms.forEach(room => {
      room.furnitureSeed=Math.floor(random()*1_000_000);
    });
    Object.entries(floor.walls).forEach(([key, wall]) => {
      if (isExteriorWall(fitted,key) && wall.kind === 'window' && random() < 0.25) wall.kind = 'solid';
      if (!isExteriorWall(fitted,key)) wall.open = random() < 0.7;
    });
  });
  return planCirculation(fitted,true);
}

export function roomToHouse(value: unknown): HouseConfig {
  const room = validateRoom(value);
  const c = createHouse();
  Object.assign(c, { name: room.name, width: room.width, depth: room.depth, columns: 1, rows: 1,
    wallThickness: room.wallThickness, slabThickness: room.floorThickness, colors: room.colors });
  c.roof.type = room.ceiling ? 'flat' : 'none';
  c.floors[0] = { id: 'floor-0', name: 'Térreo', height: room.height,
    rooms: [{id:'0:0',name:room.name,floorColor:room.colors.floor,type:inferRoomType(room.name),furnished:false,furnitureSeed:0,finish:'plain'}], walls: {} };
  c.columnWidths=[room.width]; c.rowDepths=[room.depth]; c.style='custom'; c.details=false;
  for (const side of ['front','back','left','right'] as HouseSide[]) {
    c.floors[0].walls[roomWallKey(0,0,side)] = { kind: !room.walls[side] ? 'passage' : side === 'front' && room.door.enabled ? 'door' : side === 'back' && room.window.enabled ? 'window' : 'solid',
      width: side === 'front' ? room.door.width : room.window.width,
      height: side === 'front' ? room.door.height : room.window.height, sill: room.window.sill, open: room.door.open };
  }
  return fitHouse(c);
}

export function validateHouse(value: unknown): HouseConfig {
  const c = structuredClone(value) as HouseConfig;
  const check = (condition: boolean, message: string) => { if (!condition) throw new Error(message); };
  const number = (v: number, min: number, max: number) => Number.isFinite(v) && v>=min && v<=max;
  const name = (v: string) => typeof v === 'string' && !!v.trim() && v.length<=100;
  const color = (v: string) => typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v);
  check(!!c && name(c.name), 'Nome da casa inválido');
  check(Number.isInteger(c.columns) && number(c.columns,1,4) && Number.isInteger(c.rows) && number(c.rows,1,4), 'Grade inválida (1 a 4 linhas/colunas)');
  check(number(c.width,200,4000) && number(c.depth,200,4000) && number(c.wallThickness,5,40) && number(c.slabThickness,5,40), 'Dimensões da casa inválidas');
  check(Array.isArray(c.floors) && c.floors.length>=1 && c.floors.length<=2, 'A casa deve ter um ou dois pavimentos');
  check(typeof c.stairs?.enabled === 'boolean' && typeof c.stairs.cellId === 'string', 'Escada inválida');
  check(['gable','flat','none'].includes(c.roof?.type) && number(c.roof.height,40,300) && number(c.roof.overhang,0,100) && color(c.roof.color), 'Telhado inválido');
  check(!!c.colors && Object.keys(defaultRoom.colors).every(key => color(c.colors[key as keyof RoomConfig['colors']])), 'Cores inválidas');
  // Version 3 presets used equal cells and had no furniture; preserve their appearance on import.
  c.columnWidths ??= Array(c.columns).fill((c.width-(c.columns-1)*c.wallThickness)/c.columns);
  c.rowDepths ??= Array(c.rows).fill((c.depth-(c.rows-1)*c.wallThickness)/c.rows);
  c.style ??= 'custom';
  c.details ??= false;
  c.doorLeaves ??= true;
  check(typeof c.doorLeaves==='boolean','Opção das folhas das portas inválida');
  check(['bedroom','custom'].includes(c.style),'Estilo inválido');
  check(typeof c.details==='boolean','Detalhes do ambiente inválidos');
  check(Array.isArray(c.columnWidths) && c.columnWidths.length===c.columns && c.columnWidths.every(n=>number(n,200,4000))
    && Math.abs(c.columnWidths.reduce((s,n)=>s+n,0)+(c.columns-1)*c.wallThickness-c.width)<0.01,'Larguras dos cômodos inválidas');
  check(Array.isArray(c.rowDepths) && c.rowDepths.length===c.rows && c.rowDepths.every(n=>number(n,200,4000))
    && Math.abs(c.rowDepths.reduce((s,n)=>s+n,0)+(c.rows-1)*c.wallThickness-c.depth)<0.01,'Profundidades dos cômodos inválidas');
  const keys = wallKeys(c);
  const ids = Array.from({length:c.rows}, (_,r) => Array.from({length:c.columns}, (_,col) => cellId(r,col))).flat();
  c.floors.forEach((f, index) => {
    check(f.layout===undefined || f.layout==='free','Modo da planta inválido');
    if(f.freeWalls!==undefined){
      check(!!f.freeWalls && typeof f.freeWalls==='object' && !Array.isArray(f.freeWalls) && Object.keys(f.freeWalls).length<=1000,'Paredes da planta livre inválidas');
      Object.values(f.freeWalls).forEach(w=>check(!!w && ['solid','door','window','passage'].includes(w.kind) && typeof w.open==='boolean'
        && number(w.width,40,4000) && number(w.height,40,f.height-20) && number(w.sill,20,f.height)
        && (w.kind!=='window' || w.sill+w.height<=f.height-10),'Abertura da planta livre inválida'));
    }
    check(f?.id === `floor-${index}` && name(f.name) && number(f.height,220,600), 'Pavimento inválido');
    check(Array.isArray(f.rooms) && f.rooms.length === ids.length && new Set(f.rooms.map(r=>r.id)).size === ids.length && f.rooms.every(r => ids.includes(r.id) && name(r.name) && color(r.floorColor)), 'Cômodos inválidos');
    f.rooms.forEach(room=>{
      room.type ??= inferRoomType(room.name); room.furnished ??= false; room.furnitureSeed ??= 0; room.finish ??= 'plain';
      if(room.objects!==undefined){
        check(Array.isArray(room.objects) && room.objects.length<=200,'Limite de 200 objetos por cômodo');
        check(new Set(room.objects.map(o=>o.id)).size===room.objects.length,'IDs de objetos duplicados');
        room.objects.forEach(o=>check(!!o && typeof o.id==='string' && /^[\w:-]{1,100}$/.test(o.id) && furnitureKinds.includes(o.kind)
          && number(o.x,-4000,4000) && number(o.z,-4000,4000) && number(o.y,0,600) && number(o.rotation,-36000,36000) && number(o.scale,0.1,3),'Objeto do cenário inválido'));
      }
      if(room.size){const cell=cellDimensions(c,room.id);
        check(number(room.size.width,120,f.layout==='free'?c.width:cell.width+0.01) && number(room.size.depth,120,f.layout==='free'?c.depth:cell.depth+0.01),'O tamanho individual deve caber na planta (mínimo de 120 cm).');
        if(c.floors.length===2 && c.stairs.enabled && room.id===c.stairs.cellId)check(f.layout==='free' && Math.abs(room.size.width-cell.width)<0.01 && Math.abs(room.size.depth-cell.depth)<0.01,'A célula da escada não pode ser reduzida individualmente.');}
      if(f.layout==='free'){
        check(!!room.size && !!room.position && number(room.position.x,-c.width/2,c.width/2) && number(room.position.z,-c.depth/2,c.depth/2),'Posição do cômodo inválida');
        const b=roomBounds(c,index,room.id);
        check(b.maxX<=c.width/2+0.01 && b.maxZ<=c.depth/2+0.01,'O cômodo deve ficar dentro dos limites da planta.');
        if(c.floors.length===2 && c.stairs.enabled && room.id===c.stairs.cellId){const cell=cellBounds(c,room.id);check(Math.abs(b.minX-cell.minX)<0.01 && Math.abs(b.minZ-cell.minZ)<0.01,'A escada precisa continuar alinhada nos dois pavimentos.');}
      }
      check(['bedroom','bathroom','kitchen','living','office','utility','hall','empty'].includes(room.type) && typeof room.furnished==='boolean'
        && Number.isInteger(room.furnitureSeed) && number(room.furnitureSeed,0,2_147_483_647) && ['wood','tile','plain'].includes(room.finish),'Configuração de mobília inválida');
    });
    if(f.layout==='free')for(let a=0;a<f.rooms.length;a++)for(let b=a+1;b<f.rooms.length;b++){
      const x=roomBounds(c,index,f.rooms[a].id),y=roomBounds(c,index,f.rooms[b].id),t=c.wallThickness-0.01;
      check(!(x.minX<y.maxX+t && x.maxX+t>y.minX && x.minZ<y.maxZ+t && x.maxZ+t>y.minZ),`Os cômodos ${f.rooms[a].name} e ${f.rooms[b].name} se sobrepõem ou não deixam espaço para a parede.`);
    }
    check(!!f.walls && Object.keys(f.walls).length === keys.length, 'Paredes inválidas');
    keys.forEach(key => {
      const w = f.walls[key];
      check(!!w && ['solid','door','window','passage'].includes(w.kind) && typeof w.open === 'boolean', 'Parede ou abertura inválida');
      const [axis,a,b]=key.split(':');
      const length=axis==='h' ? c.columnWidths[+b] : c.rowDepths[+a];
      check(number(w.width,40,length-30) && number(w.height,40,f.height-20) && number(w.sill,20,Math.max(20,f.height-w.height-10)), 'Dimensões de abertura inválidas');
    });
  });
  check(ids.includes(c.stairs.cellId), 'Posição da escada inválida');
  if (c.floors.length === 2 && c.stairs.enabled) {
    const min = houseMinimumSize(c);
    check(c.width>=min.width && c.depth>=min.depth, 'Espaço insuficiente para a escada');
    const size=cellDimensions(c,c.stairs.cellId);
    check(size.width>=400-0.01 && size.depth>=stairMinimumDepth(c)-0.01,'A célula da escada é pequena demais');
  }
  planCirculation(c);
  validateRoomConnections(c);
  return c;
}

export function validateRoomConnections(c:HouseConfig) {
  c.floors.forEach((floor,index)=>floor.rooms.forEach(room=>{
    if(floor.layout==='free')return;
    const [r,col]=room.id.split(':').map(Number),a=roomBounds(c,index,room.id);
    for(const side of ['front','right'] as const){
      if((side==='front' && r===c.rows-1)||(side==='right' && col===c.columns-1))continue;
      const key=roomWallKey(r,col,side),wall=floor.walls[key];
      if(!['door','passage'].includes(wall.kind))continue;
      const other=cellId(r+(side==='front'?1:0),col+(side==='right'?1:0)),b=roomBounds(c,index,other);
      const gap=side==='front'?b.minZ-a.maxZ:b.minX-a.maxX;
      const overlap=side==='front'?Math.min(a.maxX,b.maxX)-Math.max(a.minX,b.minX):Math.min(a.maxZ,b.maxZ)-Math.max(a.minZ,b.minZ);
      if(Math.abs(gap-c.wallThickness)>0.01 || overlap<(wall.kind==='door'?wall.width:80)+30)
        throw new Error(`A redução de ${room.name} deixaria um acesso sem ligação ou sem espaço. Aumente a medida ou reposicione a porta antes de reduzir.`);
    }
  }));
}
