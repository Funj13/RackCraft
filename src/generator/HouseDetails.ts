import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { HouseWall, HouseRoom } from '../types/house';
import { BedroomLibrary, referenceAsset, sizeReference } from './BedroomLibrary';

export function referenceFloor(library:BedroomLibrary,width:number,depth:number,finish:HouseRoom['finish']) {
  const root=new THREE.Group();root.name='Revestimento';
  if(finish==='wood') root.add(sizeReference(referenceAsset(library,'Floorboards'),width,depth));
  if(finish==='tile') {
    const material=library.materials.get('Wood2')!.clone();material.name='Azulejo_Bedroom_Wood2';
    const floor=new THREE.Mesh(new THREE.BoxGeometry(width,0.25,depth),material);floor.position.y=0.125;root.add(floor);
    const lines:THREE.BufferGeometry[]=[];
    for(let x=-width/2+45;x<width/2;x+=45)lines.push(new THREE.BoxGeometry(0.6,0.1,depth).translate(x,0.3,0));
    for(let z=-depth/2+45;z<depth/2;z+=45)lines.push(new THREE.BoxGeometry(width,0.1,0.6).translate(0,0.3,z));
    if(lines.length) {
      const seams=new THREE.Mesh(mergeGeometries(lines),library.materials.get('Plastic')!.clone());seams.name='Rejunte';root.add(seams);
      lines.forEach(geometry=>geometry.dispose());
    }
  }
  root.position.y=0.42;root.traverse(o=>{if(o instanceof THREE.Mesh)o.receiveShadow=true;});return root;
}

export function addWallDetails(wall:THREE.Group,length:number,config:HouseWall,library:BedroomLibrary,trimColor?:string) {
  if(config.kind==='passage')return;
  const t=(wall.userData.thickness as number);
  const intervals=config.kind==='door' ? [[-length/2,-config.width/2],[config.width/2,length/2]] : [[-length/2,length/2]];
  for(const face of [-1,1]) {
    for(const [start,end] of intervals) {
      if(end-start<1)continue;
      // Molded 15 cm skirting matches the source profile and original Baseboard PBR material.
      const shape=new THREE.Shape();shape.moveTo(0,0);shape.lineTo(-1.8,0);shape.lineTo(-1.8,13.5);shape.lineTo(-1,15.09);shape.lineTo(0,15.09);shape.closePath();
      const geometry=new THREE.ExtrudeGeometry(shape,{depth:end-start,bevelEnabled:false,steps:1});
      geometry.rotateY(Math.PI/2);geometry.translate(-(end-start)/2,0,0);
      const mesh=new THREE.Mesh(geometry,library.materials.get('Baseboard')!.clone());mesh.name='Rodape_moldado';
      if(trimColor)mesh.material.color.set(trimColor);
      mesh.position.set((start+end)/2,0,face*t/2);if(face<0)mesh.rotation.y=Math.PI;wall.add(mesh);
    }
    const fixture=(name:string,x:number,y:number,targetWidth:number)=>{
      const object=sizeReference(referenceAsset(library,name),targetWidth);
      const size=new THREE.Box3().setFromObject(object).getSize(new THREE.Vector3());
      object.name=name==='Outlet'?'Tomada_original':'Interruptor_original';
      object.position.set(x,y,face*(t/2+size.z/2+0.1));if(face<0)object.rotation.y=Math.PI;wall.add(object);
    };
    if(config.kind==='door' && config.width/2+22<length/2)fixture('LightSwitch',config.width/2+14,110,8);
    const sideWidth=(length-config.width)/2;
    if(config.kind==='door' || (config.kind==='window' && config.sill<50)) {
      if(sideWidth>=14)fixture('Outlet',-length/2+sideWidth/2,28,8);
    } else fixture('Outlet',-length/2+22,28,8);
  }
}
