// Exact-map poison items. See data-provenance/ITEM-POISON.txt.
import {magicDamageContext} from './magic-effects.mjs';
export const POISON_ITEMS=Object.freeze({
 'witch-blade':Object.freeze({id:'witch-blade',name:'Witch Blade',intMultiplier:.75,duration:4,cooldown:9}),
 parasma:Object.freeze({id:'parasma',name:'Parasma',intMultiplier:1,duration:4,cooldown:7}),
 'orb-of-venom':Object.freeze({id:'orb-of-venom',name:'Orb of Venom',rawDps:2,duration:2,cooldown:0}),
 'orb-of-corrosion':Object.freeze({id:'orb-of-corrosion',name:'Orb of Corrosion',rawDps:3,duration:3,cooldown:0}),
});
// Compatibility alias for callers that need the magic scenario separately.
export const resolveMagicScenario=(attackerTotals,defenderTotals,options={})=>magicDamageContext(attackerTotals,defenderTotals,[],options);
/** Damage for one ready poison application, not continuous autoattack DPS. */
export function poisonAgainstHero(attackerTotals={},defenderTotals={},slots=[],options={}){
 const ids=Array.isArray(slots)?slots:[];
 const chosen=[];
 if(ids.includes('parasma'))chosen.push(POISON_ITEMS.parasma);
 else if(ids.includes('witch-blade'))chosen.push(POISON_ITEMS['witch-blade']);
 if(ids.includes('orb-of-corrosion'))chosen.push(POISON_ITEMS['orb-of-corrosion']);
 else if(ids.includes('orb-of-venom'))chosen.push(POISON_ITEMS['orb-of-venom']);
 if(!chosen.length)return {active:false,complete:true,effects:[],notes:[],missing:[]};
 const context=magicDamageContext(attackerTotals,defenderTotals,ids,options);
 const notes=[...context.notes,'Poison DPS means damage during an active application, not continuous autoattack DPS. Applications refresh their debuff; copies do not add independent poison stacks.','Dispels, early death, magic immunity, status resistance, hero passives and other temporary buffs are not fully simulated.'];
 if(ids.filter(id=>id==='witch-blade'||id==='parasma').length>1)notes.push('Witch Blade and Parasma copies share their proc cooldown. Parasma takes priority; those poisons do not stack.');
 if(ids.includes('orb-of-venom')&&ids.includes('orb-of-corrosion'))notes.push('Orb of Corrosion suppresses Orb of Venom’s poison ticks; only Corrosion poison is counted.');
 const effects=chosen.map(item=>{
  const rawDps=item.intMultiplier?(context.intelligence===null?null:context.intelligence*item.intMultiplier):item.rawDps;
  const amplifiedDps=rawDps===null||context.spellMultiplier===null?null:rawDps*context.spellMultiplier;
  const dps=!context.complete||rawDps===null?null:rawDps*context.magicMultiplier;
  const effectNotes=[];
  if(item.intMultiplier)effectNotes.push('Four 1-second magical ticks after an eligible ready attack. That proc attack has True Strike. Intelligence damage is snapshotted at application.');
  else effectNotes.push(`One refreshed on-hit poison application over ${item.duration} seconds; reattacking refreshes duration rather than stacking DPS.`);
  if(item.id==='orb-of-corrosion')effectNotes.push('Its armor reduction affects physical attacks separately; it does not increase this magical poison by itself.');
  return {...item,type:'poison',damageType:'magical',complete:context.complete,rawDps,amplifiedDps,dps,totalDamage:dps===null?null:dps*item.duration,rawTotalDamage:rawDps===null?null:rawDps*item.duration,tickDamage:dps,ticks:item.duration,magicResistance:context.baseMagicResistance,effectiveMagicResistance:context.effectiveMagicResistance,spellAmp:context.spellAmplification,grantsTrueStrikeOnProc:!!item.intMultiplier,notes:[...effectNotes,...notes]};
 });
 return {active:true,...effects[0],complete:context.complete,effects,notes,missing:context.missing,context};
}
