import {magicDamageContext} from './magic-effects.mjs';

const finite=n=>typeof n==='number'&&Number.isFinite(n);
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
function physicalMultiplier(defender,options){
 if(Object.hasOwn(options,'physicalMultiplier'))return finite(options.physicalMultiplier)?Math.max(0,options.physicalMultiplier):null;
 const armor=defender?.armor;
 if(!finite(armor))return null;
 if(options.armorModel==='manual')return finite(defender.physicalReduction)?1-clamp(defender.physicalReduction,-100,100)/100:null;
 if(options.armorModel==='classic')return armor>=0?1/(1+.06*armor):2-.94**(-armor);
 return armor<0?null:Math.max(0,1-.052*armor/(.9+.048*armor));
}

/**
 * Extra attack effects from exact v7.07b1 item tooltips and JASS.
 * `chance` is a percent. `expectedPerAttack` is an uncapped ready-proc estimate,
 * not sustained DPS: it does not simulate cooldown history, evasion or PRD state.
 * Physical attacks and passive criticals are calculated separately, never added here.
 */
export function attackProcEffects(attackerTotals={},defenderTotals={},slots=[],options={}){
 const carried=Array.isArray(slots)?slots:[];
 const count=id=>carried.filter(x=>x===id).length;
 const has=id=>count(id)>0;
 const magic=magicDamageContext(attackerTotals,defenderTotals,carried,options);
 const physical=physicalMultiplier(defenderTotals,options);
 const immune=options.magicImmune===true||options.targetMagicImmune===true;
 const effects=[];
 const attackType=options.attackType||attackerTotals.attackType||'melee';
 const damageFor=(raw,type)=>type==='physical'?(physical===null?null:raw*physical):immune?0:finite(magic.magicMultiplier)?raw*magic.magicMultiplier:null;
 function proc({id,name,damageType='magical',rawDamage,chance,cooldown=0,copies=1,notes=[],expectedCopies=1,enabled=true,...extra}){
  const damage=damageFor(rawDamage,damageType);
  const expectedPerAttack=enabled&&finite(damage)&&finite(chance)?damage*chance/100*expectedCopies:null;
  effects.push({id,name,kind:'on-attack',damageType,rawDamage,damage,chance,cooldown,copies,enabled,active:false,expectedPerAttack,complete:damage!==null,...extra,notes:[...notes,...(damageType==='magical'?magic.notes||[]:[])]});
 }
 if(has('javelin'))proc({id:'javelin-pierce',name:'Javelin · Pierce',rawDamage:70,chance:30,copies:count('javelin'),expectedCopies:count('javelin'),notes:[
  '70 magical damage on a Pierce proc; its attack cannot miss.',
  'The script rolls each Javelin inventory copy. Expected damage sums their procs; 30% is per copy, not the chance of any proc.',
  'Proc rates are long-run PRD rates, not guaranteed next-hit odds.',
 ]});
 if(has('mkb')){
  const copies=count('mkb');
  proc({id:'mkb-pierce',name:'Monkey King Bar · Pierce',rawDamage:70,chance:80,copies,notes:[
   '80% Pierce roll, 70 magical bonus damage; the proc attack cannot miss.',
   'At most one MKB Pierce damage event per attack. Structures, wards and allied targets are excluded by the map.',
   ...(copies>1?['Multiple MKB copies retry the same PRD stream until the first success. A combined proc probability is not inferred; 80% is the per-roll rate.']:[]),
  ]});
  if(copies>1){effects.at(-1).expectedPerAttack=null;effects.at(-1).chance=null;effects.at(-1).chancePerRoll=80;effects.at(-1).chanceLabel='80% per roll; combined chance not modeled';}
 }
 const lightning=has('mjollnir')?{id:'mjollnir',name:'Mjollnir',raw:180}:has('gleipnir')?{id:'gleipnir',name:'Gleipnir',raw:160}:has('maelstrom')?{id:'maelstrom',name:'Maelstrom',raw:140}:null;
 if(lightning)proc({id:`${lightning.id}-lightning`,name:`${lightning.name} · Chain Lightning`,rawDamage:lightning.raw,chance:30,cooldown:.2,notes:[
  'Primary hero target only; chain jumps and other targets are outside this comparison.',
  'Shared 0.2-second cooldown. Mjollnir takes priority over Gleipnir, which takes priority over Maelstrom; weaker carried lightning items do not add another lightning roll.',
  'The proc attack cannot miss. Expected bonus per attack assumes the shared cooldown is ready, not sustained proc DPS.',
 ]});
 if(has('basher')||has('abyssal')){
  // SZG checks the Basher ability first when both are carried; copies do not stack.
  const basher=has('basher'),name=basher?'Cranium Basher':'Abyssal Blade';
  proc({id:basher?'basher-bash':'abyssal-bash',name:`${name} · Bash`,rawDamage:basher?100:120,chance:attackType==='ranged'?10:25,cooldown:2.3,notes:[
   '25% for melee attackers, 10% for ranged attackers; 2.3-second shared bash cooldown and 1.5-second stun.',
   'The map tooltip labels the bonus as magical damage. Hero innate bash restrictions and immunity interactions require their own scenario.',
   'Basher and Abyssal do not stack. If both are carried, the script chooses the Basher branch.',
   'Expected bonus is conditional on a landed attack with bash cooldown ready; it is not sustained DPS.',
  ],heroSkillRestriction:['slardar','faceless-void','spirit-breaker'].includes(options.heroId||attackerTotals.heroId)});
  if(effects.at(-1).heroSkillRestriction){effects.at(-1).enabled=false;effects.at(-1).expectedPerAttack=null;effects.at(-1).notes.push('This hero has an innate bash ability that can suppress item bash when learned. Skill levels are not modeled; no automatic item-bash expectation is applied.');}
 }
 if(has('diffusal')||has('disperser')){
  const currentMana=finite(options.targetMana)?Math.max(0,options.targetMana):finite(defenderTotals.mana)?Math.max(0,defenderTotals.mana):null;
  const manaBurn=currentMana===null?null:immune?0:Math.min(40,currentMana);
  const id=has('disperser')?'disperser':'diffusal';
  if(manaBurn===null)effects.push({id:`${id}-mana-break`,name:`${id==='disperser'?'Disperser':'Diffusal Blade'} · Mana Break`,kind:'on-attack',damageType:'physical',rawDamage:null,damage:null,chance:100,cooldown:0,manaBurn:null,expectedPerAttack:null,enabled:true,active:false,complete:false,notes:['Current target mana is required to determine mana burned and bonus damage.']});
  else proc({id:`${id}-mana-break`,name:`${id==='disperser'?'Disperser':'Diffusal Blade'} · Mana Break`,damageType:'physical',rawDamage:manaBurn,chance:100,manaBurn,notes:[
   'Real hero attacks burn up to 40 mana and deal physical bonus damage equal to the mana actually burned. Does not affect spell-immune targets.',
   'Diffusal and Disperser share one Mana Break effect; multiple copies do not multiply the burn.',
   ...(finite(options.targetMana)?[]:['Target mana defaults to the defender’s full mana total. This is one hit, not a whole fight; damage falls as mana is spent.']),
   'Illusion-specific mana burn and hero ability Mana Break are excluded.',
  ]});
 }
 const shadow=has('silver-edge')?{id:'silver-edge',name:'Silver Edge',cooldown:22}:has('lothar-s-edge')?{id:'lothar-s-edge',name:"Lothar’s Edge",cooldown:28}:null;
 if(shadow){
  const enabled=options.shadowWalkHit===true||(Array.isArray(options.enabledActives)&&options.enabledActives.includes(shadow.id));
  const damage=damageFor(175,'physical');
  effects.push({id:`${shadow.id}-backstab`,name:`${shadow.name} · Opening backstab`,kind:'opening-hit',damageType:'physical',rawDamage:175,damage,chance:100,cooldown:shadow.cooldown,enabled,active:true,expectedPerAttack:null,complete:damage!==null,forcedCritMultiplier:shadow.id==='silver-edge'?1.6:null,notes:[
   enabled?'One attack from active invisibility is enabled in this scenario.':'Active opening hit is off. Enable it explicitly; this is not a passive bonus on every attack.',
   '175 physical backstab bonus, shown separately from the normal attack.',
   ...(shadow.id==='silver-edge'?['Silver Edge also guarantees a ×1.6 critical and cannot miss on the opening hit. The critical portion is not included in this 175 bonus; do not count the passive crit twice.']:['Native ability A017 DataC1 is175. The tooltip contains an unresolved reference that displays1; the native ability value is used.']),
  ]});
 }
 return effects;
}
