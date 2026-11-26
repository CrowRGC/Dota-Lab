import {MAP_ITEMS} from './all-items.mjs';
import {magicDamageContext} from './magic-effects.mjs';

const names=new Map(MAP_ITEMS.map(i=>[i.id,i.name]));
const finite=n=>typeof n==='number'&&Number.isFinite(n);
const bounded=(n,lo,hi,fallback=0)=>finite(n)?Math.max(lo,Math.min(hi,n)):fallback;
const daggerIds=Array.from({length:5},(_,i)=>`dagon-level-${i+1}`);
const activeIds=[...daggerIds,'meteor-hammer','fallen-sky','overwhelming-blink','shiva-s-guard','ethereal-blade','urn-of-shadows','spirit-vessel','blood-grenade','eul-s-scepter','phylactery','khanda','gleipnir','mjollnir','orchid-malevolence','bloodthorn','blade-mail','veil-of-discord','mask-of-madness','swift-blink'];
export const DAMAGE_ACTIVE_ITEMS=Object.freeze(activeIds.map(id=>({id,name:names.get(id)||id,trigger:['phylactery','khanda'].includes(id)?'Next eligible targeted spell':'Item active'})));
const passiveIds=['radiance-on','radiance-off','blade-mail','battle-fury','echo-sabre','harpoon','manta-style','helm-of-dominator','helm-of-the-overlord'];
const owned=new Set([...activeIds,...passiveIds]);
const otherModelIds=new Set(['witch-blade','parasma','orb-of-venom','orb-of-corrosion','javelin','mkb','maelstrom','mjollnir','gleipnir','basher','abyssal','diffusal','disperser','lothar-s-edge','silver-edge','buriza','crystalys','khanda']);
/** Explicit inventory coverage; direct flat damage is already included in loadout stats. */
export const DAMAGE_EFFECT_CATALOG=Object.freeze(MAP_ITEMS.filter(i=>!i.recipe&&(owned.has(i.id)||otherModelIds.has(i.id))).map(i=>({id:i.id,name:i.name,rawcode:i.rawcode,group:owned.has(i.id)?'extra-damage-effects':'attack-proc-or-poison',conditional:['blade-mail','manta-style','helm-of-dominator','helm-of-the-overlord','orchid-malevolence','bloodthorn','mjollnir'].includes(i.id)})));

function physicalMultiplier(armor,model='modern'){
 if(!finite(armor))return null;
 if(model==='classic')return armor>=0?1/(1+.06*armor):2-Math.pow(.94,-armor);
 if(armor<0)return null;
 return Math.max(0,1-.052*armor/(.9+.048*armor));
}
/** Effects are per application / trigger, never an assumed full spell rotation. */
export function extraDamageEffects(attacker={},defender={},slots=[],options={}){
 const inventory=new Set(slots),selected=new Set(options.enabledActives||[]),ctx=magicDamageContext(attacker,defender,slots,options),out=[];
 const hp=finite(defender.hp)?defender.hp:null;
 const percentage=bounded(options.targetHealthPercent,0,100,100);
 const currentHp=hp===null?null:hp*percentage/100;
 const ampMagic=ctx.magicMultiplier,ampPure=ctx.pureMultiplier;
 const enabled=id=>selected.has(id);
 const scaled=(raw,type='magical')=>finite(raw)&&finite(type==='pure'?ampPure:ampMagic)?raw*(type==='pure'?ampPure:ampMagic):null;
 function record(id,config){
  const active=config.active!==false,isEnabled=!active||enabled(id);
  const effect={id,name:names.get(id)||id,active,enabled:isEnabled,activation:active?'active':'passive',damageType:'magical',rawDps:null,dps:null,duration:null,totalDamage:null,cooldown:null,rawDamage:null,damage:null,needsInput:false,notes:[],...config};
  if(!isEnabled){for(const k of ['rawDps','dps','totalDamage','rawDamage','damage','averageDps'])effect[k]=null;effect.needsInput=false;}
  if(!ctx.complete&&effect.damageType!=='modifier'){effect.needsInput=true;effect.notes.push(...ctx.missing);}
  out.push(effect);return effect;
 }
 function burst(id,raw,cooldown,notes=[],config={}){
  const damage=scaled(raw,config.damageType||'magical');
  return record(id,{rawDamage:raw,damage,totalDamage:damage,cooldown,notes,needsInput:!finite(raw),...config});
 }
 function dot(id,rawDps,duration,cooldown,notes=[],config={}){
  const dps=scaled(rawDps,config.damageType||'magical');
  return record(id,{rawDps,dps,duration,totalDamage:finite(dps)&&finite(duration)?dps*duration:null,cooldown,notes,...config});
 }
 if(inventory.has('radiance-on')){
  const attributes=finite(attacker.str)&&finite(attacker.agi)&&finite(attacker.int)?attacker.str+attacker.agi+attacker.int:null;
  const pureRaw=attributes===null?null:attributes*.05,magic=scaled(60),pure=scaled(pureRaw,'pure');
  record('radiance-on',{active:false,damageType:'mixed',rawDps:pureRaw===null?null:60+pureRaw,dps:finite(magic)&&finite(pure)?magic+pure:null,needsInput:pureRaw===null,components:[{type:'magical',rawDps:60,dps:magic},{type:'pure',rawDps:pureRaw,dps:pure}],notes:['While the enemy remains inside the 700-range burn aura.','JASS WRG: 60 magical damage plus 5% of each attacker attribute as pure damage per burn interval.','Multiple Radiance burns do not stack. Illusions are outside this hero-only model.']});
 }else if(inventory.has('radiance-off'))record('radiance-off',{active:false,damageType:'modifier',notes:['Burn is toggled off; no Radiance aura damage is applied.']});
 for(const id of daggerIds)if(inventory.has(id)){
  const level=Number(id.at(-1)),raw=hp===null?null:300+100*level+.02*level*hp;
  burst(id,raw,40-5*level,['One Energy Burst against a hero: fixed damage plus a percentage of target maximum HP.','Healing, spell block and reflection are not modeled.']);
 }
 for(const id of ['meteor-hammer','fallen-sky'])if(inventory.has(id)){
  const effect=dot(id,90,6,id==='meteor-hammer'?24:15,['Requires the meteor to land and the burn to last all six ticks.','Meteor Hammer channels for 2.5s before a further 0.5s fall. Fallen Sky has a different cast sequence.','Meteor burns refresh their shared debuff rather than multiplying together.']);
  if(effect.enabled){effect.rawDamage=150;effect.damage=scaled(150);effect.totalDamage=finite(effect.dps)&&finite(effect.damage)?effect.damage+effect.dps*6:null;}
 }
 if(inventory.has('overwhelming-blink'))burst('overwhelming-blink',finite(attacker.str)?200+attacker.str:null,15,['Assumes the enemy is in the 800-area landing pulse.']);
 if(inventory.has('shiva-s-guard'))burst('shiva-s-guard',200,27,['Arctic Blast applies its 15% incoming spell-damage debuff before its own damage.','The shared magic context includes the selected Shiva debuff; it is not applied a second time here.']);
 if(inventory.has('ethereal-blade')){
  const attribute=options.targetPrimaryAttribute||defender.primaryAttribute;
  const primary=['str','agi','int'].includes(attribute)&&finite(defender[attribute])?defender[attribute]:null;
  burst('ethereal-blade',primary===null?null:75+1.5*primary,20,['Uses the TARGET primary attribute, not the attacker attribute.','Exact JASS HRH/HPH gives 75 + 1.5 × target primary attribute; the tooltip incorrectly says 50 base.','Ethereal is applied before this hit. The selected debuff increases incoming magic damage by 40% and prevents physical attack damage for four seconds.'],{duration:4,needsInput:primary===null});
 }
 if(inventory.has('urn-of-shadows')){const urn=dot('urn-of-shadows',25,8,10,['Requires a charge and eight uninterrupted damage ticks. Spirit Vessel overrides the Urn debuff.']);if(inventory.has('spirit-vessel')&&enabled('spirit-vessel')&&urn.enabled){urn.enabled=false;urn.notes.push('Suppressed by the enabled Spirit Vessel debuff.');for(const key of ['rawDps','dps','totalDamage'])urn[key]=null;}}
 if(inventory.has('spirit-vessel')){
  let remaining=currentHp,total=0,ticks=[];
  if(remaining!==null&&finite(ampMagic))for(let second=1;second<=8;second++){
   const raw=35+.04*remaining,damage=Math.min(remaining,raw*ampMagic);remaining=Math.max(0,remaining-damage);total+=damage;ticks.push({second,rawDamage:raw,damage,remainingHp:remaining});
  }
  record('spirit-vessel',{rawDps:currentHp===null?null:35+.04*currentHp,dps:currentHp===null?null:scaled(35+.04*currentHp),duration:8,cooldown:10,totalDamage:ticks.length?total:null,averageDps:ticks.length?total/8:null,ticks,needsInput:currentHp===null,notes:['DPS shown is the FIRST tick: 35 + 4% of target current HP. Later ticks decrease as HP falls.','Eight-second total simulates only this debuff, without attacks, regeneration or other damage. Requires a charge.','Spirit Vessel overrides Urn rather than stacking another Urn damage effect.']});
 }
 if(inventory.has('blood-grenade')){
  const effect=dot('blood-grenade',15,5,10,['One grenade: 50 impact damage plus 15 damage per second for five seconds.']);
  if(effect.enabled){effect.rawDamage=50;effect.damage=scaled(50);effect.totalDamage=finite(effect.damage)&&finite(effect.dps)?effect.damage+effect.dps*5:null;}
 }
 if(inventory.has('eul-s-scepter'))burst('eul-s-scepter',50,23,['Damage occurs on landing after the 2.5-second Cyclone, not at cast time.']);
 const empowerId=inventory.has('khanda')?'khanda':inventory.has('phylactery')?'phylactery':null;
 if(empowerId)burst(empowerId,empowerId==='khanda'?(finite(attacker.damage)?150+.75*attacker.damage:null):150,6,['Triggered by the next eligible single-target spell; this is NOT damage on every auto-attack.','Khanda supersedes Phylactery for this effect.'],{activation:'targeted-spell'});
 if(inventory.has('gleipnir'))burst('gleipnir',220,18,['Eternal Chains active damage; passive Chain Lightning is shown separately.']);
 if(inventory.has('mjollnir'))record('mjollnir',{rawDamage:225,damage:scaled(225),cooldown:1,duration:15,activation:'incoming-damage-trigger',chance:20,needsInput:false,notes:['Static Charge: 20% chance per eligible incoming damage event for 225 magical damage, with at most one activation per second.','This is reactive damage, not guaranteed outgoing DPS. The compared enemy must be the attacker/in range.','The item cast cooldown is 35s; the 1s value is the trigger cooldown.']});
 for(const id of ['orchid-malevolence','bloodthorn'])if(inventory.has(id)){
  const stored=finite(options.storedDamage)?Math.max(0,options.storedDamage):null;
  burst(id,stored===null?null:.30*stored,id==='bloodthorn'?15:18,['Bonus damage at expiry is 30% of damage tracked during the five-second silence.','Enter the tracked damage to evaluate this conditional burst; it is not 30% of one attack.','Silence removal, dispels and the exact tracked damage window are not simulated.'],{duration:5,needsInput:stored===null});
 }
 if(inventory.has('blade-mail')){
  const incoming=finite(options.incomingDamage)?Math.max(0,options.incomingDamage):null,type=options.incomingDamageType;
  const physical=Object.hasOwn(options,'physicalMultiplier')?options.physicalMultiplier:physicalMultiplier(defender.armor,options.armorModel),resist=type==='magical'?ampMagic:type==='pure'?ampPure:type==='physical'?physical:null;
  const raw=incoming===null?null:20+.2*incoming;
  record('blade-mail',{active:false,damageType:type||'reflected',rawDamage:raw,damage:null,needsInput:true,notes:['Passive return: 20 + 20% of the eligible incoming attack damage, with the incoming damage type.','Reflection mitigation and ordering are not verified in the map. No final reflected damage is calculated. This is not extra damage on the holder’s attacks.','The active is handled as a separate scenario assumption; this record does not add an unverified combined passive+active total.']});
  record('blade-mail',{active:true,damageType:'reflected',duration:5.5,cooldown:25,needsInput:true,notes:['Active Damage Return reflects damage of the same incoming type. Exact combined attack/passive ordering is not modeled.','No automatic reflection total is added to avoid double counting the passive and active return.']});
 }
 if(inventory.has('veil-of-discord'))record('veil-of-discord',{damageType:'modifier',duration:16,cooldown:16,notes:['Magic Weakness increases incoming non-attack damage by 10%.','The selected debuff is applied by the shared damage context. Shiva’s stronger 15% debuff supersedes it.']});
 for(const [id,cooldown] of [['echo-sabre',6],['harpoon',5]])if(inventory.has(id)){
  const melee=options.attackType==='melee';
  record(id,{active:false,damageType:'physical',activation:'double-attack',cooldown,rawDamage:melee&&finite(attacker.damage)?attacker.damage:null,damage:melee&&finite(attacker.damage)&&finite(options.physicalMultiplier??physicalMultiplier(defender.armor,options.armorModel))?attacker.damage*(options.physicalMultiplier??physicalMultiplier(defender.armor,options.armorModel)):null,needsInput:!melee,notes:[melee?'One additional base attack when Echo Strike is ready. It can have its own procs; these are not duplicated here.':'Echo Strike only gives the extra attack to melee attackers.','Sustained DPS is not increased automatically; attack timing and the cooldown require a timeline model.']});
 }
 if(inventory.has('battle-fury'))record('battle-fury',{active:false,damageType:'physical',activation:'secondary-target',notes:['Cleave damages SECONDARY targets. It does not add another damage instance to the hero being directly attacked.','Secondary-unit positions are not modeled. Flat item damage is already in the attack stats.']});
 for(const id of ['manta-style','helm-of-dominator','helm-of-the-overlord'])if(inventory.has(id))record(id,{active:true,damageType:'summoned-unit',needsInput:true,notes:['Damage depends on the created illusion or dominated unit, its base stats, target and uptime.','Summoned-unit attacks are not counted as direct damage from this hero.']});
 for(const [id,description] of [['mask-of-madness','Berserk grants +110 attack speed and reduces the holder’s armor by 8 for six seconds.'],['swift-blink','Swift Blink grants +50 attack damage and +50 attack speed for six seconds.']])if(inventory.has(id))record(id,{active:true,damageType:'modifier',duration:6,cooldown:id==='mask-of-madness'?16:15,notes:[description,'When enabled, these verified stat changes are applied to the physical scenario automatically. Manual buff fields are additional; do not enter these same bonuses twice. No separate damage instance is created.']});
 return out;
}
