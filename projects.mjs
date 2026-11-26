export const MAX_PROJECT_BYTES=2000000;
const ALLOWED=new Set(['draft','duel','tactics']);
export function isProject(p){
  if(!p||typeof p!=='object'||p.app!=='dota-lab'||p.schema!==2||!ALLOWED.has(p.type)||p.map!=='7.07b1')return false;
  if(!p.state||typeof p.state!=='object'||Array.isArray(p.state)||typeof p.title!=='string'||p.title.length>70)return false;
  try{return new TextEncoder().encode(JSON.stringify(p)).length<=MAX_PROJECT_BYTES;}catch{return false;}
}
export function packProject(p){if(!isProject(p))throw new Error('Invalid project');return '#project='+encodeURIComponent(JSON.stringify(p));}
export function unpackProject(hash){
  if(typeof hash!=='string'||!hash.startsWith('#project='))return null;
  if(hash.length>MAX_PROJECT_BYTES*3)throw new Error('Project too large');
  const p=JSON.parse(decodeURIComponent(hash.slice(9)));
  if(!isProject(p))throw new Error('Unsupported project');
  return p;
}
