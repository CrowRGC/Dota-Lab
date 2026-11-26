import {HEROES} from './catalog.mjs';
import {HERO_STATS} from './stats-data.mjs';
import {escapeHTML,heroImage} from './common.mjs';
import {compareHeroAttacks,normalizeHeroBuffs} from './hero-combat.mjs';
import {poisonAgainstHero} from './item-effects.mjs';
import {magicDamageContext} from './magic-effects.mjs';
import {attackProcEffects} from './attack-procs.mjs';
import {extraDamageEffects,DAMAGE_ACTIVE_ITEMS} from './damage-effects.mjs';

const esc=escapeHTML;
const finite=n=>typeof n==='number'&&Number.isFinite(n);
const number=(n,digits=1)=>finite(n)?n.toLocaleString('en-US',{maximumFractionDigits:digits}):'—';
const range=(min,max)=>finite(min)&&finite(max)?Math.abs(max-min)<.01?number(min):`${number(min)}–${number(max)}`:'—';
const clampPercent=n=>finite(n)?Math.max(0,Math.min(100,n)):100;
const unique=list=>[...new Set(list.filter(Boolean))];
const noteList=notes=>notes?.length?`<details class="hero-duel-evidence"><summary>Conditions &amp; evidence <span>⌄</span></summary><ul>${unique(notes).map(n=>`<li>${esc(n)}</li>`).join('')}</ul></details>`:'';
const heroFor=(state,side)=>HEROES.find(h=>h.id===(state[side]?.heroId||state.heroId));
const enabledFor=build=>Array.isArray(build?.activeEffects)?build.activeEffects:[];
const ownedActive=(build,id)=>Array.isArray(build?.slots)&&build.slots.includes(id)&&enabledFor(build).includes(id);
export function combinedHeroBuffs(build={}){
 const buffs=normalizeHeroBuffs(build.buffs);
 if(ownedActive(build,'mask-of-madness')){buffs.bonusAttackSpeed+=110;buffs.bonusArmor-=8;}
 if(ownedActive(build,'swift-blink')){buffs.bonusDamage+=50;buffs.bonusAttackSpeed+=50;}
 return buffs;
}
/** Post-hit armor scenario; mixed corruption sources stay explicit instead of guessed. */
export function itemArmorScenario(build={}){
 const slots=new Set(build.slots||[]),notes=[];let reduction=0;
 if(build.itemDebuffs===false)return {reduction,notes:['Item armor debuffs and enemy Cuirass aura are disabled: this is a pre-debuff armor scenario.']};
 const corruption=['desolator','orb-of-corrosion','blight-stone'].filter(id=>slots.has(id));
 if(corruption.length===1){
  const id=corruption[0];reduction+={desolator:6,'orb-of-corrosion':3,'blight-stone':2}[id];
  notes.push(`${id}: assumes its on-hit armor reduction is already applied (${reduction} armor). It does not describe a clean first attack before the debuff.`);
 }else if(corruption.length>1)notes.push('Mixed Desolator/Corrosion/Blight Stone debuff stacking is unverified and not applied automatically. Use the defender’s Armor adjustment field with tested values.');
 if(slots.has('assault-cuirass')){reduction+=5;notes.push('Assault Cuirass: assumes the enemy is inside the1200-range aura; target armor−5. The wearer’s self aura is already in loadout stats.');}
 return {reduction,notes};
}
function withBloodthorn(totals,build){
 if(!ownedActive(build,'bloodthorn'))return totals;
 let outcomes=Array.isArray(totals.criticalOutcomes)?totals.criticalOutcomes.filter(o=>finite(o?.probability)&&finite(o?.multiplier)):[];
 if(!outcomes.length&&finite(totals.critChance)&&totals.critChance>0&&finite(totals.critMultiplier))outcomes=[{probability:totals.critChance/100,multiplier:totals.critMultiplier}];
 const grouped=new Map(),total=outcomes.reduce((sum,o)=>sum+o.probability,0);
 for(const o of [...outcomes,{probability:Math.max(0,1-total),multiplier:1}]){
  const multiplier=Math.max(1.4,o.multiplier);grouped.set(multiplier,(grouped.get(multiplier)||0)+o.probability);
 }
 const criticalOutcomes=[...grouped].filter(([,p])=>p>0).map(([multiplier,probability])=>({multiplier,probability}));
 return {...totals,trueStrikeChance:100,critChance:100,critMultiplier:criticalOutcomes.reduce((sum,o)=>sum+o.multiplier*o.probability,0),criticalOutcomes};
}


/** Independent long-run proc approximation for attacks that cannot miss. */
export function attackAccuracyProfile(totals={},slots=[]){
 const ids=Array.isArray(slots)?slots:[],notes=[];
 const mkb=ids.filter(id=>id==='mkb').length;
 if(mkb>1)return {totals:{...totals,trueStrikeChance:null},notes:['Multiple MKB copies reuse a PRD stream. Combined accuracy is unverified, so expected hit chance and physical DPS are unavailable. Landed-hit damage remains shown.']};
 if(Object.hasOwn(totals,'trueStrikeChance')&&!finite(totals.trueStrikeChance))return {totals,notes};
 const probabilities=[];
 if(finite(totals.trueStrikeChance)&&totals.trueStrikeChance>0)probabilities.push(Math.max(0,Math.min(100,totals.trueStrikeChance))/100);
 if(mkb===1)probabilities.push(.8);
 for(const id of ids)if(id==='javelin')probabilities.push(.3);
 if(ids.some(id=>['maelstrom','mjollnir','gleipnir'].includes(id)))probabilities.push(.3);
 const accuracy=1-probabilities.reduce((chance,p)=>chance*(1-p),1);
 if(probabilities.length)notes.push('Accuracy uses an independent long-run union of single-MKB80%, each Javelin30%, and one shared lightning30% roll. Proc attacks cannot miss. Cooldown history and PRD correlations are not simulated; this is not next-hit accuracy. Ready Witch Blade/Parasma true strike applies only to its proc application, not every attack.');
 return {totals:{...totals,trueStrikeChance:accuracy*100},notes};
}

function scenarioOptions(state,side,attacker,defender,physical){
 const other=side==='a'?'b':'a',build=state[side]||{},target=state[other]||{};
 const hero=heroFor(state,side),targetHero=heroFor(state,other);
 const enabledActives=enabledFor(build);
 const options={
  armorModel:state.armorModel||'modern',
  physicalMultiplier:physical?.ethereal?0:physical?.damageMultiplier??null,
  extraSpellAmp:finite(build.extraSpellAmp)?build.extraSpellAmp:0,
  enabledActives,
  attackType:hero?.attackType||'melee',heroId:hero?.id,
  targetPrimaryAttribute:HERO_STATS[targetHero?.id]?.primaryAttribute,
  targetHealthPercent:clampPercent(target.healthPercent),
  targetMana:finite(defender.mana)?defender.mana*clampPercent(target.manaPercent)/100:null,
  storedDamage:finite(build.storedDamage)?build.storedDamage:null,
  incomingDamage:finite(build.incomingDamage)?build.incomingDamage:null,
  incomingDamageType:build.incomingDamageType||'physical',
  shadowWalkHit:enabledActives.includes('silver-edge')||enabledActives.includes('lothar-s-edge'),
 };
 if(target.magicMode==='manual'&&finite(target.magicResistance))options.magicResistance=target.magicResistance;
 return options;
}

function activeControls(state,side){
 const build=state[side]||{},slots=Array.isArray(build.slots)?build.slots:[],enabled=enabledFor(build);
 const choices=[...DAMAGE_ACTIVE_ITEMS,{id:'silver-edge',name:'Silver Edge · opening hit'},{id:'lothar-s-edge',name:'Lothar’s Edge · opening hit'}].filter((item,index,all)=>slots.includes(item.id)&&all.findIndex(x=>x.id===item.id)===index);
 if(!choices.length)return '';
 return `<div class="hero-duel-active-controls"><h4>Active &amp; triggered effects</h4><p>Check only the effects applied in this scenario. They are shown separately from physical attacks.</p><div>${choices.map(item=>`<label><input type="checkbox" data-duel-effect="${side}:${esc(item.id)}" ${enabled.includes(item.id)?'checked':''}><span>${esc(item.name)}</span></label>`).join('')}</div></div>`;
}

function effectCard(effect,category){
 const off=effect.enabled===false;
 const ready=!off&&effect.complete!==false&&!effect.needsInput;
 const damageType=effect.damageType||'magical';
 const metrics=[];
 if(ready){
  if(finite(effect.dps))metrics.push(`<div><span>${finite(effect.averageDps)?'Initial damage / s':'Damage / s while applied'}</span><strong>${number(effect.dps)}</strong></div>`);
  if(finite(effect.averageDps))metrics.push(`<div><span>Average over duration</span><strong>${number(effect.averageDps)} / s</strong></div>`);
  if(finite(effect.duration))metrics.push(`<div><span>Duration</span><strong>${number(effect.duration)} s</strong></div>`);
  if(finite(effect.totalDamage))metrics.push(`<div><span>One full application</span><strong>${number(effect.totalDamage)}</strong></div>`);
  if(finite(effect.damage))metrics.push(`<div><span>${category==='proc'?'Bonus on proc':'Damage per use / trigger'}</span><strong>${number(effect.damage)}</strong></div>`);
  if(finite(effect.chance))metrics.push(`<div><span>Proc chance</span><strong>${esc(effect.chanceLabel||`${number(effect.chance,2)}%`)}</strong></div>`);
  if(finite(effect.cooldown)&&effect.cooldown>0)metrics.push(`<div><span>Cooldown</span><strong>${number(effect.cooldown,2)} s</strong></div>`);
  if(category==='proc'&&finite(effect.expectedPerAttack))metrics.push(`<div><span>Expected bonus · ready proc</span><strong>${number(effect.expectedPerAttack)}</strong></div>`);
  if(finite(effect.manaBurn))metrics.push(`<div><span>Mana burned by this hit</span><strong>${number(effect.manaBurn)}</strong></div>`);
 }
 const status=off?(effect.active?'Not enabled':'Conditional effect not applied'):effect.needsInput?'Needs scenario input':effect.complete===false?'Effect data incomplete':null;
 const components=ready&&Array.isArray(effect.components)?effect.components.map(c=>`<p class="hero-duel-effect-component">${esc(c.name||c.damageType||c.type||'Component')}: ${finite(c.dps)?`${number(c.dps)} / s`:finite(c.damage)?number(c.damage):finite(c.totalDamage)?number(c.totalDamage):'see conditions'} ${esc(c.damageType||c.type||'')}</p>`).join(''):'';
 const sourceNotes=[...(effect.notes||[])];
 if(effect.forcedCritMultiplier)sourceNotes.unshift(`Opening attack critical: ×${number(effect.forcedCritMultiplier,2)}. The physical attack table above uses passive criticals; this guaranteed opening critical is not added to it.`);
 return `<article class="hero-duel-effect ${off?'hero-duel-effect-off':''}"><header><h4>${esc(effect.name||effect.id||'Item effect')}</h4><span>${esc(damageType)}</span></header>${status?`<p class="hero-duel-effect-status">${esc(status)}</p>`:''}${metrics.length?`<div class="hero-duel-effect-metrics">${metrics.join('')}</div>`:''}${components}${noteList(sourceNotes)}</article>`;
}

function physicalPanel(hit){
 if(hit?.ethereal)return `<div class="hero-duel-unavailable"><strong>Physical attacks are unavailable during the selected ethereal effect.</strong><p>An ethereal hero cannot attack or receive physical attack damage. Magical and already-applied damage effects below remain separate scenarios.</p></div>`;
 if(!finite(hit?.normalHit))return `<div class="hero-duel-unavailable"><strong>Physical hit estimate unavailable.</strong><p>${hit?.needsManualArmor?'The target has negative armor. Choose manual armor reduction and enter a tested value.':'Both hero loadouts need complete supported stats.'}</p>${hit?.missing?.length?`<ul>${hit.missing.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:''}</div>`;
 const metric=(label,value,sub='')=>`<div class="hero-duel-hit-metric"><span>${label}</span><strong>${value}</strong>${sub?`<small>${sub}</small>`:''}</div>`;
 return `<section class="hero-duel-physical">${!hit.complete?'<p class="hero-duel-incomplete-note">Landed-hit damage is known; accuracy or attack-rate data is incomplete. Expected attack values stay unavailable.</p>':''}<h4>Physical attacks received by this target</h4><div class="hero-duel-hit-grid">${metric(hit.bloodthorn?'Hit baseline before forced critical':'Normal landed hit',range(hit.normalMin,hit.normalMax),`Average ${number(hit.normalHit)}`)}${metric('Critical landed hit',hit.critChance>0?range(hit.criticalMin,hit.criticalMax):'—',hit.critChance>0?`≈${number(hit.critChance,2)}% critical · average ${number(hit.criticalHit)}`:'No passive critical item')}${metric('Expected damage / landed hit',number(hit.expectedLandedHit),'Normal and passive critical outcomes')}${metric('Chance to hit',finite(hit.hitChance)?`${number(hit.hitChance*100,2)}%`:'—','Against the target’s modeled evasion')}${metric('Expected damage / attempt',number(hit.expectedAttackDamage),'Includes misses')}${metric('Physical attack DPS',number(hit.dps),`${number(hit.attacksPerSecond,2)} attacks / s · extra effects below excluded`)}</div><p class="hero-duel-defense-note">Target armor: <strong>${number(hit.targetArmor,2)}</strong> · armor damage multiplier: <strong>×${number(hit.armorMultiplier,3)}</strong>${hit.buffsDefender.damageReduction?` · extra physical reduction: <strong>${number(hit.buffsDefender.damageReduction)}%</strong>`:''}</p>${hit.criticalTiers.length>1?`<details class="hero-duel-critical-tiers"><summary>Critical outcomes <span>⌄</span></summary>${hit.criticalTiers.map(t=>`<p>×${number(t.multiplier,2)}: ${range(t.min,t.max)} damage · ≈${number(t.chance,2)}% of attacks</p>`).join('')}</details>`:''}</section>`;
}

/** Pure markup renderer; active checkboxes are handled by the parent Duel module. */
export function renderHeroMatchup(state,first,second){
 const aBuild=state.a||{},bBuild=state.b||{};
 const aHero=heroFor(state,'a'),bHero=heroFor(state,'b');
 const firstAccuracy=attackAccuracyProfile(first?.totals||{},aBuild.slots);
 const secondAccuracy=attackAccuracyProfile(second?.totals||{},bBuild.slots);
 const firstTotals=withBloodthorn({...firstAccuracy.totals,physicalReduction:aBuild.physicalReduction,criticalOutcomes:first?.critical?.outcomes},aBuild);
 const secondTotals=withBloodthorn({...secondAccuracy.totals,physicalReduction:bBuild.physicalReduction,criticalOutcomes:second?.critical?.outcomes},bBuild);
 const ready=first?.complete===true&&second?.complete===true;
 const aArmor=itemArmorScenario(aBuild),bArmor=itemArmorScenario(bBuild),aBuffs=combinedHeroBuffs(aBuild),bBuffs=combinedHeroBuffs(bBuild);aBuffs.bonusArmor-=bArmor.reduction;bBuffs.bonusArmor-=aArmor.reduction;
 const combat=ready?compareHeroAttacks(firstTotals,secondTotals,{armorModel:state.armorModel,buffsA:aBuffs,buffsB:bBuffs}):null;
 if(combat){combat.aToB.notes.push(...aArmor.notes);combat.bToA.notes.push(...bArmor.notes);}
 if(combat){
  for(const [build,hit,accuracy] of [[aBuild,combat.aToB,firstAccuracy],[bBuild,combat.bToA,secondAccuracy]]){
   if(ownedActive(build,'bloodthorn')){hit.bloodthorn=true;hit.notes.push('Checked Bloodthorn assumes its5-second debuff is active: attacks cannot miss and their critical multiplier is at least×1.40. Higher passive critical outcomes take priority, rather than multiplying with it.');}
   else hit.notes.push(...accuracy.notes);
   if(ownedActive(build,'mask-of-madness'))hit.notes.push('Checked Mask of Madness: +110 attack speed and−8 armor are included for this side. The armor penalty also changes incoming attacks.');
   if(ownedActive(build,'swift-blink'))hit.notes.push('Checked Swift Blink: +50 attack damage and+50 attack speed are included during the6-second buff.');
  }
 }
 const applied=(build,id)=>Array.isArray(build.slots)&&build.slots.includes(id)&&enabledFor(build).includes(id);
 const ethereal=applied(aBuild,'ethereal-blade')||applied(bBuild,'ethereal-blade')||applied(aBuild,'ghost-scepter')||applied(bBuild,'ghost-scepter');
 if(combat&&ethereal){combat.aToB.ethereal=true;combat.bToA.ethereal=true;}
 const output=(side,attackerResult,defenderResult,attackerTotals,defenderTotals,hit)=>{
  const other=side==='a'?'b':'a',build=state[side]||{},sourceHero=side==='a'?aHero:bHero,targetHero=side==='a'?bHero:aHero;
  const attackerName=sourceHero?.name||'Attacker',defenderName=targetHero?.name||'Target';
  const buff=combinedHeroBuffs(build);
  const effectAttacker={...attackerTotals,damage:finite(attackerTotals.damage)?Math.max(0,attackerTotals.damage+buff.bonusDamage):null};
  const options=scenarioOptions(state,side,effectAttacker,defenderTotals,hit);
  let poison={active:false,effects:[],notes:[]},procs=[],extra=[],magic=null;
  if(ready){
   poison=poisonAgainstHero(effectAttacker,defenderTotals,build.slots||[],options);
   procs=attackProcEffects(effectAttacker,defenderTotals,build.slots||[],options);
   if(ethereal)procs=procs.map(p=>({...p,enabled:false,notes:['No new physical attack proc can be triggered while either hero is ethereal.',...(p.notes||[])]}));
   extra=extraDamageEffects(effectAttacker,defenderTotals,build.slots||[],options);
   magic=magicDamageContext(effectAttacker,defenderTotals,build.slots||[],options);
   if(ethereal&&poison.effects?.length)poison.notes.push('Poison numbers represent an existing application. No new poison attack can be made while a hero is ethereal.');
  }
  const allEffects=[...(poison.effects||[]).map(e=>({...e,_category:'poison'})),...procs.map(e=>({...e,_category:'proc'})),...extra.map(e=>({...e,_category:'extra'}))];
  const magicContext=magic?`<div class="hero-duel-magic-context"><span>Target magic resistance: <strong>${number(magic.baseMagicResistance)}%</strong> ${state[other]?.magicMode==='manual'?'· manual':magic.assumedBaseResistance?'· base assumption':'· automatic'}</span><span>Attacker spell amplification: <strong>${number(magic.spellAmplification,2)}%</strong></span><span>Incoming magic multiplier after selected debuffs: <strong>×${number(magic.postResistanceMultiplier,3)}</strong></span>${magic.missing?.length?`<p>${magic.missing.map(esc).join(' ')}</p>`:''}</div>`:'';
  const blockingItems=(state[other]?.slots||[]).filter(id=>['vanguard','crimson-guard','abyssal'].includes(id));
  const defenseLimit=blockingItems.length?'<p class="hero-duel-incomplete-note">This target carries damage block. Its block timing and ordering are not yet verified: physical hit figures above are before that additional block, not final in-game damage.</p>':'';
  const missing=ready?'':`<p class="hero-duel-incomplete-note">${unique([...(attackerResult?.missing||[]),...(defenderResult?.missing||[])]).map(esc).join(' ')||'Choose complete supported hero loadouts before calculating damage.'}</p>`;
  return `<article class="hero-duel-direction hero-duel-direction-${side}"><header class="hero-duel-direction-heading"><div>${sourceHero?heroImage(sourceHero,'hero-duel-portrait'):''}<div><span>${side.toUpperCase()} ATTACKS ${other.toUpperCase()}</span><h3>${esc(attackerName)} <i>→</i> ${esc(defenderName)}</h3><small>Damage received by ${esc(defenderName)}</small></div></div></header>${missing}${physicalPanel(hit)}${defenseLimit}<section class="hero-duel-extra-effects"><h4>Item damage effects · shown separately</h4><p class="hero-duel-separate-note">DoT applications, ready procs and checked active effects have different conditions. They are not added together or included in physical DPS.</p>${activeControls(state,side)}${magicContext}${allEffects.length?allEffects.map(e=>effectCard(e,e._category)).join(''):`<p class="hero-duel-no-effects">${ready?'No supported extra damage effect is active for this inventory. Passive stats and criticals remain included above.':'Extra damage effects need complete hero loadouts.'}</p>`}</section>${noteList(unique([...(hit?.notes||[]),...(poison.notes||[]),...(magic?.notes||[])]))}</article>`;
 };
 return `<section class="hero-duel-matchup"><div class="hero-duel-heading"><div><span class="duel-kicker">A REAL OPPONENT FOR EACH BUILD</span><h2>What each build deals into the other.</h2></div><span class="hero-duel-model-label">HERO vs HERO</span></div><p class="hero-duel-intro">Each direction uses the other hero’s defenses. Normal attacks, passive criticals and supported item damage effects are presented separately. This is a stated damage scenario, not a prediction of who wins a fight.</p><div class="hero-duel-directions">${output('a',first,second,firstTotals,secondTotals,combat?.aToB)}${output('b',second,first,secondTotals,firstTotals,combat?.bToA)}</div></section>`;
}
