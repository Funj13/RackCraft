import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { writeFile } from 'node:fs/promises';

const bundle=await build({stdin:{contents:`export * from './src/types/house';
  export { defaultRoom } from './src/types/room';
  export { buildHouse } from './src/generator/HouseBuilder';
  export { disposeModel } from './src/generator/RoomBuilder';
  export { exportToGLB } from './src/io/GLBExporter';
  export { Box3, Vector3, Raycaster } from 'three';`,resolveDir:process.cwd()},
  bundle:true,write:false,platform:'node',format:'esm',logLevel:'silent'});
const { createHouse,validateHouse,fitHouse,randomHouse,roomToHouse,defaultRoom,setFloorCount,roomWallKey,
  cellBounds,floorElevation,buildHouse,disposeModel,exportToGLB,Box3,Vector3,Raycaster }=
  await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);

const config=validateHouse(createHouse(true));
assert.equal(config.floors.length,2);
assert.equal(config.floors[0].rooms.length,4);
assert.equal(floorElevation(config,1),298);
assert.equal(roomWallKey(0,0,'right'),roomWallKey(0,1,'left'));
assert.equal(roomWallKey(0,0,'front'),roomWallKey(1,0,'back'));
const full=buildHouse(config); full.updateMatrixWorld(true);
const levels=full.children.filter(o=>o.name.startsWith('Pavimento_'));
assert.equal(levels.length,2);
assert.equal(levels[1].position.y,298);
for(const floor of levels) assert.equal(floor.children.filter(o=>o.name.startsWith('Parede_')).length,12,'Shared walls are built once');
assert.ok(full.getObjectByName('Telhado_duas_aguas'));
assert.ok(full.getObjectByName('Escada_entre_pavimentos'));
const stairCell=cellBounds(config,config.stairs.cellId);
const upperSlabs=levels[1].children.filter(o=>o.name.startsWith('Laje_'));
const covers=(o,x,z)=>{const b=new Box3().setFromObject(o);return x>b.min.x+0.01 && x<b.max.x-0.01 && z>b.min.z+0.01 && z<b.max.z-0.01;};
assert.ok(!upperSlabs.some(o=>covers(o,stairCell.centerX,stairCell.minZ+50)),'Stairwell must remain open');
assert.ok(upperSlabs.some(o=>covers(o,stairCell.centerX,stairCell.maxZ-50)),'Upper landing has a floor');
const finalStep=full.getObjectByName('Escada_entre_pavimentos').children.filter(o=>o.name.startsWith('Degrau_B_')).at(-1);
assert.ok(Math.abs(new Box3().setFromObject(finalStep).max.y-floorElevation(config,1))<0.001,'Stair reaches upper floor');

const exterior=levels[0].getObjectByName(`Parede_h:${config.rows}:0`);
const from=exterior.getWorldPosition(new Vector3()).add(new Vector3(0,100,100));
assert.ok(new Raycaster(from,new Vector3(0,0,-1)).intersectObject(exterior,true).some(h=>h.object.name==='Folha_porta'),'Closed door fills the opening');
const openConfig=structuredClone(config); openConfig.floors[0].walls[`h:${config.rows}:0`].open=true;
const open=buildHouse(openConfig); open.updateMatrixWorld(true);
assert.equal(new Raycaster(from,new Vector3(0,0,-1)).intersectObject(open.children[0].getObjectByName(`Parede_h:${config.rows}:0`),true).length,0,'Open door leaves a traversable opening');
const cutaway=buildHouse(config,{cutaway:true,floor:1});
assert.equal(cutaway.children.filter(o=>o.name.startsWith('Pavimento_')).length,1);
assert.equal(cutaway.getObjectByName('Cobertura'),undefined);
assert.equal(cutaway.getObjectByName(`Parede_h:${config.rows}:0`),undefined);
assert.ok(full.getObjectByName(`Parede_h:${config.rows}:0`),'Preview does not mutate export geometry');
const single=buildHouse(setFloorCount(config,1));
assert.equal(single.getObjectByName('Escada_entre_pavimentos'),undefined);
assert.equal(single.children.filter(o=>o.name.startsWith('Pavimento_')).length,1);
const noStairs=buildHouse({...config,stairs:{...config.stairs,enabled:false}});
assert.ok(noStairs.children[1].getObjectByName('Laje'));
assert.equal(noStairs.getObjectByName('Escada_entre_pavimentos'),undefined);

validateHouse(JSON.parse(JSON.stringify(config)));
const converted=validateHouse(roomToHouse(defaultRoom));
assert.equal(converted.columns,1); assert.equal(converted.floors.length,1);
assert.equal(converted.floors[0].walls['h:1:0'].kind,'door');
assert.equal(converted.floors[0].walls['h:0:0'].kind,'window');
assert.throws(()=>validateHouse({...config,floors:[...config.floors,config.floors[0]]}));
assert.throws(()=>validateHouse({...config,columns:10000}));
assert.throws(()=>validateHouse({...config,width:10}));
assert.throws(()=>validateHouse({...config,roof:{...config.roof,color:'invalid'}}));
const resized=validateHouse(fitHouse({...config,width:200,depth:200,rows:4,columns:4}));
assert.equal(resized.floors[0].rooms.length,16);
const seeds=new Set();
let state=12345;
const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0; return state/4294967296;};
for(let n=0;n<80;n++) {
  const house=validateHouse(randomHouse(random));
  seeds.add(`${house.floors.length}:${house.columns}:${house.rows}:${house.roof.type}`);
  if(n<8) {
    const asset=buildHouse(house); asset.updateMatrixWorld(true);
    asset.traverse(o=>{if(o.isMesh) { const b=new Box3().setFromObject(o); assert.ok([...b.min.toArray(),...b.max.toArray()].every(Number.isFinite)); }});
    disposeModel(asset);
  }
}
assert.ok(seeds.size>=8,'Random generation must vary layout, storeys and roof');

globalThis.FileReader=class {readAsArrayBuffer(blob){blob.arrayBuffer().then(result=>{this.result=result;this.onloadend?.();});}};
let exportedBlob,filename;
const originalCreate=URL.createObjectURL;
URL.createObjectURL=blob=>{exportedBlob=blob;return originalCreate(blob);};
globalThis.document={createElement:()=>({click(){filename=this.download;}})};
await exportToGLB(full,'Casa_Dois_Andares.glb');
assert.equal(filename,'Casa_Dois_Andares.glb');
const binary=Buffer.from(await exportedBlob.arrayBuffer());
assert.equal(binary.toString('ascii',0,4),'glTF');
const gltf=JSON.parse(binary.toString('utf8',20,20+binary.readUInt32LE(12)));
const root=gltf.nodes.find(n=>n.name===config.name);
assert.deepEqual(root.scale ?? [root.matrix[0],root.matrix[5],root.matrix[10]],[0.01,0.01,0.01]);
assert.ok(gltf.nodes.some(n=>n.name.startsWith('Pavimento_1_')));
assert.ok(gltf.nodes.some(n=>n.name==='Escada_entre_pavimentos'));
assert.ok(gltf.nodes.some(n=>n.name==='Cobertura'));
assert.deepEqual(full.scale.toArray(),[1,1,1]);
if(process.argv[2]) await writeFile(process.argv[2],binary);
for(const asset of [full,open,cutaway,single,noStairs]) disposeModel(asset);
console.log(`House checks passed: shared walls, connected stairs, slab opening, floor isolation, legacy presets, 80 random houses (${seeds.size} combinations), full metric GLB.`);
