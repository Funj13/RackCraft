import assert from 'node:assert/strict';
import { readFile,writeFile } from 'node:fs/promises';
import { build } from 'esbuild';

const bundled=await build({stdin:{contents:`export * from './src/types/house';
  export * from './src/generator/BedroomLibrary';
  export * from './src/types/houseWalls';
  export * from './src/generator/FurnitureBuilder';
  export { buildHouse } from './src/generator/HouseBuilder';
  export { disposeModel } from './src/generator/RoomBuilder';
  export { exportToGLB } from './src/io/GLBExporter';
  export { Box3, Vector3 } from 'three';`,resolveDir:process.cwd()},bundle:true,write:false,platform:'node',format:'esm',logLevel:'silent'});
const {createHouse,validateHouse,randomHouse,randomizeRoomSizes,resizeRoomAxis,resizeRoom,expandLivingBesideBathroom,roomBounds,cellBounds,cellDimensions,roomWallKey,houseWalls,buildHouse,
  parseBedroomLibrary,referenceAsset,disposeModel,exportToGLB,Box3,Vector3,overlaps}=
  await import(`data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString('base64')}`);
const bytes=await readFile('src/assets/bedroom-library.glb');
const library=await parseBedroomLibrary(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength));
assert.equal(library.materials.size,38);
assert.ok(Math.abs(library.materials.get('Wall').color.r-0.14915268123149872)<1e-7);
assert.ok(Math.abs(library.materials.get('Door').color.r-0.732478141784668)<1e-7);
assert.equal(library.materials.get('Glass').transmission,1);
assert.equal(library.materials.get('Wall').specularIntensity,0);
for(const name of ['Bed','Workstation','DoorLeaf','DoorFrame','Floorboards','Outlet','LightSwitch'])assert.ok(library.templates.has(name));

const config=validateHouse(createHouse(true));
const full=buildHouse(config,{},library);full.updateMatrixWorld(true);
const names=[];full.traverse(o=>names.push(o.name));
for(const name of ['Cama','Escrivaninha_com_computador','Tomada_original','Interruptor_original','Rodape_moldado','Moldura_porta_original','Revestimento','Chuveiro','Privada','Pia','Geladeira','Forno','Mesa_e_cadeiras','Sofa','TV_e_rack']) {
  assert.ok(names.includes(name),`Missing requested furniture/detail ${name}`);
}
const sourceWall=library.materials.get('Wall');
const wallColors=[];full.traverse(o=>{if(o.isMesh && o.material?.name==='Wall')wallColors.push(o.material.color.toArray());});
assert.ok(wallColors.length>0);assert.deepEqual(wallColors[0],sourceWall.color.toArray());
const reports=full.userData.furnitureReports;
const validateLayout=(house,asset)=>{
  asset.updateMatrixWorld(true);
  for(const [id,report]of Object.entries(asset.userData.furnitureReports)) {
    const [floor,roomId]=id.split('/'),bounds=roomBounds(house,+floor,roomId),w=bounds.width,d=bounds.depth;
    report.placed.forEach((item,index)=>{
      assert.ok(item.bounds.minX>=-w/2 && item.bounds.maxX<=w/2 && item.bounds.minZ>=-d/2 && item.bounds.maxZ<=d/2,`Out-of-room furniture ${id}/${item.name}`);
      assert.ok(!report.circulation.some(route=>overlaps(item.bounds,route)),`Blocked doorway ${id}/${item.name}`);
      assert.ok(!report.placed.slice(index+1).some(other=>overlaps(item.bounds,other.bounds)),`Overlapping furniture ${id}/${item.name}`);
    });
    const level=asset.children.find(o=>o.name.startsWith(`Pavimento_${floor}_`));
    const room=level.children.find(o=>o.userData.roomId===roomId);
    const furniture=room.getObjectByName('Mobilia');
    for(const item of furniture.children) {
      const b=new Box3().setFromObject(item);
      assert.ok(b.min.x>=bounds.minX-0.01 && b.max.x<=bounds.maxX+0.01 && b.min.z>=bounds.minZ-0.01 && b.max.z<=bounds.maxZ+0.01,`Actual mesh outside room: ${item.name}`);
    }
  }
};
validateLayout(config,full);
// Individual dimensions do not resize another room, a grid axis or the other floor.
for(const twoFloors of [false,true]){
  const base=createHouse(twoFloors),old=structuredClone(base),bedroom=roomBounds(base,0,'0:1');
  let small=resizeRoom(base,0,'1:1','width',200);
  small=resizeRoom(small,0,'1:1','depth',240);
  assert.deepEqual(base,old,'Resize must not mutate the previous preset');
  assert.deepEqual(roomBounds(small,0,'0:1'),bedroom,'Bedroom remains identical');
  assert.deepEqual(small.columnWidths,base.columnWidths);assert.deepEqual(small.rowDepths,base.rowDepths);
  assert.deepEqual(small.floors[0].rooms.filter(r=>r.id!=='1:1'),base.floors[0].rooms.filter(r=>r.id!=='1:1'));
  if(twoFloors)assert.deepEqual(small.floors[1],base.floors[1],'Other floor is unchanged');
  const b=roomBounds(small,0,'1:1');assert.equal(b.width,200);assert.equal(b.depth,240);
  const free=expandLivingBesideBathroom(resizeRoom(base,0,'1:1','width',200),0,'1:1');
  const freeAsset=buildHouse(free,{},library);validateLayout(free,freeAsset);disposeModel(freeAsset);
  const asset=buildHouse(small,{},library);validateLayout(small,asset);
  const bathroom=asset.children[0].children.find(o=>o.userData.roomId==='1:1');
  const floorMesh=bathroom.getObjectByName('Acabamento_piso');
  assert.equal(floorMesh.geometry.parameters.width,200);assert.equal(floorMesh.geometry.parameters.depth,240);
  assert.deepEqual(validateHouse(JSON.parse(JSON.stringify(small))),small,'Individual dimensions survive save/load');
  disposeModel(asset);
  for(const segment of houseWalls(small,0).filter(s=>s.config.kind==='door')){
    for(const id of segment.rooms){const b=roomBounds(small,0,id);
      const min=segment.axis==='h'?b.minX:b.minZ,max=segment.axis==='h'?b.maxX:b.maxZ;
      assert.ok(segment.opening-segment.config.width/2>=min-0.01 && segment.opening+segment.config.width/2<=max+0.01,'Door fits both rooms after resizing');
    }
  }
  if(twoFloors){
    const upper=resizeRoom(resizeRoom(base,1,'1:1','width',200),1,'1:1','depth',240);
    assert.deepEqual(upper.floors[0],base.floors[0]);
    const upperAsset=buildHouse(upper,{},library);validateLayout(upper,upperAsset);disposeModel(upperAsset);
    assert.throws(()=>resizeRoom(base,0,base.stairs.cellId,'width',200),/escada/);
  }
  assert.throws(()=>resizeRoom(base,0,'1:1','width',5000),/caber/);
  assert.throws(()=>resizeRoom(base,0,'1:1','width',0),/caber/);
}
assert.equal(reports[`0/${config.stairs.cellId}`],undefined,'Stair cell is never furnished');
assert.equal(reports[`1/${config.stairs.cellId}`],undefined);
const repeat=buildHouse(config,{},library);
assert.deepEqual(repeat.userData.furnitureReports,reports,'Furniture must be reproducible after preset reload/export');
const resized=validateHouse(resizeRoomAxis(config,'1:0','width',600));
assert.equal(resized.columnWidths[0],600);
assert.equal(resized.columnWidths[1],config.columnWidths[1]);
assert.equal(cellDimensions(resized,'1:0').width,600);
assert.equal(cellBounds(resized,'0:0').maxX+resized.wallThickness,cellBounds(resized,'0:1').minX);
assert.equal(roomWallKey(0,0,'right'),roomWallKey(0,1,'left'));
const resizedModel=buildHouse(resized,{},library);resizedModel.updateMatrixWorld(true);
const divider=resizedModel.children[0].getObjectByName('Parede_v:0:1');
assert.ok(Math.abs(divider.position.x-cellBounds(resized,'0:0').maxX-resized.wallThickness/2)<1e-6);
const focused=buildHouse(config,{floor:1,room:'0:0',cutaway:true},library);
assert.equal(focused.children.length,1);assert.equal(focused.children[0].children.filter(o=>o.userData.roomId!==undefined).length,1);
assert.equal(focused.getObjectByName('Cobertura'),undefined);assert.equal(focused.getObjectByName('Escada_entre_pavimentos'),undefined);
assert.deepEqual(Object.keys(focused.userData.furnitureReports),['1/0:0']);
const rerolled=validateHouse(randomizeRoomSizes(config,()=>0.3));
assert.equal(rerolled.floors[0].rooms[0].name,config.floors[0].rooms[0].name);
const bad=structuredClone(config);bad.columnWidths[0]=-20;assert.throws(()=>validateHouse(bad));
const old=structuredClone(config);delete old.columnWidths;delete old.rowDepths;delete old.style;delete old.details;
for(const f of old.floors)for(const r of f.rooms){delete r.type;delete r.furnished;delete r.furnitureSeed;delete r.finish;}
// Original v3 dimensions were uniform; choose a tall enough footprint for its staircase.
old.depth=900;
const migrated=validateHouse(old);assert.equal(migrated.style,'custom');assert.equal(migrated.floors[0].rooms[0].furnished,false);
assert.equal(migrated.details,false);

let state=15231, varied=0, placed=0;
const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
for(let n=0;n<30;n++) {
  const house=validateHouse(randomHouse(random));
  if(new Set(house.columnWidths.map(Math.round)).size>1 || new Set(house.rowDepths.map(Math.round)).size>1)varied++;
  const asset=buildHouse(house,{cutaway:true},library);
  validateLayout(house,asset);placed+=Object.values(asset.userData.furnitureReports).reduce((sum,r)=>sum+r.placed.length,0);
  disposeModel(asset);
}
assert.ok(varied>=25,'Room sizes should differ within generated houses');
assert.ok(placed>=100);
let templateDisposed=false;
library.templates.get('Bed').traverse(o=>{if(o.isMesh)o.geometry.addEventListener('dispose',()=>{templateDisposed=true;});});
const copy=referenceAsset(library,'Bed');disposeModel(copy);assert.equal(templateDisposed,false,'Instances must own their geometry');

globalThis.FileReader=class{readAsArrayBuffer(blob){blob.arrayBuffer().then(result=>{this.result=result;this.onloadend?.();});}};
let blob;const original=URL.createObjectURL;URL.createObjectURL=value=>{blob=value;return original(value);};
globalThis.document={createElement:()=>({click(){}})};
await exportToGLB(full,'Casa_Mobiliada.glb');
const binary=Buffer.from(await blob.arrayBuffer());
const gltf=JSON.parse(binary.toString('utf8',20,20+binary.readUInt32LE(12)));
assert.ok(gltf.materials.some(m=>m.name==='Wall' && Math.abs(m.pbrMetallicRoughness.baseColorFactor[0]-0.14915268123149872)<1e-7));
assert.ok(gltf.nodes.some(n=>n.name==='Cama'));
assert.ok(gltf.nodes.some(n=>n.name==='Tomada_original'));
const root=gltf.nodes.find(n=>n.name===config.name);
assert.deepEqual(root.scale??[root.matrix[0],root.matrix[5],root.matrix[10]],[0.01,0.01,0.01]);
if(process.argv[2])await writeFile(process.argv[2],binary);
console.log('Default furniture:',JSON.stringify(Object.fromEntries(Object.entries(reports).map(([id,r])=>[id,{placed:r.placed.map(i=>i.name),omitted:r.omitted}]))));
disposeModel(full);disposeModel(repeat);disposeModel(resizedModel);disposeModel(focused);assert.equal(templateDisposed,false);
console.log(`Furnished house checks passed: 38 source materials, original geometry, variable room sizes, legacy presets, deterministic layouts, ${placed} furniture sets across 30 collision-checked houses, metric GLB.`);
