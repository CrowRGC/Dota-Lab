import {TERRAIN} from './vision-data.mjs';
export const WORLD_UNITS_PER_DIAGRAM=16.384;
export const OBSERVER_RANGE=1600/WORLD_UNITS_PER_DIAGRAM;
export const SENTRY_DETECTION_RANGE=1050/WORLD_UNITS_PER_DIAGRAM;
const bounded=(n,min,max)=>Math.max(min,Math.min(max,n));
/** Terrain-aware planning approximation, not Warcraft III's visibility engine. */
export function makeVisionModel(terrain=TERRAIN){
 const {size,levels}=terrain;
 const vertexSize=terrain.vertexSize||null;
 const stride=vertexSize||size;
 const coord=(n)=>vertexSize?bounded(Math.round(n/1000*(vertexSize-1)),0,vertexSize-1):bounded(Math.floor(n/1000*size),0,size-1);
 const height=(x,y)=>levels[coord(y)*stride+coord(x)];
 const trees=(terrain.trees||[]).map(t=>Array.isArray(t)?{x:t[0],y:t[1],baseLevel:t[2]??height(t[0],t[1])}:t);
 const pillars=terrain.pillars||[];
 // Retain the tree's elevation, rather than flattening every tree into an infinite wall.
 // Tree footprint and ray resolution remain approximate; no extra sight range on pillars.
 const grid=512,treeLevels=new Float32Array(grid*grid).fill(-Infinity);
 for(const t of trees){
  const radius=3;
  const treeLevel=Number.isFinite(t.baseLevel)?t.baseLevel:height(t.x,t.y);
  for(let gy=Math.max(0,Math.floor((t.y-radius)/1000*grid));gy<=Math.min(grid-1,Math.ceil((t.y+radius)/1000*grid));gy++){
   for(let gx=Math.max(0,Math.floor((t.x-radius)/1000*grid));gx<=Math.min(grid-1,Math.ceil((t.x+radius)/1000*grid));gx++){
    if(Math.hypot((gx+.5)*1000/grid-t.x,(gy+.5)*1000/grid-t.y)<=radius)treeLevels[gy*grid+gx]=Math.max(treeLevels[gy*grid+gx],treeLevel);
   }
  }
 }
 const treeLevelAt=(x,y)=>treeLevels[bounded(Math.floor(y/1000*grid),0,grid-1)*grid+bounded(Math.floor(x/1000*grid),0,grid-1)];
 const tree=(x,y,elevation=height(x,y))=>treeLevelAt(x,y)>=elevation;
 const pillarAt=(x,y)=>pillars.find(p=>x>=p.bounds.minX-1&&x<=p.bounds.maxX+1&&y>=p.bounds.minY-1&&y<=p.bounds.maxY+1&&height(x,y)===p.elevation)||null;
 function sourceInfo(x,y){const elevation=height(x,y);return {elevation,blockedByTree:tree(x,y,elevation),pillar:pillarAt(x,y)};}
 function snapWard(x,y,{enabled=true,tolerance=22}={}){
  if(!enabled)return {x,y,pillar:null};
  const candidate=pillars.map(p=>({p,distance:Math.hypot(p.x-x,p.y-y)})).filter(({distance})=>distance<=tolerance).sort((a,b)=>a.distance-b.distance)[0]?.p;
  // Snapping moves the actual marker to the plateau; it never silently raises a ground ward.
  return candidate?{x:candidate.x,y:candidate.y,pillar:candidate}:{x,y,pillar:null};
 }
 const cache=new Map();
 function polygon(x,y,radius=OBSERVER_RANGE){
  const key=`${x},${y},${radius}`;
  if(cache.has(key))return cache.get(key);
  const elevation=height(x,y),points=[];
  if(!tree(x,y,elevation)){
   for(let i=0;i<360;i++){
    const angle=i*Math.PI*2/360,dx=Math.cos(angle),dy=Math.sin(angle);let last={x,y};
    for(let d=1;d<=radius+1;d++){
     const px=x+dx*Math.min(d,radius),py=y+dy*Math.min(d,radius);
     if(px<0||px>1000||py<0||py>1000)break;
     last={x:px,y:py};
     if(height(px,py)>elevation||tree(px,py,elevation)||d>=radius)break;
    }
    points.push(last);
   }
  }
  if(cache.size>=160)cache.clear();cache.set(key,points);return points;
 }
 return {polygon,height,tree,sourceInfo,snapWard,pillars};
}
export const visionModel=makeVisionModel();
