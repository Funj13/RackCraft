import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';

// Derive reusable assets from the user's GLB. No raster textures or replacement artwork is generated.
const [input, output]=process.argv.slice(2);
if(!input || !output) throw new Error('Usage: node scripts/extract-bedroom.mjs source.glb destination.glb');
const bytes=await readFile(input);
const source=(await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength), '')).scene;
source.updateMatrixWorld(true);
const library=new THREE.Group(); library.name='Bedroom_reference_library';
const baked=(object)=>{
  const group=new THREE.Group();
  object.traverse(mesh=>{
    if(!mesh.isMesh) return;
    const geometry=mesh.geometry.clone();
    geometry.applyMatrix4(mesh.matrixWorld); geometry.scale(100,100,100);
    const copy=new THREE.Mesh(geometry,mesh.material); copy.name=mesh.name; group.add(copy);
  });
  return group;
};
const normalize=(group,name,rotate=0)=>{
  group.rotation.y=rotate; group.updateMatrixWorld(true);
  // Bake any canonical orientation before centering, preserving all source proportions/materials.
  group.traverse(mesh=>{if(mesh.isMesh){mesh.geometry.applyMatrix4(mesh.matrixWorld);mesh.position.set(0,0,0);mesh.rotation.set(0,0,0);mesh.scale.set(1,1,1);}});
  group.rotation.set(0,0,0); group.updateMatrixWorld(true);
  const bounds=new THREE.Box3().setFromObject(group), center=bounds.getCenter(new THREE.Vector3());
  group.traverse(mesh=>{if(mesh.isMesh) mesh.geometry.translate(-center.x,-bounds.min.y,-center.z);});
  group.name=name; library.add(group); return group;
};
for(const [sourceName,name,rotation] of [
  ['Bed','Bed',Math.PI/2],['Dresser','Dresser',0],['Cylinder','CeilingLamp',0],['Book','Book',0]
]) normalize(baked(source.getObjectByName(sourceName)),name,rotation);
const workstation=new THREE.Group();
for(const name of ['Desk','DeskChair','PC','Monitor','Keyboard','Mousepad','Cube']) workstation.add(...baked(source.getObjectByName(name)).children);
normalize(workstation,'Workstation');
const architecture=baked(source.getObjectByName('Bedroom'));
const select=(names,predicate=()=>true)=>{
  const result=new THREE.Group();
  architecture.traverse(mesh=>{
    if(!mesh.isMesh || !names.includes(mesh.material.name)) return;
    const input=mesh.geometry.toNonIndexed(), positions=input.getAttribute('position');
    const selected=[];
    for(let i=0;i<positions.count;i+=3) {
      const points=[0,1,2].map(k=>new THREE.Vector3().fromBufferAttribute(positions,i+k));
      if(predicate(points)) selected.push(i,i+1,i+2);
    }
    if(selected.length) {
      const geometry=new THREE.BufferGeometry();
      for(const key of ['position','normal','uv']) {
        const attribute=input.getAttribute(key); if(!attribute) continue;
        const values=[];
        for(const index of selected) for(let axis=0;axis<attribute.itemSize;axis++) values.push(attribute.array[index*attribute.itemSize+axis]);
        geometry.setAttribute(key,new THREE.Float32BufferAttribute(values,attribute.itemSize));
      }
      result.add(new THREE.Mesh(geometry,mesh.material));
    }
    input.dispose();
  });
  return result;
};
const inBox=(min,max)=>(points)=>points.every(p=>p.x>=min[0] && p.x<=max[0] && p.y>=min[1] && p.y<=max[1] && p.z>=min[2] && p.z<=max[2]);
normalize(select(['Floor','Planks']),'Floorboards');
normalize(select(['Door','DoorHandle']),'DoorLeaf',Math.PI);
normalize(select(['Baseboard'],inBox([-238,0,215],[-114,215,235])),'DoorFrame',Math.PI);
const switchAsset=select(['LightSwitch'],inBox([-280,100,215],[-245,135,235]));
const outletAsset=select(['LightSwitch','Hole'],inBox([-280,20,-235],[-245,55,-215]));
if(!switchAsset.children.length || !outletAsset.children.length) throw new Error('Reference fixture extraction did not find the expected source geometry');
normalize(switchAsset,'LightSwitch',Math.PI);
normalize(outletAsset,'Outlet');
// Retain every original material, including architecture materials absent from standalone props.
const swatches=new THREE.Group(); swatches.name='Original_materials'; library.add(swatches);
const materials=new Map();
source.traverse(o=>{if(o.isMesh) for(const m of Array.isArray(o.material)?o.material:[o.material]) materials.set(m.name,m);});
for(const m of materials.values()) swatches.add(new THREE.Mesh(new THREE.BoxGeometry(0.01,0.01,0.01),m));
globalThis.FileReader=class {readAsArrayBuffer(blob){blob.arrayBuffer().then(result=>{this.result=result;this.onloadend?.();});}};
const glb=await new GLTFExporter().parseAsync(library,{binary:true});
await mkdir(dirname(output),{recursive:true}); await writeFile(output,Buffer.from(glb));
for(const asset of library.children.filter(a=>a.name!=='Original_materials')) {
  console.log(asset.name, new THREE.Box3().setFromObject(asset).getSize(new THREE.Vector3()).toArray().map(n=>+n.toFixed(2)));
}
console.log(`Extracted ${materials.size} original materials; library ${(glb.byteLength/1024).toFixed(1)} KiB`);
