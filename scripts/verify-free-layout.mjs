import assert from 'node:assert/strict';
import {build} from 'esbuild';
const bundle=await build({stdin:{contents:`export * from './src/types/house';export * from './src/types/houseFreeLayout';export * from './src/types/houseWalls';export {buildHouse} from './src/generator/HouseBuilder';export {disposeModel} from './src/generator/RoomBuilder';`,resolveDir:process.cwd()},bundle:true,write:false,platform:'node',format:'esm',logLevel:'silent'});
const {createHouse,randomHouse,resizeRoom,moveRoom,expandLivingBesideBathroom,roomBounds,validateHouse,enableFreeLayout,freeLayoutWarnings,houseWalls,buildHouse,disposeModel}=await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
for(const two of [false,true]){
  const base=resizeRoom(createHouse(two),0,'1:1','width',200),before=structuredClone(base),bedroom=roomBounds(base,0,'0:1');
  const free=validateHouse(enableFreeLayout(base,0));
  assert.deepEqual(freeLayoutWarnings(free,0),[]);
  const expanded=expandLivingBesideBathroom(base,0,'1:1');
  assert.deepEqual(base,before,'Atomic layout action must not mutate previous design');
  assert.deepEqual(roomBounds(expanded,0,'0:1'),bedroom,'Bedroom stays unchanged');
  assert.equal(roomBounds(expanded,0,'1:1').maxX,base.width/2,'Bathroom touches right envelope');
  assert.equal(roomBounds(expanded,0,'1:0').maxX+base.wallThickness,roomBounds(expanded,0,'1:1').minX);
  assert.ok(roomBounds(expanded,0,'1:0').width>roomBounds(base,0,'1:0').width,'Living room grows beyond its former cell');
  assert.deepEqual(freeLayoutWarnings(expanded,0),[]);
  assert.deepEqual(validateHouse(JSON.parse(JSON.stringify(expanded))),expanded,'Save/load preserves positions, sizes and topology');
  const walls=houseWalls(expanded,0),bathDoors=walls.filter(s=>s.rooms.includes('1:1') && ['door','passage'].includes(s.config.kind));
  assert.equal(bathDoors.length,1);assert.ok(bathDoors[0].rooms.includes('1:0'),'Single bathroom entrance leads to the expanded living room');
  const moved=moveRoom(base,0,'1:1',base.width/2-200,roomBounds(base,0,'1:1').minZ,false);
  const afterMove=expandLivingBesideBathroom(moved,0,'1:1');assert.deepEqual(roomBounds(afterMove,0,'1:0'),roomBounds(expanded,0,'1:0'));
  assert.throws(()=>moveRoom(base,0,'1:1',bedroom.minX,bedroom.minZ,false),/sobrepõem/);
  assert.throws(()=>moveRoom(base,0,'1:1',5000,0,false),/Posição|limites/);
  if(two){assert.deepEqual(expanded.floors[1],base.floors[1]);assert.throws(()=>moveRoom(base,0,base.stairs.cellId,0,0),/escada/);}
  const model=buildHouse(expanded);model.traverse(o=>{if(o.isMesh)assert.ok(o.geometry.attributes.position.array.every(Number.isFinite));});disposeModel(model);
}
let seed=881;const rng=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);
for(let n=0;n<100;n++){
  let c=randomHouse(rng);for(let i=0;i<c.floors.length;i++)c=validateHouse(enableFreeLayout(c,i));
  for(let i=0;i<c.floors.length;i++)assert.deepEqual(freeLayoutWarnings(c,i),[],'Generated layouts remain connected after conversion');
  assert.deepEqual(validateHouse(c),c,'Free wall topology is stable');
}
let draft=enableFreeLayout(resizeRoom(createHouse(false),0,'1:1','width',200),0);
draft=resizeRoom(draft,0,'1:1','depth',200);
draft=moveRoom(draft,0,'1:1',draft.width/2-200,roomBounds(draft,0,'1:1').minZ+20,false);
assert.ok(freeLayoutWarnings(draft,0).some(w=>w.includes('sem acesso')),'Disconnected drag drafts warn instead of inventing a floating doorway');
const malformed=structuredClone(draft);malformed.floors[0].freeWalls.bad={kind:'door',width:NaN,height:210,sill:20,open:false};
assert.throws(()=>validateHouse(malformed),/planta livre/);
console.log('Free layout passed: bathroom moved right, living room fills released strip, bedroom/other floor preserved, physical single-door bathroom, collisions/bounds, stable presets and metric geometry.');
