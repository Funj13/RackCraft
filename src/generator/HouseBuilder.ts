import * as THREE from 'three';
import { HouseConfig, HouseWall, cellBounds, roomBounds, floorElevation, roomWallKey } from '../types/house';
import {houseWalls} from '../types/houseWalls';
import { BedroomLibrary, referenceAsset, sizeReference, tintReference } from './BedroomLibrary';
import { addWallDetails, referenceFloor } from './HouseDetails';
import { FurnitureReport, furnishRoom } from './FurnitureBuilder';

export interface HouseView { cutaway?: boolean; floor?: number; showRoof?: boolean; room?:string }

/** A shared edge is built once, regardless of which adjoining room edits it. All lengths are cm. */
export function buildHouse(c: HouseConfig, view: HouseView = {}, library?:BedroomLibrary): THREE.Group {
  const root = new THREE.Group(); root.name = c.name;
  const cache = new Map<string, THREE.MeshStandardMaterial>();
  const material = (name: string, color: string) => {
    const key = `${name}:${color}`;
    if (!cache.has(key)) cache.set(key, new THREE.MeshStandardMaterial({ name, color, roughness: name === 'glass' ? 0.2 : 0.85 }));
    return cache.get(key)!;
  };
  const sourceNames={wall:'Wall',floor:'Floor',ceiling:'Ceiling',trim:'Baseboard',door:'Door',glass:'Glass'};
  const mat = (key: keyof HouseConfig['colors']) => {
    if(library && c.style==='bedroom') {
      const name=sourceNames[key];
      if(!cache.has(name))cache.set(name,library.materials.get(name)!.clone());
      return cache.get(name)!;
    }
    return material(key,c.colors[key]);
  };
  const reports:Record<string,FurnitureReport>={};root.userData.furnitureReports=reports;
  const box = (parent: THREE.Object3D, name: string, w: number, h: number, d: number, x: number, y: number, z: number, m: THREE.Material) => {
    if (w<=0 || h<=0 || d<=0) return;
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);
    mesh.name=name; mesh.position.set(x,y,z); mesh.castShadow=(m as THREE.MeshPhysicalMaterial).transmission!==1; mesh.receiveShadow=true; parent.add(mesh);
    return mesh;
  };
  const { width, depth, wallThickness: t, slabThickness: slab } = c;
  const hasStairs = c.floors.length === 2 && c.stairs.enabled;
  const stairCell = cellBounds(c,c.stairs.cellId);
  const flightWidth = Math.min(100,(stairCell.width-200)/2), gap=20;
  const hole = { minX: stairCell.centerX-flightWidth-gap/2, maxX: stairCell.centerX+flightWidth+gap/2,
    minZ: stairCell.minZ, maxZ: stairCell.maxZ-100, width: 2*flightWidth+gap };
  const edge = (parent: THREE.Object3D, length: number, height: number, config: HouseWall) => {
    if (config.kind === 'passage') return;
    if (config.kind === 'solid') { box(parent,'Painel',length,height,t,0,height/2,0,mat('wall')); return; }
    const ow = config.width, oh = config.height;
    const sill = config.kind === 'window' ? config.sill : 0;
    const sideWidth = (length-ow)/2;
    for (const sign of [-1,1]) box(parent,'Lateral',sideWidth,height,t,sign*(ow+sideWidth)/2,height/2,0,mat('wall'));
    box(parent,'Verga',ow,height-sill-oh,t,0,(height+sill+oh)/2,0,mat('wall'));
    box(parent,'Peitoril',ow,sill,t,0,sill/2,0,mat('wall'));
    if(!(library && config.kind==='door' && c.details)) {
      for (const x of [-ow/2+2,ow/2-2]) box(parent,'Batente',4,oh,t+2,x,sill+oh/2,0,mat('trim'));
      box(parent,'Moldura_superior',ow,4,t+2,0,sill+oh-2,0,mat('trim'));
    }
    if (config.kind === 'window') {
      box(parent,'Moldura_inferior',ow,4,t+2,0,sill+2,0,mat('trim'));
      box(parent,'Vidro',ow-8,oh-8,1,0,sill+oh/2,0,mat('glass'));
      box(parent,'Montante',4,oh-8,4,0,sill+oh/2,0,mat('trim'));
    } else {
      if(library && c.details) for(const face of [-1,1]) {
        const frame=sizeReference(referenceAsset(library,'DoorFrame'),ow+22,undefined,oh+9);
        frame.name='Moldura_porta_original';frame.position.z=face*(t/2+1);if(face<0)frame.rotation.y=Math.PI;parent.add(frame);
        if(c.style==='custom')tintReference(frame,'Baseboard',c.colors.trim);
      }
      if(c.doorLeaves===false)return;
      const pivot = new THREE.Group(); pivot.name='Porta_articulada'; pivot.position.x=-ow/2+4;
      if (config.open) pivot.rotation.y=-Math.PI/2;
      parent.add(pivot);
      if(library && c.details) {
        const leaf=sizeReference(referenceAsset(library,'DoorLeaf'),ow-8,undefined,oh-6);
        leaf.name='Folha_porta';leaf.position.x=(ow-8)/2;pivot.add(leaf);
        if(c.style==='custom')tintReference(leaf,'Door',c.colors.door);
      } else {
        box(pivot,'Folha_porta',ow-8,oh-6,4,(ow-8)/2,oh/2,0,mat('door'));
        box(pivot,'Macaneta',10,3,8,ow-20,Math.min(100,oh*0.5),0,mat('trim'));
      }
    }
  };
  c.floors.forEach((floor,index) => {
    if (view.floor !== undefined && view.floor !== index) return;
    const level = new THREE.Group(); level.name=`Pavimento_${index}_${floor.name}`;
    level.position.y=floorElevation(c,index); root.add(level);
    // One structural slab per level, split into four rectangles around a real stair opening.
    const focused=view.room ? roomBounds(c,index,view.room) : undefined;
    const w=(focused?.width??width)+2*t, d=(focused?.depth??depth)+2*t;
    const cx=focused?.centerX??0,cz=focused?.centerZ??0;
    const minX=cx-w/2,maxX=cx+w/2,minZ=cz-d/2,maxZ=cz+d/2;
    if(!view.room && floor.rooms.some(room=>room.size)) {
      // Union of room slabs without overlaps; leave released space empty and keep
      // the stair opening real, including when only an upper-floor room is resized.
      const rectangles=floor.rooms.map(room=>{const b=roomBounds(c,index,room.id);return {minX:b.minX-t,maxX:b.maxX+t,minZ:b.minZ-t,maxZ:b.maxZ+t};});
      const stairHole=index===1 && hasStairs;
      const xs=[...new Set([...rectangles.flatMap(b=>[b.minX,b.maxX]),...(stairHole?[hole.minX,hole.maxX]:[])])].sort((a,b)=>a-b);
      const zs=[...new Set([...rectangles.flatMap(b=>[b.minZ,b.maxZ]),...(stairHole?[hole.minZ,hole.maxZ]:[])])].sort((a,b)=>a-b);
      for(let zi=0;zi<zs.length-1;zi++)for(let xi=0;xi<xs.length-1;xi++){
        const x=(xs[xi]+xs[xi+1])/2,z=(zs[zi]+zs[zi+1])/2;
        if(!rectangles.some(b=>x>b.minX && x<b.maxX && z>b.minZ && z<b.maxZ))continue;
        if(stairHole && x>hole.minX && x<hole.maxX && z>hole.minZ && z<hole.maxZ)continue;
        box(level,'Laje_individual',xs[xi+1]-xs[xi],slab,zs[zi+1]-zs[zi],x,-slab/2,z,mat('ceiling'));
      }
    } else if (index === 1 && hasStairs && (!view.room || view.room===c.stairs.cellId)) {
      const left = hole.minX-minX, right=maxX-hole.maxX;
      box(level,'Laje_esquerda',left,slab,d,minX+left/2,-slab/2,cz,mat('ceiling'));
      box(level,'Laje_direita',right,slab,d,maxX-right/2,-slab/2,cz,mat('ceiling'));
      const back=hole.minZ-minZ, front=maxZ-hole.maxZ;
      box(level,'Laje_fundo',hole.width,slab,back,stairCell.centerX,-slab/2,minZ+back/2,mat('ceiling'));
      box(level,'Laje_frente',hole.width,slab,front,stairCell.centerX,-slab/2,maxZ-front/2,mat('ceiling'));
    } else box(level,'Laje',w,slab,d,cx,-slab/2,cz,mat('ceiling'));
    floor.rooms.forEach(room => {
      if(view.room && view.room!==room.id)return;
      const bounds=roomBounds(c,index,room.id);
      const group=new THREE.Group(); group.name=`Comodo_${room.id}_${room.name}`; group.userData={roomId:room.id,floor:index};
      level.add(group);
      if (!(hasStairs && index === 1 && room.id === c.stairs.cellId)) {
        box(group,'Acabamento_piso',bounds.width,0.4,bounds.depth,bounds.centerX,0.2,bounds.centerZ,material('floor',room.floorColor));
        if(library && room.finish!=='plain') {
          const finish=referenceFloor(library,bounds.width,bounds.depth,room.finish);finish.position.x=bounds.centerX;finish.position.z=bounds.centerZ;group.add(finish);
        }
      } else {
        const margin=(bounds.width-hole.width)/2;
        for (const sign of [-1,1]) box(group,'Circulacao_lateral',margin,0.4,bounds.depth,bounds.centerX+sign*(hole.width+margin)/2,0.2,bounds.centerZ,material('floor',room.floorColor));
        box(group,'Patamar_superior',hole.width,0.4,100,bounds.centerX,0.2,bounds.maxZ-50,material('floor',room.floorColor));
        const guard=new THREE.Group(); guard.name='Guarda_corpo_vao'; group.add(guard);
        const length=hole.maxZ-hole.minZ;
        for (const x of [hole.minX-3,hole.maxX+3]) {
          box(guard,'Barra_superior',4,4,length,x,92,(hole.minZ+hole.maxZ)/2,mat('trim'));
          for (let i=0;i<=4;i++) box(guard,'Montante_guarda',4,90,4,x,45,hole.minZ+length*i/4,mat('trim'));
        }
      }
      if(library && room.furnished && !(hasStairs && room.id===c.stairs.cellId)) {
        const furnished=furnishRoom(c,index,room,library);
        furnished.model.children.forEach(object=>{object.userData.roomId=room.id;object.userData.floor=index;});
        furnished.model.position.set(bounds.centerX,0,bounds.centerZ);group.add(furnished.model);
        reports[`${index}/${room.id}`]=furnished.report;
      }
      if(library && !view.cutaway && !view.room && (index<c.floors.length-1 || (c.roof.type!=='none' && view.showRoof!==false))) {
        const lamp=sizeReference(referenceAsset(library,'CeilingLamp'),24);
        const height=new THREE.Box3().setFromObject(lamp).getSize(new THREE.Vector3()).y;
        lamp.position.set(bounds.centerX,floor.height-height,bounds.centerZ);lamp.name='Luminaria_original';group.add(lamp);
      }
    });
    houseWalls(c,index).forEach(segment => {
      const {key,config}=segment;
      const [axis,a,b]=key.split(':'); const r=+a, col=+b;
      if(view.room) {
        const [selectedRow,selectedCol]=view.room.split(':').map(Number);
        const keys=(['back','front','left','right'] as const).map(side=>roomWallKey(selectedRow,selectedCol,side));
        if((!segment.sides && !keys.includes(key)) || !segment.rooms.includes(view.room))return;
        if(view.cutaway && (segment.sides?['front','right'].includes(segment.sides[view.room]):key===roomWallKey(selectedRow,selectedCol,'front') || key===roomWallKey(selectedRow,selectedCol,'right')))return;
      } else if (view.cutaway && (segment.sides?segment.rooms.length===1 && ['front','right'].includes(Object.values(segment.sides)[0]):(axis==='h' && r===c.rows) || (axis==='v' && col===c.columns))) return;
      const wall=new THREE.Group(); wall.name=`Parede_${key}`; wall.userData={wallKey:key,floor:index};
      if (segment.axis==='h') {
        wall.position.set((segment.start+segment.end)/2,0,segment.line);
      } else {
        wall.position.set(segment.line,0,(segment.start+segment.end)/2);
        wall.rotation.y=Math.PI/2;
      }
      level.add(wall);
      const length=segment.end-segment.start;
      // Local +X is reversed on walls rotated around Y.
      const offset=(segment.opening-(segment.start+segment.end)/2)*(segment.axis==='h'?1:-1);
      const centeredLength=length-2*Math.abs(offset);
      const openingGroup=new THREE.Group();openingGroup.name='Trecho_principal';openingGroup.position.x=offset;wall.add(openingGroup);
      edge(openingGroup,centeredLength,floor.height,config);
      wall.userData.thickness=t;
      openingGroup.userData.thickness=t;
      if(library && c.details && centeredLength>=60)addWallDetails(openingGroup,centeredLength,config,library,c.style==='custom'?c.colors.trim:undefined);
      if(Math.abs(offset)>0.01){
        const extension=new THREE.Group();extension.name='Extensao_parede';extension.position.x=-Math.sign(offset)*(length/2-Math.abs(offset));wall.add(extension);
        const solid={...config,kind:'solid' as const};edge(extension,2*Math.abs(offset),floor.height,solid);extension.userData.thickness=t;
        if(library && c.details)addWallDetails(extension,2*Math.abs(offset),solid,library,c.style==='custom'?c.colors.trim:undefined);
      }
    });
  });
  if (hasStairs && (!view.room || view.room===c.stairs.cellId) && (view.floor === undefined || view.floor === 0 || view.room===c.stairs.cellId)) {
    const stairs=new THREE.Group(); stairs.name='Escada_entre_pavimentos'; root.add(stairs);
    const rise=floorElevation(c,1), count=Math.ceil(rise/18), firstCount=Math.ceil(count/2), secondCount=count-firstCount;
    const stepHeight=rise/count, landingHeight=firstCount*stepHeight;
    const run=stairCell.depth-200, start=stairCell.maxZ-100, landingEnd=stairCell.minZ+100;
    const leftX=stairCell.centerX-(flightWidth+gap)/2, rightX=stairCell.centerX+(flightWidth+gap)/2;
    const stairMat=mat('floor');
    for (let i=0; i<firstCount; i++) {
      const h=(i+1)*stepHeight, tread=run/firstCount;
      box(stairs,`Degrau_A_${i+1}`,flightWidth,h,tread,leftX,h/2,start-(i+0.5)*tread,stairMat);
    }
    box(stairs,'Patamar',2*flightWidth+gap,landingHeight,100,stairCell.centerX,landingHeight/2,stairCell.minZ+50,stairMat);
    for (let i=0; i<secondCount; i++) {
      const h=landingHeight+(i+1)*stepHeight, tread=run/secondCount;
      box(stairs,`Degrau_B_${i+1}`,flightWidth,h,tread,rightX,h/2,landingEnd+(i+0.5)*tread,stairMat);
    }
    const railMat=mat('trim');
    for (const [x,fromY,toY] of [[leftX-flightWidth/2,0,landingHeight],[rightX+flightWidth/2,rise,landingHeight]]) {
      const from=new THREE.Vector3(x,fromY+90,start), to=new THREE.Vector3(x,toY+90,landingEnd);
      const delta=to.clone().sub(from);
      const rail=new THREE.Mesh(new THREE.CylinderGeometry(2.5,2.5,delta.length(),6),railMat);
      rail.name='Corrimao'; rail.position.copy(from).add(to).multiplyScalar(0.5);
      rail.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize()); stairs.add(rail);
      for (let i=0; i<=4; i++) {
        const p=from.clone().lerp(to,i/4);
        box(stairs,'Suporte_corrimao',4,90,4,p.x,p.y-45,p.z,railMat);
      }
    }
    box(stairs,'Guarda_patamar',2*flightWidth+gap,90,4,stairCell.centerX,landingHeight+45,stairCell.minZ+2,railMat);
  }
  const roofVisible = !view.room && !view.cutaway && view.showRoof !== false && (view.floor === undefined || view.floor === c.floors.length-1);
  if (c.roof.type !== 'none' && roofVisible) {
    const top=floorElevation(c,c.floors.length-1)+c.floors[c.floors.length-1].height;
    const roof=new THREE.Group(); roof.name='Cobertura'; roof.position.y=top; root.add(roof);
    box(roof,'Laje_cobertura',width+2*t,slab,depth+2*t,0,slab/2,0,mat('ceiling'));
    const roofMat=material('roof',c.roof.color);
    if (c.roof.type==='flat') {
      box(roof,'Telhado_plano',width+2*t+2*c.roof.overhang,8,depth+2*t+2*c.roof.overhang,0,slab+4,0,roofMat);
    } else {
      const half=width/2+t+c.roof.overhang;
      const shape=new THREE.Shape(); shape.moveTo(-half,0); shape.lineTo(half,0); shape.lineTo(0,c.roof.height); shape.closePath();
      const length=depth+2*t+2*c.roof.overhang;
      const mesh=new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{depth:length,bevelEnabled:false,steps:1}),roofMat);
      mesh.name='Telhado_duas_aguas'; mesh.position.set(0,slab,-length/2); roof.add(mesh);
    }
  }
  return root;
}
