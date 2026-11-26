// Exact-map GEP/GFP: one 30% PRD stream per item copy; highest proc wins.
// Independent long-run approximation; not the next attack's conditional PRD chance.
export const ITEM_CRITICAL=Object.freeze({buriza:{chance:.3,multiplier:2.25},crystalys:{chance:.3,multiplier:1.6},khanda:{chance:.3,multiplier:1.6},'silver-edge':{chance:.3,multiplier:1.6}});
export function criticalProfile(slots=[],damage=0,damageMin=damage,damageMax=damage){
 const sources=slots.flatMap(id=>ITEM_CRITICAL[id]?[{id,...ITEM_CRITICAL[id]}]:[]);
 const tiers=[...new Set(sources.map(s=>s.multiplier))].sort((a,b)=>b-a);
 let remaining=1;
 const outcomes=tiers.map(multiplier=>{
  const group=sources.filter(s=>s.multiplier===multiplier);
  const proc=1-group.reduce((p,s)=>p*(1-s.chance),1);
  const probability=remaining*proc;remaining*=1-proc;
  return {multiplier,probability,damage:damage*multiplier,min:damageMin*multiplier,max:damageMax*multiplier};
 });
 const chance=1-remaining;
 const critMultiplier=chance?outcomes.reduce((s,o)=>s+o.probability*o.multiplier,0)/chance:1;
 const expectedMultiplier=remaining+outcomes.reduce((s,o)=>s+o.probability*o.multiplier,0);
 return {sources,outcomes,critChance:chance*100,critMultiplier,critDamage:chance?damage*critMultiplier:0,expectedHit:damage*expectedMultiplier,expectedMultiplier,normalChance:remaining*100};
}
