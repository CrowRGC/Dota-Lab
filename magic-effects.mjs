// Exact-map spell amplification: JASS CSD/CQD, S3G (Null Talisman), T7G (Kaya family).
const finite=n=>typeof n==='number'&&Number.isFinite(n);
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const FAMILY_SPELL_AMP=Object.freeze({kaya:10,'meteor-hammer':10,'fallen-sky':10,'sange-and-kaya':12,'yasha-and-kaya':12,trident:15});
const ACTIVE_VULNERABILITY=Object.freeze({'ethereal-blade':1.4});
export function itemSpellAmplification(slots=[]){
 const ids=Array.isArray(slots)?slots:[];
 return Math.max(0,...ids.map(id=>FAMILY_SPELL_AMP[id]||0))+ids.filter(id=>id==='null-talisman').length*3;
}
/**
 * Shared post-hit magical scenario. Parasma corruption and checked active debuffs
 * are assumed already applied. Inputs use percentages, not fractions.
 */
export function magicDamageContext(attackerTotals={},defenderTotals={},slots=[],options={}){
 const ids=Array.isArray(slots)?slots:[];
 const notes=[],missing=[];
 const intelligence=finite(attackerTotals.int)?Math.max(0,attackerTotals.int):null;
 if(intelligence===null)missing.push('Attacker intelligence is unavailable for the map’s innate spell amplification.');
 const hasOverride=finite(options.magicResistance);
 const unknownResistance=!hasOverride&&Object.hasOwn(defenderTotals,'magicResistance')&&!finite(defenderTotals.magicResistance);
 let baseMagicResistance=hasOverride?options.magicResistance:finite(defenderTotals.magicResistance)?defenderTotals.magicResistance:unknownResistance?null:25;
 if(baseMagicResistance!==null)baseMagicResistance=clamp(baseMagicResistance,-100,100);
 else missing.push('Target magic resistance is unverified. Enter a tested final resistance value.');
 const assumedBaseResistance=!hasOverride&&!Object.hasOwn(defenderTotals,'magicResistance');
 if(assumedBaseResistance)notes.push('Target magic resistance uses a 25% base assumption because no supported final value was supplied.');
 const intSpellAmp=intelligence===null?null:intelligence/14;
 const itemSpellAmp=finite(attackerTotals.spellAmp)?attackerTotals.spellAmp:itemSpellAmplification(ids);
 const extraSpellAmp=finite(options.extraSpellAmp)?clamp(options.extraSpellAmp,-100,1000):0;
 const spellAmplification=intSpellAmp===null?null:intSpellAmp+itemSpellAmp+extraSpellAmp;
 const spellMultiplier=spellAmplification===null?null:Math.max(0,1+spellAmplification/100);
 const parasmaMultiplier=ids.includes('parasma')?1.2:1;
 if(parasmaMultiplier>1)notes.push('Parasma Magic Corruption is assumed applied: ×1.20 incoming magical damage, not a flat 20-point resistance subtraction.');
 const enabled=new Set(Array.isArray(options.enabledActives)?options.enabledActives:[]);
 let targetVulnerabilityMultiplier=1;
 const shiva=ids.includes('shiva-s-guard')&&enabled.has('shiva-s-guard');
 const veil=ids.includes('veil-of-discord')&&enabled.has('veil-of-discord');
 if(shiva||veil){targetVulnerabilityMultiplier=shiva?1.15:1.1;notes.push(`${shiva?'Shiva’s Guard':'Veil of Discord'} checked debuff is assumed applied (×${targetVulnerabilityMultiplier.toFixed(2)} incoming magical damage).`);}
 if(shiva&&veil)notes.push('Shiva and Veil share the map’s spell-vulnerability branch; only Shiva’s stronger15% modifier applies.');
 for(const [id,multiplier] of Object.entries(ACTIVE_VULNERABILITY))if(ids.includes(id)&&enabled.has(id)){
  targetVulnerabilityMultiplier*=multiplier;notes.push(`${id}: checked active debuff is assumed applied (×${multiplier.toFixed(2)} incoming magical damage).`);
 }
 if(finite(options.targetIncomingMagicMultiplier))targetVulnerabilityMultiplier*=Math.max(0,options.targetIncomingMagicMultiplier);
 const resistanceMultiplier=baseMagicResistance===null?null:1-baseMagicResistance/100;
 const postResistanceMultiplier=resistanceMultiplier===null?null:options.magicImmune===true?0:resistanceMultiplier*parasmaMultiplier*targetVulnerabilityMultiplier;
 const complete=missing.length===0;
 return {complete,missing,notes,intelligence,intSpellAmp,itemSpellAmp,extraSpellAmp,spellAmplification,spellMultiplier,pureMultiplier:spellMultiplier,baseMagicResistance,assumedBaseResistance,resistanceMultiplier,parasmaMultiplier,targetVulnerabilityMultiplier,postResistanceMultiplier,effectiveMagicResistance:postResistanceMultiplier===null?null:100*(1-postResistanceMultiplier),magicMultiplier:complete?spellMultiplier*postResistanceMultiplier:null};
}
