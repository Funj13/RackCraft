import * as THREE from 'three';
import { HouseConfig, HouseRoom, roomBounds, roomWallKey } from '../types/house';
import {roomOpeningOffset,houseWalls} from '../types/houseWalls';
import { BedroomLibrary, referenceAsset, sizeReference } from './BedroomLibrary';
import { disposeModel } from './RoomBuilder';
import {FurnitureInstance,FurnitureKind,furnitureKinds} from '../types/furniture';

export interface Footprint { minX:number;maxX:number;minZ:number;maxZ:number }
export interface FurnitureReport {
  placed: { name:string; bounds:Footprint }[];
  omitted: string[];
  circulation: Footprint[];
}
export const overlaps=(a:Footprint,b:Footprint,gap=0)=>a.minX<b.maxX+gap && a.maxX>b.minX-gap && a.minZ<b.maxZ+gap && a.maxZ>b.minZ-gap;

/** Protected routes run from each doorway to a central turning area. Dimensions are room-local cm. */
export function roomCirculation(c:HouseConfig,floorIndex:number,roomId:string):Footprint[] {
  const {width:w,depth:d}=roomBounds(c,floorIndex,roomId), [r,col]=roomId.split(':').map(Number);
  const areas:Footprint[]=[];
  const free=c.floors[floorIndex].layout==='free';
  const boundaries=free?houseWalls(c,floorIndex).filter(s=>s.rooms.includes(roomId)).map(s=>({side:s.sides![roomId],wall:s.config,offset:s.opening-(s.axis==='h'?roomBounds(c,floorIndex,roomId).centerX:roomBounds(c,floorIndex,roomId).centerZ)}))
    :(['back','front','left','right'] as const).map(side=>({side,wall:c.floors[floorIndex].walls[roomWallKey(r,col,side)],offset:roomOpeningOffset(c,floorIndex,roomId,side)}));
  for(const {side,wall,offset} of boundaries) {
    if(wall.kind!=='door' && wall.kind!=='passage') continue;
    const half=wall.kind==='passage' ? 40 : Math.max(40,Math.min(65,(wall.width+16)/2));
    const lo=Math.min(-40,offset-half),hi=Math.max(40,offset+half);
    if(side==='back') areas.push({minX:lo,maxX:hi,minZ:-d/2,maxZ:40});
    if(side==='front') areas.push({minX:lo,maxX:hi,minZ:-40,maxZ:d/2});
    if(side==='left') areas.push({minX:-w/2,maxX:40,minZ:lo,maxZ:hi});
    if(side==='right') areas.push({minX:-40,maxX:w/2,minZ:lo,maxZ:hi});
  }
  areas.push({minX:-40,maxX:40,minZ:-40,maxZ:40});
  return areas;
}

function catalog(library:BedroomLibrary) {
  const materials=new Map<string,THREE.MeshStandardMaterial>();
  const mat=(name:string)=>{
    if(!materials.has(name)) materials.set(name,library.materials.get(name)!.clone());
    return materials.get(name)!;
  };
  const box=(p:THREE.Object3D,name:string,w:number,h:number,d:number,x:number,y:number,z:number,m:string)=>{
    const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat(m));mesh.name=name;mesh.position.set(x,y,z);p.add(mesh);return mesh;
  };
  const cylinder=(p:THREE.Object3D,name:string,r1:number,r2:number,h:number,x:number,y:number,z:number,m:string)=>{
    const mesh=new THREE.Mesh(new THREE.CylinderGeometry(r1,r2,h,8),mat(m));mesh.name=name;mesh.position.set(x,y,z);p.add(mesh);return mesh;
  };
  const table=(p:THREE.Object3D,w:number,d:number,h:number)=>{
    box(p,'Tampo',w,5,d,0,h-2.5,0,'Wood1');
    for(const x of [-w/2+7,w/2-7])for(const z of [-d/2+7,d/2-7])box(p,'Pe_mesa',5,h-5,5,x,(h-5)/2,z,'Wood1');
  };
  const chair=(p:THREE.Object3D,x:number,z:number,rotation:number)=>{
    const g=new THREE.Group();g.name='Cadeira';g.position.set(x,0,z);g.rotation.y=rotation;p.add(g);
    box(g,'Assento',36,5,38,0,43,0,'Wood2');box(g,'Encosto',36,38,4,0,65,-17,'Wood1');
    for(const a of [-14,14])for(const b of [-14,14])box(g,'Pe_cadeira',4,41,4,a,20.5,b,'Wood1');
  };
  const sink=(p:THREE.Object3D,kitchen=false)=>{
    box(p,'Gabinete',kitchen?100:60,78,kitchen?60:50,0,39,0,'Wood2');
    box(p,'Bancada',kitchen?104:64,5,kitchen?64:54,0,80,0,'Case');
    box(p,'Cuba_interior',40,1,30,0,83,0,'Plastic');
    for(const x of [-22,22])box(p,'Borda_cuba',4,4,38,x,84,0,'Case');
    for(const z of [-17,17])box(p,'Borda_cuba',40,4,4,0,84,z,'Case');
    cylinder(p,'Torneira',1.8,1.8,22,0,94,-20,'Metal');box(p,'Bica',3,3,16,0,104,-13,'Metal');
    box(p,'Puxador',25,3,3,0,65,kitchen?31:26,'Metal');
  };
  const make=(kind:string):THREE.Group=>{
    let g=new THREE.Group();g.name=kind;
    if(kind==='Cama') g=sizeReference(referenceAsset(library,'Bed'),150);
    else if(kind==='Escrivaninha_com_computador') g=sizeReference(referenceAsset(library,'Workstation'),170);
    else if(kind==='Comoda') g=sizeReference(referenceAsset(library,'Dresser'),105);
    else if(kind==='Mesa_cabeceira') {
      table(g,42,42,52);box(g,'Gaveta',32,14,34,0,39,0,'Wood2');box(g,'Puxador',10,2,2,0,39,18,'Metal');
    } else if(kind==='Pia') sink(g);
    else if(kind==='Bancada_cozinha') sink(g,true);
    else if(kind==='Privada') {
      cylinder(g,'Base_sanitaria',14,19,30,0,15,4,'Case');
      const bowl=cylinder(g,'Bacia',23,15,17,0,35,5,'Case');bowl.scale.z=1.25;
      const ring=new THREE.Mesh(new THREE.TorusGeometry(18,3,4,12),mat('Case'));ring.name='Assento';ring.rotation.x=Math.PI/2;ring.scale.y=1.3;ring.position.set(0,44,5);g.add(ring);
      const water=cylinder(g,'Interior_bacia',16,16,1,0,43,5,'Hole');water.scale.z=1.3;
      box(g,'Caixa_acoplada',40,48,19,0,55,-24,'Case');box(g,'Descarga',9,2,5,0,80,-24,'Metal');
    } else if(kind==='Chuveiro') {
      box(g,'Base_box',88,5,88,0,2.5,0,'Case');box(g,'Ralo',12,0.5,12,0,5.5,0,'Metal');
      box(g,'Vidro_lateral',0.6,195,88,-44,100,0,'Glass');
      for(const x of [-44,44])box(g,'Coluna_box',2,200,2,x,100,-44,'Metal');
      box(g,'Barra_box',88,2,2,0,199,-44,'Metal');
      cylinder(g,'Cano_chuveiro',1.4,1.4,140,20,125,-40,'Metal');box(g,'Braco_chuveiro',3,3,27,20,195,-27,'Metal');
      cylinder(g,'Ducha',10,8,4,20,192,-13,'Metal');cylinder(g,'Registro',4,4,3,20,100,-38,'Metal').rotation.x=Math.PI/2;
    } else if(kind==='Geladeira') {
      box(g,'Corpo',65,180,66,0,90,0,'Case');
      box(g,'Porta_freezer',61,48,4,0,153,35,'Wood2');box(g,'Porta_geladeira',61,120,4,0,65,35,'Wood2');
      box(g,'Vedacao',62,2,1,0,127,38,'Hole');
      for(const y of [107,150])box(g,'Puxador',3,25,4,24,y,39,'Metal');
    } else if(kind==='Forno') {
      box(g,'Corpo_fogao',60,86,62,0,43,0,'Case');box(g,'Cooktop',60,4,62,0,88,0,'Metal');
      for(const x of [-16,16])for(const z of [-17,17])cylinder(g,'Queimador',9,9,2,x,91,z,'Hole');
      box(g,'Vidro_forno',48,42,2,0,38,32,'Monitor');box(g,'Puxador_forno',44,4,5,0,65,34,'Metal');
      for(const x of [-20,-7,7,20])cylinder(g,'Botao',3,3,3,x,77,33,'Plastic').rotation.x=Math.PI/2;
    } else if(kind==='Mesa_e_cadeiras') {
      table(g,78,60,75);chair(g,-65,0,Math.PI/2);chair(g,65,0,-Math.PI/2);
    } else if(kind==='Sofa') {
      box(g,'Base_sofa',178,30,78,0,23,0,'Wood1');box(g,'Encosto_sofa',178,55,16,0,61,-32,'Pillow');
      for(const x of [-85,85])box(g,'Braco_sofa',15,45,80,x,47,0,'Pillow');
      for(const x of [-47,0,47])box(g,'Almofada_assento',44,13,60,x,44,6,'Pillow');
      for(const x of [-65,65])box(g,'Almofada_azul',28,30,13,x,66,-15,'Blanket');
      for(const x of [-72,72])for(const z of [-27,27])box(g,'Pe_sofa',6,9,6,x,4.5,z,'Wood1');
    } else if(kind==='TV_e_rack') {
      box(g,'Rack_TV',140,45,36,0,26,0,'Wood1');box(g,'Frente_rack',132,30,2,0,26,19,'Wood2');
      box(g,'Base_TV',45,3,22,0,51,0,'Metal');box(g,'Suporte_TV',6,16,5,0,59,-3,'Plastic');
      box(g,'Moldura_TV',112,67,5,0,97,-3,'Monitor');box(g,'Tela_TV',105,60,0.4,0,97,0,'Case2');
    } else if(kind==='Mesa_centro') table(g,75,44,40);
    else if(kind==='Mesa') table(g,100,70,75);
    else if(kind==='Cadeira') chair(g,0,0,0);
    else if(kind==='Maquina_lavar') {
      box(g,'Gabinete_maquina',62,88,62,0,44,0,'Case');
      const hatch=cylinder(g,'Porta_maquina',23,23,5,0,43,33,'Monitor');hatch.rotation.x=Math.PI/2;
      const drum=cylinder(g,'Vidro_maquina',17,17,6,0,43,34,'Glass');drum.rotation.x=Math.PI/2;
      cylinder(g,'Seletor',5,5,3,18,78,33,'Metal').rotation.x=Math.PI/2;
    }
    g.name=kind;g.updateMatrixWorld(true);
    const b=new THREE.Box3().setFromObject(g), center=b.getCenter(new THREE.Vector3());
    g.position.set(-center.x,-b.min.y,-center.z);
    const wrapper=new THREE.Group();wrapper.name=kind;wrapper.add(g);
    wrapper.traverse(o=>{if(o instanceof THREE.Mesh){o.castShadow=!(o.material instanceof THREE.MeshPhysicalMaterial && o.material.transmission>0.5);o.receiveShadow=true;}});
    return wrapper;
  };
  return {make};
}

const inventory:Record<HouseRoom['type'],string[]>={
  bedroom:['Cama','Escrivaninha_com_computador','Mesa_cabeceira','Comoda'],
  bathroom:['Chuveiro','Privada','Pia'],
  kitchen:['Geladeira','Forno','Mesa_e_cadeiras','Bancada_cozinha'],
  living:['Sofa','TV_e_rack','Mesa_centro'],
  office:['Escrivaninha_com_computador','Comoda'],utility:['Maquina_lavar','Pia'],hall:[],empty:[]
};

export function furnishRoom(c:HouseConfig,floorIndex:number,room:HouseRoom,library:BedroomLibrary) {
  const root=new THREE.Group();root.name='Mobilia';
  const report:FurnitureReport={placed:[],omitted:[],circulation:roomCirculation(c,floorIndex,room.id)};
  const {width:w,depth:d}=roomBounds(c,floorIndex,room.id), {make}=catalog(library);
  if(room.objects!==undefined){
    for(const item of room.objects){
      const object=make(item.kind);object.scale.setScalar(item.scale);object.rotation.y=item.rotation*Math.PI/180;
      object.position.set(item.x,item.y+(room.finish==='plain'?0.41:room.finish==='tile'?0.78:0.75),item.z);
      object.updateMatrixWorld(true);const b=new THREE.Box3().setFromObject(object);
      const bounds={minX:b.min.x,maxX:b.max.x,minZ:b.min.z,maxZ:b.max.z};
      object.userData={furniture:true,id:item.id,kind:item.kind,footprint:bounds};root.add(object);report.placed.push({name:item.kind,bounds});
    }
    return {model:root,report};
  }
  let seed=room.furnitureSeed>>>0;
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const turns=[0,Math.PI/2,Math.PI,-Math.PI/2];
  let sofaTurn:number|undefined;
  // Try walls/corners before interior positions, keeping the reserved route and all other furniture clear.
  for(const name of inventory[room.type]) {
    const object=make(name);
    const base=new THREE.Box3().setFromObject(object).getSize(new THREE.Vector3());
    const start=name==='TV_e_rack' && sofaTurn!==undefined ? (turns.indexOf(sofaTurn)+2)%4 : Math.floor(random()*4);
    let placed=false;
    for(const scale of [1,0.9]) {
      for(let k=0;k<4 && !placed;k++) {
        const turn=turns[(start+k)%4], swapped=Math.abs(Math.sin(turn))>0.5;
        const iw=(swapped?base.z:base.x)*scale, id=(swapped?base.x:base.z)*scale;
        const xMax=w/2-iw/2-6,zMax=d/2-id/2-6;
        if(xMax<0 || zMax<0) continue;
        const xs=[-xMax,xMax,0,-xMax/2,xMax/2],zs=[-zMax,zMax,0,-zMax/2,zMax/2];
        const candidates=xs.flatMap(x=>zs.map(z=>({x,z,rank:Math.abs(x)+Math.abs(z)+random()*8}))).sort((a,b)=>b.rank-a.rank);
        for(const {x,z} of candidates) {
          const againstWall=!['Mesa_e_cadeiras','Mesa_centro','Mesa_cabeceira'].includes(name);
          const backDistance=turn===0 ? d/2+z-id/2 : turn===Math.PI ? d/2-z-id/2 : turn===Math.PI/2 ? w/2+x-iw/2 : w/2-x-iw/2;
          if(againstWall && backDistance>12)continue;
          const bounds={minX:x-iw/2,maxX:x+iw/2,minZ:z-id/2,maxZ:z+id/2};
          if(report.circulation.some(area=>overlaps(bounds,area,4)) || report.placed.some(item=>overlaps(bounds,item.bounds,10))) continue;
          object.scale.setScalar(scale);object.rotation.y=turn;object.position.set(x,room.finish==='plain'?0.41:room.finish==='tile'?0.78:0.75,z);
          if(name==='Sofa')sofaTurn=turn;
          object.userData={furniture:true,id:`auto:${room.id}:${name}`,kind:name,footprint:bounds};root.add(object);report.placed.push({name,bounds});placed=true;break;
        }
      }
      if(placed)break;
    }
    if(!placed){report.omitted.push(name);disposeModel(object);}
  }
  return {model:root,report};
}

/** Freeze current procedural furniture only when the user edits it. Local X/Z are relative to room center. */
export function editableFurniture(c:HouseConfig,index:number,room:HouseRoom,library:BedroomLibrary):FurnitureInstance[]{
  if(room.objects!==undefined)return structuredClone(room.objects);
  if(!room.furnished)return [];
  const {model}=furnishRoom(c,index,room,library),base=room.finish==='plain'?0.41:room.finish==='tile'?0.78:0.75;
  const items=model.children.map(o=>({id:o.userData.id as string,kind:o.userData.kind as FurnitureKind,x:o.position.x,y:o.position.y-base,z:o.position.z,rotation:o.rotation.y*180/Math.PI,scale:o.scale.x}));
  disposeModel(model);return items;
}
export function furnitureBounds(item:FurnitureInstance,library:BedroomLibrary){
  const object=catalog(library).make(item.kind);object.scale.setScalar(item.scale);object.rotation.y=item.rotation*Math.PI/180;object.position.set(item.x,item.y,item.z);object.updateMatrixWorld(true);
  const box=new THREE.Box3().setFromObject(object);disposeModel(object);return box;
}
export function assertFurnitureFits(c:HouseConfig,library:BedroomLibrary){
  c.floors.forEach((floor,index)=>floor.rooms.forEach(room=>{
    if(!room.furnished || !room.objects)return;
    const bounds=roomBounds(c,index,room.id);
    for(const item of room.objects){const b=furnitureBounds(item,library);
      if(b.min.x < -bounds.width/2-0.01 || b.max.x>bounds.width/2+0.01 || b.min.z < -bounds.depth/2-0.01 || b.max.z>bounds.depth/2+0.01 || b.max.y>floor.height-1)
        throw new Error(`O objeto ${item.kind.replace(/_/g,' ')} precisa caber no cômodo ${room.name}, abaixo do teto. Mova, reduza a escala ou remova a peça antes de diminuir o cômodo.`);
    }
  }));
}
export function findFurniturePlacement(kind:FurnitureKind,c:HouseConfig,index:number,room:HouseRoom,items:FurnitureInstance[],library:BedroomLibrary,template?:FurnitureInstance):FurnitureInstance{
  if(!furnitureKinds.includes(kind))throw new Error('Objeto desconhecido');
  const size=roomBounds(c,index,room.id),id=template?.id??`object:${crypto.randomUUID()}`,scale=template?.scale??1;
  const routes=roomCirculation(c,index,room.id),occupied=items.map(o=>furnitureBounds(o,library));
  const raw=furnitureBounds({id,kind,x:0,y:0,z:0,rotation:0,scale},library),base=raw.getSize(new THREE.Vector3());
  for(const rotation of [...new Set([template?.rotation??0,0,90,180,270])]){
    const angle=rotation*Math.PI/180,w=base.x*Math.abs(Math.cos(angle))+base.z*Math.abs(Math.sin(angle)),d=base.z*Math.abs(Math.cos(angle))+base.x*Math.abs(Math.sin(angle));
    for(let z=-size.depth/2+d/2+5;z<=size.depth/2-d/2-5;z+=20)for(let x=-size.width/2+w/2+5;x<=size.width/2-w/2-5;x+=20){
      const bounds={minX:x-w/2,maxX:x+w/2,minZ:z-d/2,maxZ:z+d/2};
      if(occupied.some(b=>overlaps(bounds,{minX:b.min.x,maxX:b.max.x,minZ:b.min.z,maxZ:b.max.z},3))||routes.some(r=>overlaps(bounds,r,3)))continue;
      return {id,kind,x,y:template?.y??0,z,rotation,scale};
    }
  }
  throw new Error('Não há espaço livre para esse objeto sem sobrepor móveis ou bloquear circulação. Mova ou remova uma peça, ou aumente o cômodo.');
}
