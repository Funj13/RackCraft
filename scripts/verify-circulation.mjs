import assert from 'node:assert/strict';
import {build} from 'esbuild';
const bundle=await build({stdin:{contents:`export * from './src/types/house';export * from './src/types/houseCirculation';`,resolveDir:process.cwd()},bundle:true,write:false,platform:'node',format:'esm',logLevel:'silent'});
const {createHouse,randomHouse,fitHouse,validateHouse,planCirculation,floorConnections,roomEdges,isOpening,residentialFloor}=await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
function check(c){
  c.floors.forEach((floor,i)=>{
    const edges=floorConnections(c,i);
    const ordinary=floor.rooms.filter(r=>r.type!=='bathroom');
    for(const edge of edges){
      const a=floor.rooms.find(r=>r.id===edge.a),b=floor.rooms.find(r=>r.id===edge.b);
      if((a.type==='hall') !== (b.type==='hall'))assert.equal(floor.walls[edge.key].kind,'door','Rooms retain partition walls toward the corridor');
    }
    for(const room of floor.rooms.filter(r=>r.type==='bathroom')){
      assert.equal(roomEdges(room.id).filter(e=>isOpening(floor.walls[e.key])).length,1,'Bathroom has exactly one entrance');
      if(floor.rooms.length>1)assert.equal(edges.filter(e=>e.a===room.id||e.b===room.id).length,1,'Bathroom is a leaf, not an external entrance');
    }
    const seen=new Set(ordinary.slice(0,1).map(r=>r.id));
    for(let pass=0;pass<ordinary.length;pass++)for(const e of edges){
      if(!ordinary.some(r=>r.id===e.a)||!ordinary.some(r=>r.id===e.b))continue;
      if(seen.has(e.a))seen.add(e.b);if(seen.has(e.b))seen.add(e.a);
    }
    assert.equal(seen.size,ordinary.length,'Every non-bathroom remains reachable without crossing a bathroom');
  });
}
let seed=7123;const rng=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);
for(let i=0;i<250;i++)check(validateHouse(randomHouse(rng)));
const legacy=createHouse(false);Object.assign(legacy,{columns:3,rows:3,width:1270,depth:1330});legacy.floors[0].rooms=[];
const legacyPlan=fitHouse(legacy);residentialFloor(legacyPlan,0);planCirculation(legacyPlan,true);
legacyPlan.floors[0].walls['v:0:1'].kind='passage';
const repaired=validateHouse(legacyPlan);check(repaired);
assert.equal(repaired.floors[0].walls['v:0:1'].kind,'door','Old kitchen/corridor opening becomes a doorway');
assert.equal(legacyPlan.floors[0].walls['v:0:1'].kind,'passage','Migration preserves original input');
assert.deepEqual(validateHouse(repaired),repaired,'Normalization is stable');
const hub=createHouse(false);hub.rows=3;hub.floors[0].rooms=[];hub.floors[0].walls={};
const broken=fitHouse(hub);broken.floors[0].rooms.find(r=>r.id==='1:0').type='bathroom';
for(const e of roomEdges('1:0'))broken.floors[0].walls[e.key].kind='door';
const before=structuredClone(broken);check(validateHouse(broken));assert.deepEqual(broken,before,'Validation does not mutate loaded presets');
const barrier=structuredClone(broken);barrier.floors[0].rooms.find(r=>r.id==='1:1').type='bathroom';
assert.throws(()=>validateHouse(barrier),/separa os outros/);
for(let columns=1;columns<=4;columns++)for(let rows=1;rows<=4;rows++){
  const c=createHouse(false);Object.assign(c,{columns,rows,width:1600,depth:1600});c.floors[0].rooms=[];
  const fitted=fitHouse(c);residentialFloor(fitted,0);check(planCirculation(fitted,true));
}
console.log('Circulation passed: 250 random houses, all grid sizes, legacy bathroom hub repaired, disconnected bathroom barriers rejected.');
