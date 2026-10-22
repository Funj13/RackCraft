import {HouseConfig,HouseSide,HouseWall,roomBounds,roomWallKey} from './house';
import {freeWallSegments} from './houseFreeLayout';
export interface WallSegment {key:string;axis:'h'|'v';line:number;start:number;end:number;opening:number;config:HouseWall;rooms:string[];sides?:Record<string,HouseSide>}
export function houseWalls(c:HouseConfig,index:number):WallSegment[]{
  if(c.floors[index].layout==='free')return freeWallSegments(c,index);
  const floor=c.floors[index],t=c.wallThickness,segments:WallSegment[]=[];
  for(const room of floor.rooms){
    const b=roomBounds(c,index,room.id),[r,col]=room.id.split(':').map(Number);
    for(const side of ['back','front','left','right'] as HouseSide[]){
      const key=roomWallKey(r,col,side),axis=side==='back'||side==='front'?'h':'v';
      const line=side==='back'?b.minZ-t/2:side==='front'?b.maxZ+t/2:side==='left'?b.minX-t/2:b.maxX+t/2;
      const start=(axis==='h'?b.minX:b.minZ)-t,end=(axis==='h'?b.maxX:b.maxZ)+t;
      const existing=segments.find(s=>s.key===key && Math.abs(s.line-line)<0.01);
      if(existing){
        existing.opening=(Math.max(existing.start,start)+Math.min(existing.end,end))/2;
        existing.start=Math.min(existing.start,start);existing.end=Math.max(existing.end,end);existing.rooms.push(room.id);
      }else segments.push({key,axis,line,start,end,opening:(start+end)/2,config:{...floor.walls[key]},rooms:[room.id]});
    }
  }
  for(const segment of segments){
    segment.config.width=Math.min(segment.config.width,segment.end-segment.start-30);
  }
  return segments;
}
export function roomOpeningOffset(c:HouseConfig,index:number,id:string,side:HouseSide){
  const [r,col]=id.split(':').map(Number),key=roomWallKey(r,col,side),b=roomBounds(c,index,id);
  const segment=houseWalls(c,index).find(s=>(s.sides?s.sides[id]===side:s.key===key) && s.rooms.includes(id))!;
  return segment.opening-(segment.axis==='h'?b.centerX:b.centerZ);
}
