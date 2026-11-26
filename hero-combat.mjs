const finite=value=>typeof value==='number'&&Number.isFinite(value);
const clamp=(value,min,max,fallback=0)=>{
 const number=Number(value);
 return Number.isFinite(number)?Math.max(min,Math.min(max,number)):fallback;
};
const ARMOR_MODELS=new Set(['modern','classic','manual']);

/** User-entered scenario adjustments, never automatically inferred active buffs. */
export function normalizeHeroBuffs(input={}){
 return {
  bonusDamage:clamp(input?.bonusDamage,-100000,100000),
  bonusArmor:clamp(input?.bonusArmor,-1000,1000),
  damageReduction:clamp(input?.damageReduction,0,100),
  bonusAttackSpeed:clamp(input?.bonusAttackSpeed,-2000,2000),
 };
}

function armorFactor(armor,model,manualReduction){
 if(model==='manual')return finite(manualReduction)?1-clamp(manualReduction,-100,100)/100:null;
 if(!finite(armor))return null;
 if(model==='classic')return armor>=0?1/(1+.06*armor):2-Math.pow(.94,-armor);
 // Same documented positive-armor assumption as Build Duel. The target map's
 // negative-armor extension remains unverified, so it requires manual input.
 return armor<0?null:Math.max(0,1-(.052*armor)/(.9+.048*armor));
}

/**
 * Expected physical attacks from one final loadout into the other loadout.
 * All damage numbers are after the defender's armor and explicit reduction.
 * Evasion affects expected damage per attack, not damage of a landed hit.
 * No spells, proc damage, damage block, lifesteal or combat winner is inferred.
 */
export function physicalHit(attackerTotals={},defenderTotals={},options={}){
 const armorModel=ARMOR_MODELS.has(options.armorModel)?options.armorModel:'modern';
 const buffsAttacker=normalizeHeroBuffs(options.buffsAttacker),buffsDefender=normalizeHeroBuffs(options.buffsDefender);
 const missing=[];
 const notes=[
  'Physical attack estimate only. Spells, proc damage, damage block, lifesteal, healing and unlisted active effects are excluded.',
  'Critical rates are long-run estimates; the next attack is not predicted.',
 ];
 const attackerDamage=finite(attackerTotals.damage)?Math.max(0,attackerTotals.damage+buffsAttacker.bonusDamage):null;
 if(attackerDamage===null)missing.push('Attacker damage is missing.');
 const sourceMin=finite(attackerTotals.damageMin)?attackerTotals.damageMin:attackerTotals.damage;
 const sourceMax=finite(attackerTotals.damageMax)?attackerTotals.damageMax:attackerTotals.damage;
 const rawMin=finite(sourceMin)?Math.max(0,sourceMin+buffsAttacker.bonusDamage):null;
 const rawMax=finite(sourceMax)?Math.max(0,sourceMax+buffsAttacker.bonusDamage):null;
 if(rawMin!==null&&rawMax!==null&&rawMax<rawMin)missing.push('Attacker damage range is invalid.');
 const targetArmor=finite(defenderTotals.armor)?defenderTotals.armor+buffsDefender.bonusArmor:null;
 if(targetArmor===null)missing.push('Defender armor is missing.');
 if(armorModel==='manual'&&!finite(defenderTotals.physicalReduction))missing.push('Defender manual physical reduction is missing.');
 const armorMultiplier=targetArmor===null?null:armorFactor(targetArmor,armorModel,defenderTotals.physicalReduction);
 const needsManualArmor=armorModel==='modern'&&targetArmor!==null&&targetArmor<0;
 if(needsManualArmor)notes.push('Negative armor in the modern model needs a tested manual physical-reduction value.');
 const damageMultiplier=armorMultiplier===null?null:armorMultiplier*(1-buffsDefender.damageReduction/100);
 const evasion=defenderTotals.evasion===undefined?0:finite(defenderTotals.evasion)?clamp(defenderTotals.evasion,0,100):null;
 if(evasion===null)missing.push('Defender evasion is missing.');
 const trueStrikeChance=attackerTotals.trueStrikeChance===undefined?0:finite(attackerTotals.trueStrikeChance)?clamp(attackerTotals.trueStrikeChance,0,100):null;
 if(trueStrikeChance===null)missing.push('Attacker true-strike chance is missing.');
 const hitChance=evasion===null||trueStrikeChance===null?null:1-evasion/100*(1-trueStrikeChance/100);
 const critChance=attackerTotals.critChance===undefined?0:finite(attackerTotals.critChance)?clamp(attackerTotals.critChance,0,100):null;
 if(critChance===null)missing.push('Attacker critical chance is missing.');
 let critMultiplier=attackerTotals.critMultiplier===undefined?1:finite(attackerTotals.critMultiplier)?clamp(attackerTotals.critMultiplier,1,10):null;
 if(critMultiplier===null)missing.push('Attacker critical multiplier is missing.');
 const suppliedOutcomes=Array.isArray(attackerTotals.criticalOutcomes)?attackerTotals.criticalOutcomes:[];
 const outcomes=suppliedOutcomes.filter(o=>finite(o?.multiplier)&&o.multiplier>1&&finite(o?.probability)&&o.probability>0&&o.probability<=1);
 const outcomeProbability=outcomes.reduce((sum,o)=>sum+o.probability,0);
 let usableOutcomes=outcomes.length===suppliedOutcomes.length&&outcomes.length>0&&critChance!==null&&Math.abs(outcomeProbability-critChance/100)<1e-6;
 if(usableOutcomes)critMultiplier=outcomes.reduce((sum,o)=>sum+o.probability*o.multiplier,0)/outcomeProbability;
 else if(critChance>0&&suppliedOutcomes.length)notes.push('Critical-tier data does not match the final chance; the supplied final critical multiplier is used.');
 const criticalTiers=critChance>0&&critMultiplier!==null?(usableOutcomes?outcomes:[{probability:critChance/100,multiplier:critMultiplier}]):[];
 const effectiveAS=finite(attackerTotals.attackSpeed)?Math.max(0,attackerTotals.attackSpeed+buffsAttacker.bonusAttackSpeed):null;
 const bat=finite(attackerTotals.baseAttackTime)&&attackerTotals.baseAttackTime>0?attackerTotals.baseAttackTime:null;
 if(effectiveAS===null)missing.push('Attacker attack speed is missing.');
 if(bat===null)missing.push('Attacker base attack time must be positive.');
 const attacksPerSecond=effectiveAS===null||bat===null?null:effectiveAS/(100*bat);
 const knownDamage=damageMultiplier!==null&&attackerDamage!==null&&rawMin!==null&&rawMax!==null&&rawMax>=rawMin;
 // Accuracy or attack-speed uncertainty must not erase a known landed-hit value.
 const normalHit=knownDamage?attackerDamage*damageMultiplier:null;
 const normalMin=knownDamage?rawMin*damageMultiplier:null;
 const normalMax=knownDamage?rawMax*damageMultiplier:null;
 const criticalHit=knownDamage&&critChance>0&&critMultiplier!==null?normalHit*critMultiplier:null;
 const criticalMin=knownDamage&&criticalTiers.length?normalMin*Math.min(...criticalTiers.map(o=>o.multiplier)):null;
 const criticalMax=knownDamage&&criticalTiers.length?normalMax*Math.max(...criticalTiers.map(o=>o.multiplier)):null;
 const critFactor=critChance===null||critMultiplier===null?null:1+critChance/100*(critMultiplier-1);
 const expectedLandedHit=knownDamage&&critFactor!==null?normalHit*critFactor:null;
 const expectedAttackDamage=expectedLandedHit===null||hitChance===null?null:expectedLandedHit*hitChance;
 const dps=expectedAttackDamage===null||attacksPerSecond===null?null:expectedAttackDamage*attacksPerSecond;
 return {
  complete:missing.length===0&&!needsManualArmor&&knownDamage,
  missing,needsManualArmor,armorModel,buffsAttacker,buffsDefender,
  rawNormalHit:attackerDamage,rawNormalMin:rawMin,rawNormalMax:rawMax,
  normalHit,normalMin,normalMax,criticalHit,criticalMin,criticalMax,
  criticalTiers:criticalTiers.map(o=>({multiplier:o.multiplier,chance:o.probability*100,hit:knownDamage?normalHit*o.multiplier:null,min:knownDamage?normalMin*o.multiplier:null,max:knownDamage?normalMax*o.multiplier:null})),
  critChance,critMultiplier,critFactor,expectedLandedHit,hitChance,expectedAttackDamage,
  attacksPerSecond,dps,targetArmor,armorMultiplier,damageMultiplier,evasion,trueStrikeChance,
  notes,
 };
}

export function compareHeroAttacks(aTotals={},bTotals={},options={}){
 const shared={armorModel:options.armorModel};
 const aToB=physicalHit(aTotals,bTotals,{...shared,buffsAttacker:options.buffsA,buffsDefender:options.buffsB});
 const bToA=physicalHit(bTotals,aTotals,{...shared,buffsAttacker:options.buffsB,buffsDefender:options.buffsA});
 return {aToB,bToA,complete:aToB.complete&&bToA.complete,notes:[...new Set([...aToB.notes,...bToA.notes])]};
}
