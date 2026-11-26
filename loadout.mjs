import {itemDefenseProfile} from './item-defense.mjs';
import {criticalProfile} from './critical.mjs';
import {HERO_STATS,ITEM_STATS,MAP_CONSTANTS,MAP_STAT_META as META} from './stats-data.mjs';
import {HEROES,ITEMS} from './catalog.mjs';

export const SUPPORTED_HERO_IDS=Object.freeze(Object.keys(HERO_STATS));
export const SUPPORTED_ITEM_IDS=Object.freeze(Object.keys(ITEM_STATS));
export const MAP_STAT_META=Object.freeze({...META});
const C=MAP_CONSTANTS;
const statKeys=['str','agi','int','damage','armor','hp','mana','attackSpeed','hpRegen','manaRegen'];
const displayItems=new Map(ITEMS.map(i=>[i.id,i]));
const displayHeroes=new Map(HEROES.map(h=>[h.id,h]));
const finite=v=>typeof v==='number'&&Number.isFinite(v);
const clean=n=>Math.round(n*1e8)/1e8;

/** Base form, natural growth and passive item bonuses. No learned skills or active buffs. */
export function computeLoadout(heroId,levelInput=1,slotInput=[],options={}){
  const hero=HERO_STATS[heroId];
  const level=Math.max(1,Math.min(30,Math.floor(Number(levelInput)||1)));
  const slots=Array.from({length:6},(_,i)=>typeof slotInput?.[i]==='string'?slotInput[i]:null);
  const missing=[];
  if(!hero)missing.push('No extracted base stats for the selected hero.');
  const selected=slots.map((id,slot)=>({id,slot,item:ITEM_STATS[id]})).filter(x=>x.id);
  for(const x of selected)if(!x.item)missing.push(`${displayItems.get(x.id)?.name||x.id}: passive stat data is not supported yet.`);else if(x.item.unsupportedReason)missing.push(`${displayItems.get(x.id)?.name||x.id}: ${x.item.unsupportedReason}`);
  for(const x of selected.filter(x=>x.item))if(!statKeys.every(k=>finite(x.item.stats[k])))missing.push(`${displayItems.get(x.id)?.name||x.id}: an item bonus is missing.`);
  const excludedEffects=[...new Set(selected.flatMap(x=>(x.item?.excludedEffects||[]).filter(e=>!((x.id==='buriza'||x.id==='crystalys')&&/critical/i.test(e))&&!(/^(evasion|passive evasion)$/i.test(e.trim())&&['the-butterfly','talisman-of-evasion','heaven-s-halberd','radiance-on','radiance-off'].includes(x.id)))))];
  const evidence=`Exact v${META.version} map data · base hero form, natural growth and passive item stats.`;
  if(missing.length)return {complete:false,totals:{damage:null,damageMin:null,damageMax:null,armor:null,hp:null,mana:null,hpRegen:null,manaRegen:null,attackSpeed:null,baseAttackTime:null,evasion:null,magicResistance:null,critChance:null,critMultiplier:null,cost:null,str:null,agi:null,int:null},attributes:null,excludedEffects,missing,breakdown:[],evidence};
  const bonus=Object.fromEntries(statKeys.map(k=>[k,0]));
  let cost=0;
  const selfAuras=new Map();
  for(const {item} of selected){
    for(const k of statKeys)bonus[k]+=item.stats[k];
    cost+=item.cost;
    for(const aura of item.selfAuras||[])selfAuras.set(aura.group,Math.max(selfAuras.get(aura.group)||0,aura.attackSpeed||0));
  }
  const growth={str:Math.floor(hero.strGain*(level-1)+1e-8),agi:Math.floor(hero.agiGain*(level-1)+1e-8),int:Math.floor(hero.intGain*(level-1)+1e-8)};
  const attributes={str:hero.baseStr+growth.str+bonus.str,agi:hero.baseAgi+growth.agi+bonus.agi,int:hero.baseInt+growth.int+bonus.int};
  const primary=attributes[hero.primaryAttribute]*C.damagePerPrimary;
  const damageMin=hero.baseDamageMin+primary+bonus.damage;
  const damageMax=hero.baseDamageMax+primary+bonus.damage;
  const assaultSelfAura=selected.some(x=>x.id==='assault-cuirass');
  const assaultArmor=assaultSelfAura?5:0;
  const auraAttackSpeed=[...selfAuras.values()].reduce((a,b)=>a+b,0)+(assaultSelfAura?30:0);
  const healthPercent=Math.max(0,Math.min(100,Number.isFinite(Number(options.healthPercent))?Number(options.healthPercent):100));
  const maxHP=hero.baseHP+attributes.str*C.hpPerStr+bonus.hp;
  const heartCopies=selected.filter(x=>x.id==='heart').length;
  const heartRegen=heartCopies?maxHP*heartCopies*0.01+maxHP*(1-healthPercent/100)*0.015:0;
  const hpAmp=Math.max(0,...selected.map(x=>x.item.hpRegenAmplification||0));
  const manaAmp=Math.max(0,...selected.map(x=>x.item.manaRegenAmplification||0));
  const hpRegen=(hero.baseHpRegen+attributes.str*C.hpRegenPerStr+bonus.hpRegen+heartRegen)*(1+hpAmp);
  const manaRegen=(hero.baseManaRegen+attributes.int*C.manaRegenPerInt+bonus.manaRegen)*(1+manaAmp);
  const critical=criticalProfile(slots,(damageMin+damageMax)/2,damageMin,damageMax);
  const defense=itemDefenseProfile(slots);
  excludedEffects.push(...defense.magicResistanceNotes);
  const totals={
    ...attributes,damage:(damageMin+damageMax)/2,damageMin,damageMax,
    armor:hero.baseArmor+C.armorBaseOffset+attributes.agi*C.armorPerAgi+bonus.armor+assaultArmor,
    hp:hero.baseHP+attributes.str*C.hpPerStr+bonus.hp,
    mana:hero.baseMana+attributes.int*C.manaPerInt+bonus.mana,
    hpRegen,manaRegen,
    attackSpeed:C.baseAttackSpeed+attributes.agi*C.attackSpeedPerAgi+bonus.attackSpeed+auraAttackSpeed,
    baseAttackTime:hero.baseAttackTime,evasion:defense.evasion,magicResistance:defense.magicResistance,critChance:critical.critChance,critMultiplier:critical.critMultiplier,critDamage:critical.critDamage,expectedHit:critical.expectedHit,cost,
  };
  for(const k of Object.keys(totals))if(finite(totals[k]))totals[k]=clean(totals[k]);
  const breakdown=[
    {label:`${displayHeroes.get(heroId)?.name||heroId} · level 1`,source:`UnitBalance / UnitWeapons · ${hero.unitId}`,value:`STR ${hero.baseStr} · AGI ${hero.baseAgi} · INT ${hero.baseInt}`},
    {label:`Natural growth to level ${level}`,source:'Whole-attribute growth; learned attribute bonuses excluded',value:`+${growth.str} STR · +${growth.agi} AGI · +${growth.int} INT`},
    ...selected.map(x=>({label:displayItems.get(x.id)?.name||x.id,source:`ItemData / AbilityData · ${x.item.rawcode}`,value:statKeys.filter(k=>x.item.stats[k]).map(k=>`+${x.item.stats[k]} ${k}`).join(' · ')||'No direct bonuses to these stats'})),
  ];
  breakdown.push({label:'Physical avoidance and magic resistance',source:'Exact-map QXD item-evasion script; A3UP base magic multiplier; native passive AIdd',value:`Evasion: ${defense.evasion}% · Magic resistance: ${defense.magicResistance===null?'enter final value; multiple-item stacking unverified':clean(defense.magicResistance)+'%'}${defense.evasionSources.includes('the-butterfly')?' · Butterfly Flutter active excluded':''}`});
  if(assaultSelfAura)breakdown.push({label:'Assault Cuirass self aura',source:'Exact-map YJG/J7E · A0Q1 armor+5 and A0Q4 attack speed+30, once across copies',value:'+5 armor · +30 attack speed; enemy aura and proximity effects handled separately'});
  if(selfAuras.size)breakdown.push({label:'Self-only attack-speed aura',source:'Strongest Endurance Aura in the shared buff group',value:`+${auraAttackSpeed} attack speed`});
  breakdown.push({label:'Regeneration per second',source:`Map JASS base + attributes + items; ${healthPercent}% current HP`,value:`HP: ${clean(hpRegen)} /s · Mana: ${clean(manaRegen)} /s${heartCopies?' · Heart max/missing-HP regeneration included':''}${hpAmp?` · ${hpAmp*100}% HP regen amplification`:''}`});
  return {complete:true,critical,defense,magicResistanceNotes:defense.magicResistanceNotes,totals,attributes,excludedEffects,missing:[],breakdown,evidence};
}
