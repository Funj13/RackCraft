import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export interface BedroomLibrary {
  materials: Map<string, THREE.MeshStandardMaterial>;
  templates: Map<string, THREE.Object3D>;
}
let pending: Promise<BedroomLibrary> | undefined;

export async function parseBedroomLibrary(bytes: ArrayBuffer): Promise<BedroomLibrary> {
  const scene=(await new GLTFLoader().parseAsync(bytes,'')).scene;
  const materials=new Map<string,THREE.MeshStandardMaterial>();
  scene.traverse(object=>{
    if(object instanceof THREE.Mesh) for(const material of Array.isArray(object.material)?object.material:[object.material]) {
      if(material instanceof THREE.MeshStandardMaterial) materials.set(material.name,material);
    }
  });
  const templates=new Map<string,THREE.Object3D>();
  for(const name of ['Bed','Dresser','Workstation','Floorboards','DoorLeaf','DoorFrame','LightSwitch','Outlet','CeilingLamp','Book']) {
    const object=scene.getObjectByName(name);
    if(!object) throw new Error(`Peça ausente na referência: ${name}`);
    templates.set(name,object);
  }
  return {materials,templates};
}

export function loadBedroomLibrary(): Promise<BedroomLibrary> {
  pending ??= (async()=>{
    const response=await fetch(new URL('../assets/bedroom-library.glb',import.meta.url).href);
    if(!response.ok) throw new Error('Não foi possível carregar a biblioteca Bedroom');
    return parseBedroomLibrary(await response.arrayBuffer());
  })().catch(error=>{pending=undefined;throw error;});
  return pending;
}

/** Copies own geometry/materials: rebuilding a house must never dispose the reference library. */
export function referenceAsset(library: BedroomLibrary, name: string): THREE.Group {
  const template=library.templates.get(name);
  if(!template) throw new Error(`Peça ausente: ${name}`);
  const group=new THREE.Group(); group.name=`Referencia_${name}`;
  group.add(template.clone(true));
  const materials=new Map<THREE.Material,THREE.Material>();
  group.traverse(object=>{
    if(object instanceof THREE.Mesh) {
      object.geometry=object.geometry.clone();
      const clone=(m: THREE.Material)=>{if(!materials.has(m))materials.set(m,m.clone());return materials.get(m)!;};
      object.material=Array.isArray(object.material)?object.material.map(clone):clone(object.material);
      object.castShadow=!(object.material instanceof THREE.MeshPhysicalMaterial && object.material.transmission>0.5); object.receiveShadow=true;
    }
  });
  return group;
}

export function sizeReference(group: THREE.Group, width: number | undefined, depth?: number, height?: number) {
  const size=new THREE.Box3().setFromObject(group).getSize(new THREE.Vector3());
  if(depth!==undefined || height!==undefined) group.scale.set(width===undefined?1:width/size.x,height===undefined?1:height/size.y,depth===undefined?1:depth/size.z);
  else if(width!==undefined) group.scale.setScalar(width/size.x);
  return group;
}

export function tintReference(group:THREE.Group,sourceName:string,color:string) {
  group.traverse(o=>{if(o instanceof THREE.Mesh)for(const m of Array.isArray(o.material)?o.material:[o.material]) {
    if(m instanceof THREE.MeshStandardMaterial && m.name===sourceName)m.color.set(color);
  }});
  return group;
}
