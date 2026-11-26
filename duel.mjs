import {normalizeHeroBuffs} from './hero-combat.mjs';
import {renderHeroMatchup} from './hero-duel-view.mjs';
import {HEROES, ITEMS} from './catalog.mjs';
import {escapeHTML, heroImage, itemImage} from './common.mjs';
import {computeLoadout, SUPPORTED_HERO_IDS, SUPPORTED_ITEM_IDS, MAP_STAT_META} from './loadout.mjs';

const ARMOR_MODELS = new Set(['modern', 'classic', 'manual']);
const clamp = (value, min, max, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
};
const round = (value, digits = 1) => value === null ? '—' : Number.isFinite(value)
  ? value.toLocaleString('en-US', {maximumFractionDigits: digits, minimumFractionDigits: 0}) : '∞';
const esc = escapeHTML;

export function armorMultiplier(armor = 0, model = 'modern', reduction = 0) {
  const a = clamp(armor, -1000, 1000);
  if (model === 'manual') return 1 - clamp(reduction, -100, 100) / 100;
  if (model === 'classic') return a >= 0 ? 1 / (1 + 0.06 * a) : 2 - Math.pow(0.94, -a);
  // Developer's 7.00 positive-armor formula, corroborated by exact-map constants.
  // Its negative-armor extension is not established by those sources.
  if (a < 0) return null;
  return Math.max(0, 1 - (0.052 * a) / (0.9 + 0.048 * a));
}

function normalizeStats(stats = {}) {
  return {
    damage: clamp(stats.damage, 0, 100000),
    attackSpeed: clamp(stats.attackSpeed, 0, 2000, 100),
    baseAttackTime: clamp(stats.baseAttackTime, 0.1, 10, 1.7),
    hp: clamp(stats.hp, 0, 1000000),
    armor: clamp(stats.armor, -1000, 1000),
    evasion: clamp(stats.evasion, 0, 100),
    physicalReduction: clamp(stats.physicalReduction, -100, 100),
    critChance: clamp(stats.critChance, 0, 100),
    critMultiplier: clamp(stats.critMultiplier, 1, 10, 2),
    cost: clamp(stats.cost, 0, 1000000),
  };
}

function normalizeTarget(target = {}) {
  return {
    hp: clamp(target.hp, 0, 1000000, 2000),
    armor: clamp(target.armor, -1000, 1000, 10),
    evasion: clamp(target.evasion, 0, 100),
    physicalReduction: clamp(target.physicalReduction, -100, 100),
    incomingDps: clamp(target.incomingDps, 0, 1000000, 300),
    window: clamp(target.window, 0.1, 60, 5),
  };
}

/** Expected-value autoattacks only. All build inputs are final totals, not item bonuses. */
export function calculateCombat(build = {}, targetInput = {}, model = 'modern') {
  const stats = normalizeStats(build);
  const target = normalizeTarget(targetInput);
  const armorModel = ARMOR_MODELS.has(model) ? model : 'modern';
  const attacksPerSecond = stats.attackSpeed / (100 * stats.baseAttackTime);
  const critFactor = 1 + (stats.critChance / 100) * (stats.critMultiplier - 1);
  const hitChance = 1 - target.evasion / 100;
  const outgoingMultiplier = armorMultiplier(target.armor, armorModel, target.physicalReduction);
  const incomingMultiplier = armorMultiplier(stats.armor, armorModel, stats.physicalReduction);
  const ownHitChance = 1 - stats.evasion / 100;
  const rawDps = stats.damage * attacksPerSecond * critFactor;
  const dps = outgoingMultiplier === null ? null : rawDps * hitChance * outgoingMultiplier;
  const ehpDenominator = incomingMultiplier === null ? null : incomingMultiplier * ownHitChance;
  const effectiveHp = stats.hp === 0 ? 0 : ehpDenominator === null ? null : ehpDenominator === 0 ? Infinity : stats.hp / ehpDenominator;
  const timeToTarget = target.hp === 0 ? 0 : dps === null ? null : dps === 0 ? Infinity : target.hp / dps;
  const survivalTime = stats.hp === 0 ? 0 : effectiveHp === null ? null : target.incomingDps === 0 ? Infinity : effectiveHp / target.incomingDps;
  return {
    stats, target, armorModel, attacksPerSecond, critFactor, hitChance,
    outgoingMultiplier, incomingMultiplier, rawDps, dps, effectiveHp,
    damageInWindow: dps === null ? null : dps * target.window, timeToTarget, survivalTime,
    dpsPer1000Gold: stats.cost > 0 && dps !== null ? dps / stats.cost * 1000 : null,
    physicalReduction: incomingMultiplier === null ? null : 1 - incomingMultiplier,
    needsManualArmor: outgoingMultiplier === null || incomingMultiplier === null,
  };
}

export function compareBuilds(buildA = {}, buildB = {}, target = {}, model = 'modern') {
  const a = calculateCombat(buildA, target, model);
  const b = calculateCombat(buildB, target, model);
  const dpsDelta = a.dps === null || b.dps === null ? null : b.dps - a.dps;
  return {
    a, b, dpsDelta,
    dpsDeltaPercent: a.dps > 0 && dpsDelta !== null ? dpsDelta / a.dps * 100 : null,
    dpsWinner: dpsDelta === null ? null : Math.abs(dpsDelta) < 1e-9 ? 'tie' : dpsDelta > 0 ? 'b' : 'a',
    ehpWinner: a.effectiveHp === null || b.effectiveHp === null ? null : a.effectiveHp === b.effectiveHp ? 'tie' : a.effectiveHp > b.effectiveHp ? 'a' : 'b',
  };
}

const EXAMPLE = {
  title: 'Damage or durability?', heroId: 'drow', level: 25, armorModel: 'modern',
  calcMode: 'auto', comparisonMode: 'heroes', changeSlot: 0,
  target: {hp: 2400, armor: 12, evasion: 0, physicalReduction: 41.9, incomingDps: 300, window: 5},
  a: {name: 'Drow build', heroId:'drow',level:25,slots: ['skadi', 'heart', null, null, null, null]},
  b: {name: 'Axe build', heroId:'axe',level:25,slots: ['desolator', 'buriza', null, null, null, null]},
};

function manualStats(value = {}) {
  return {...normalizeStats(value), mana: clamp(value.mana,0,1000000), str:clamp(value.str,0,100000), agi:clamp(value.agi,0,100000), int:clamp(value.int,0,100000), hpRegen:clamp(value.hpRegen,0,100000), manaRegen:clamp(value.manaRegen,0,100000)};
}

export function resolveDuelBuild(build, heroId, level, mode = 'auto', compute = computeLoadout) {
  if (mode === 'manual') {
    const totals = manualStats(build);
    return {complete:true,totals:{...totals,damageMin:totals.damage,damageMax:totals.damage},missing:[],excludedEffects:['Manual final-stat override. Item changes do not alter these values.'],breakdown:[],evidence:'User-entered final stats.'};
  }
  let result;
  try { result=compute(heroId,level,build.slots,{healthPercent:build.healthPercent??100}); }
  catch { result={complete:false,totals:{},missing:['Loadout data could not be read.'],excludedEffects:[]}; }
  const totals=result?.totals||{};
  const required=['damage','armor','hp','attackSpeed','baseAttackTime'];
  const missing=Array.isArray(result?.missing)?[...result.missing]:[];
  for(const field of required)if(!Number.isFinite(totals[field]))missing.push(`Missing ${field} data.`);
  if(Number.isFinite(totals.baseAttackTime)&&totals.baseAttackTime<=0)missing.push('Base attack time must be positive.');
  return {...result,totals,complete:result?.complete===true&&missing.length===0,missing:[...new Set(missing)],excludedEffects:Array.isArray(result?.excludedEffects)?result.excludedEffects:[],breakdown:Array.isArray(result?.breakdown)?result.breakdown:[]};
}

export function normalizeItemChangeSlots(aSlots = [],bSlots = [],changeSlot = 0){
  const selected=Math.round(clamp(changeSlot,0,5));
  return Array.from({length:6},(_,index)=>index===selected?(bSlots[index]??null):(aSlots[index]??null));
}

function buildState(value = {}) {
  const source=value&&typeof value==='object'?value:{};
  const catalog=new Set(ITEMS.map(item=>item.id));
  const fallbackHero=HEROES.find(hero=>hero.id==='drow')||HEROES[0];
  const normalizeBuild=(build,fallback)=>({
    ...manualStats(build||{}),
    heroId:HEROES.some(h=>h.id===(build?.heroId??source.heroId??fallback.heroId))?(build?.heroId??source.heroId??fallback.heroId):fallbackHero.id,
    level:Math.round(clamp(build?.level??source.level,1,30,25)),
    buffs:normalizeHeroBuffs(build?.buffs),
    itemDebuffs:build?.itemDebuffs!==false,
    magicMode:build?.magicMode==='manual'?'manual':'auto',
    magicResistance:clamp(build?.magicResistance,-100,100,25),
    extraSpellAmp:clamp(build?.extraSpellAmp,-100,500),
    healthPercent:clamp(build?.healthPercent,0,100,100),
    manaPercent:clamp(build?.manaPercent,0,100,100),
    storedDamage:build?.storedDamage===null||build?.storedDamage===undefined?null:clamp(build.storedDamage,0,10000000),
    incomingDamage:build?.incomingDamage===null||build?.incomingDamage===undefined?null:clamp(build.incomingDamage,0,10000000),
    activeEffects:(Array.isArray(build?.activeEffects)?build.activeEffects:[]).filter(id=>catalog.has(id)).slice(0,30),
    name:typeof build?.name==='string'?build.name.slice(0,42):fallback.name,
    slots:Array.from({length:6},(_,index)=>catalog.has(build?.slots?.[index])?build.slots[index]:null),
  });
  const result={
    title:typeof source.title==='string'?source.title.slice(0,64):EXAMPLE.title,
    heroId:HEROES.some(hero=>hero.id===source.heroId)?source.heroId:fallbackHero?.id,
    level:Math.round(clamp(source.level,1,30,25)),
    armorModel:ARMOR_MODELS.has(source.armorModel)?source.armorModel:'modern',
    calcMode:source.calcMode==='manual'||(source.calcMode===undefined&&typeof source.a?.damage==='number'&&typeof source.b?.damage==='number')?'manual':'auto',
    comparisonMode:['item','heroes'].includes(source.comparisonMode)?source.comparisonMode:'builds',
    changeSlot:Math.round(clamp(source.changeSlot,0,5,0)),
    healthPercent:clamp(source.healthPercent,0,100,100),
    target:normalizeTarget({...EXAMPLE.target,...(source.target||{})}),
    a:normalizeBuild(source.a||EXAMPLE.a,EXAMPLE.a),
    b:normalizeBuild(source.b||EXAMPLE.b,EXAMPLE.b),
  };
  if(result.comparisonMode==='item')result.b.slots=normalizeItemChangeSlots(result.a.slots,result.b.slots,result.changeSlot);
  return result;
}

export {buildState as normalizeDuelState};

const fields=[
  ['damage','Average attack damage','',0,100000,1],
  ['attackSpeed','Total attack speed','Includes 100 base',0,2000,1],
  ['baseAttackTime','Base attack time','Seconds · BAT',0.1,10,0.01],
  ['hp','Maximum HP','',0,1000000,1],
  ['mana','Maximum mana','',0,1000000,1],
  ['hpRegen','HP regeneration','HP / second',0,100000,.01],
  ['manaRegen','Mana regeneration','MP / second',0,100000,.01],
  ['armor','Armor','Negative values supported',-1000,1000,0.1],
  ['evasion','Evasion','%',0,100,1],
];

export function mountDuel(root,{onSave=()=>{},onShare=()=>{},toast=()=>{},chooseHero=async()=>null,chooseItem=async()=>null}={}) {
  let state=buildState(EXAMPLE);
  const $=selector=>root.querySelector(selector);
  const heroById=id=>HEROES.find(hero=>hero.id===id);
  const itemById=id=>ITEMS.find(item=>item.id===id);
  const heroSupport=new Set(SUPPORTED_HERO_IDS),itemSupport=new Set(SUPPORTED_ITEM_IDS);
  const getState=()=>structuredClone(state);
  const derive=side=>resolveDuelBuild({...state[side],healthPercent:state.comparisonMode==='heroes'?state[side].healthPercent:state.healthPercent},state.comparisonMode==='heroes'?state[side].heroId:state.heroId,state.comparisonMode==='heroes'?state[side].level:state.level,state.calcMode);
  const input=(path,value,label,unit='',min=0,max=100000,step=1,extra='')=>`<label class="duel-field ${extra}"><span>${esc(label)}${unit?`<small>${esc(unit)}</small>`:''}</span><input type="number" data-duel-input="${path}" value="${esc(value)}" min="${min}" max="${max}" step="${step}" inputmode="decimal"></label>`;

  function slots(side){
    return `<div class="duel-slots" aria-label="Build ${side.toUpperCase()} six-slot inventory">${state[side].slots.map((id,index)=>{
      const item=itemById(id),editable=state.comparisonMode!=='item'||side==='a'||index===state.changeSlot;
      return `<div class="duel-slot ${state.comparisonMode==='item'&&index===state.changeSlot?'duel-change-slot':''} ${item&&!itemSupport.has(id)?'duel-unsupported-slot':''}"><button data-duel-item="${side}:${index}" ${editable?'':'disabled'} aria-label="Build ${side.toUpperCase()}, slot ${index+1}: ${esc(item?.name||'add item')}" title="${esc(item?.name||'Add item')}"><span class="duel-slot-num">${index+1}</span>${item?itemImage(item,'duel-item-icon'):'<span class="duel-slot-plus">＋</span>'}</button>${item&&editable?`<button class="duel-slot-remove" data-duel-remove="${side}:${index}" aria-label="Remove ${esc(item.name)} from build ${side.toUpperCase()}">×</button>`:''}</div>`;
    }).join('')}</div>`;
  }

  const buffInput=(side,key,label,unit,min,max,step=1)=>input(`${side}.${key}`,state[side].buffs[key],label,unit,min,max,step).replace('data-duel-input','data-duel-buff');
  const scenarioInput=(side,key,label,unit,min,max,step=1)=>input(`${side}.${key}`,state[side][key]??'',label,unit,min,max,step).replace('data-duel-input','data-duel-scenario');
  function heroSettings(side){
    if(state.comparisonMode!=='heroes')return '';
    const build=state[side],hero=heroById(build.heroId);
    return `<div class="duel-opponent-heading"><button class="duel-hero-button" data-duel-hero="${side}">${hero?heroImage(hero,'duel-hero-icon'):''}<span><small>HERO ${side.toUpperCase()}</small><strong>${esc(hero?.name||'Choose hero')} <i>⌄</i></strong></span></button>${input(`${side}.level`,build.level,'Level','This hero only',1,30,1)}</div>`;
  }
  function heroAdjustments(side){
    if(state.comparisonMode!=='heroes')return '';
    const build=state[side];
    return `<details class="duel-hero-adjustments"><summary>Buffs, resistance &amp; effect conditions <span>⌄</span></summary><p>Enter the numerical effect of a tested buff or debuff. These are scenario adjustments; named hero abilities are not inferred automatically. Selected item actives below apply only their documented effects; manual adjustments are additional. The base stat tiles above remain the unbuffed loadout.</p><label class="duel-debuff-toggle"><input type="checkbox" data-duel-item-debuffs="${side}" ${build.itemDebuffs?'checked':''}> Apply verified on-hit armor debuffs and close-range Cuirass aura</label><div class="duel-stat-grid">${buffInput(side,'bonusDamage','Extra attack damage','Flat final bonus from buffs',-100000,100000)}${buffInput(side,'bonusArmor','Armor adjustment','Positive buff / negative debuff',-1000,1000,.1)}${buffInput(side,'bonusAttackSpeed','Extra attack speed','From buffs / slows',-2000,2000)}${buffInput(side,'damageReduction','Physical damage reduction','% additional after armor',0,100,.1)}${scenarioInput(side,'extraSpellAmp','Extra spell amplification','% additional to INT / item amplification',-100,500,.1)}${scenarioInput(side,'healthPercent','Current health','% · for HP-based item effects',0,100)}${scenarioInput(side,'manaPercent','Current mana','% · for mana burn',0,100)}</div><label class="duel-field"><span>Magic resistance source</span><select data-duel-magic-mode="${side}"><option value="auto" ${build.magicMode==='auto'?'selected':''}>Automatic verified passives</option><option value="manual" ${build.magicMode==='manual'?'selected':''}>Enter final resistance</option></select></label>${scenarioInput(side,'magicResistance','Manual final magic resistance','% · used only with manual source',-100,100,.1)}<details><summary>Conditional damage inputs <span>⌄</span></summary><div class="duel-stat-grid">${scenarioInput(side,'storedDamage','Damage stored during silence','For Orchid / Bloodthorn; leave blank if unknown',0,10000000)}${scenarioInput(side,'incomingDamage','Incoming damage to reflect','For Blade Mail; leave blank if unknown',0,10000000)}</div><p>Conditional inputs describe one event or application, not continuous combat. Reflection and stored damage are shown separately.</p></details></details>`;
  }
  function buildPanel(side){
    const build=state[side];
    return `<section class="duel-build duel-build-${side}"><div class="duel-build-heading"><span class="duel-side-label">${side.toUpperCase()}</span><label class="sr-only" for="duel-${side}-name">Build ${side.toUpperCase()} name</label><input id="duel-${side}-name" class="duel-build-name" data-duel-text="${side}.name" value="${esc(build.name)}" maxlength="42"><span class="duel-final-tag">${state.calcMode==='auto'?'AUTO STATS':'OVERRIDE'}</span></div>${heroSettings(side)}${slots(side)}<p class="duel-inventory-note">${state.calcMode==='auto'?'Hero, level and supported item bonuses update these stats automatically.':'Manual override is active. Inventory changes do not update the numbers below.'}</p><div data-duel-stats="${side}"></div>${state.calcMode==='manual'?`<div class="duel-stat-grid">${fields.map(([id,label,unit,min,max,step])=>input(`${side}.${id}`,build[id],label,unit,min,max,step,id==='armor'?'duel-armor-field':'')).join('')}${input(`${side}.physicalReduction`,build.physicalReduction,'Physical reduction','% · manual armor model',-100,100,.1,'duel-manual-field')}</div><details class="duel-advanced"><summary>Critical strike, attributes &amp; budget <span>＋</span></summary><div class="duel-stat-grid">${input(`${side}.critChance`,build.critChance,'Final crit chance','% · one expected effect',0,100,.1)}${input(`${side}.critMultiplier`,build.critMultiplier,'Crit multiplier','× damage',1,10,.1)}${input(`${side}.cost`,build.cost,'Total build cost','Gold',0,1000000,1)}${['str','agi','int'].map(key=>input(`${side}.${key}`,build[key],key.toUpperCase(),'For stat comparison',0,100000,.1)).join('')}</div></details>`:''}${heroAdjustments(side)}<div data-duel-exclusions="${side}"></div></section>`;
  }

  function changeSummary(){
    if(state.comparisonMode!=='item')return '';
    const oldItem=itemById(state.a.slots[state.changeSlot]),newItem=itemById(state.b.slots[state.changeSlot]);
    return `<section class="duel-item-change"><div><span class="duel-kicker">ONE SLOT, ONE DECISION</span><h3>What changes if I replace this item?</h3></div><label>Slot<select data-duel-change-slot aria-label="Inventory slot to replace">${Array.from({length:6},(_,n)=>`<option value="${n}" ${state.changeSlot===n?'selected':''}>${n+1}</option>`).join('')}</select></label><div class="duel-change-items"><span>${oldItem?itemImage(oldItem,'duel-change-icon'):'◇'}<small>${esc(oldItem?.name||'Empty slot')}</small></span><b>→</b><button data-duel-item="b:${state.changeSlot}">${newItem?itemImage(newItem,'duel-change-icon'):'＋'}<small>${esc(newItem?.name||'Choose replacement')} ↗</small></button></div></section>`;
  }

  function render(){
    const hero=heroById(state.heroId);
    root.innerHTML=`<div class="duel-workspace"><div class="duel-toolbar"><div class="duel-scenario-name"><span>SCENARIO</span><label class="sr-only" for="duel-scenario">Scenario name</label><input id="duel-scenario" data-duel-text="title" maxlength="64" value="${esc(state.title)}"></div><div class="duel-toolbar-actions"><button class="duel-quiet-button" data-duel-action="example">↺ Reset</button><button class="duel-quiet-button" data-duel-action="share">↗ Share</button><button class="duel-solid-button" data-duel-action="save">＋ Save duel</button></div></div><div class="duel-mode-row"><div class="duel-mode-switch" aria-label="Comparison mode"><button data-duel-mode="heroes" class="${state.comparisonMode==='heroes'?'active':''}" aria-pressed="${state.comparisonMode==='heroes'}">⚔ Hero vs Hero</button><button data-duel-mode="builds" class="${state.comparisonMode==='builds'?'active':''}" aria-pressed="${state.comparisonMode==='builds'}">▦ Two builds</button><button data-duel-mode="item" class="${state.comparisonMode==='item'?'active':''}" aria-pressed="${state.comparisonMode==='item'}">⇄ Item change</button></div><span class="duel-catalog-count">${SUPPORTED_HERO_IDS.length} heroes · ${SUPPORTED_ITEM_IDS.length} inventory items</span></div><section class="duel-target-panel">${state.comparisonMode==='heroes'?'<div class="duel-hero-scenario-note"><strong>Two heroes. Two inventories.</strong> Choose each hero and level below. Physical hits are calculated into the opposing build; poison, burn and other item effects are shown separately.</div>':`<div class="duel-target-top"><button class="duel-hero-button" data-duel-action="hero">${hero?heroImage(hero,'duel-hero-icon'):''}<span><small>YOUR HERO</small><strong>${esc(hero?.name||'Choose hero')} <i>⌄</i></strong></span></button>${input('level',state.level,'Hero level','Updates both builds',1,30,1)}${input('healthPercent',state.healthPercent,'Current health','% · regen comparison',0,100,1)}</div>`}<details class="duel-target-settings"><summary>${state.comparisonMode==='heroes'?'Armor model &amp; assumptions':'Optional: target &amp; damage scenario'} <span>⌄</span></summary><div class="duel-target-settings-body"><label class="duel-field duel-model-field"><span>Armor model<small>Choose your assumption</small></span><select data-duel-model aria-label="Armor calculation model"><option value="modern" ${state.armorModel==='modern'?'selected':''}>Modern Allstars model</option><option value="classic" ${state.armorModel==='classic'?'selected':''}>Classic Warcraft model</option><option value="manual" ${state.armorModel==='manual'?'selected':''}>Enter physical reduction</option></select></label><div class="duel-target-fields" ${state.comparisonMode==='heroes'?'hidden':''}>${input('target.hp',state.target.hp,'Target HP','',0,1000000,1)}${input('target.armor',state.target.armor,'Target armor','',-1000,1000,.1,'duel-armor-field')}${input('target.physicalReduction',state.target.physicalReduction,'Target reduction','% · manual',-100,100,.1,'duel-manual-field')}${input('target.evasion',state.target.evasion,'Target evasion','%',0,100,1)}${input('target.incomingDps',state.target.incomingDps,'Incoming physical DPS','Before armor / evasion',0,1000000,1)}${input('target.window',state.target.window,'Damage window','Seconds',.1,60,.1)}</div><div class="duel-model-note" data-duel-model-note></div></div></details></section>${changeSummary()}<div class="duel-build-actions"><span>${state.comparisonMode==='heroes'?'A ATTACKS B · B ATTACKS A':state.comparisonMode==='item'?'A = BASELINE · B = ONE-ITEM CHANGE':'COMPARE TWO SIX-SLOT LOADOUTS'}</span><div><button class="duel-quiet-button" data-duel-action="critical-example">1 vs 2 Buriza</button><button class="duel-quiet-button" data-duel-action="copy">Copy A → B</button><button class="duel-quiet-button" data-duel-action="swap">⇄ Swap builds</button></div></div><div class="duel-build-grid">${buildPanel('a')}${buildPanel('b')}</div><details class="duel-override"><summary>Advanced · manual stat override <span>⌄</span></summary><div><label><input type="checkbox" data-duel-manual ${state.calcMode==='manual'?'checked':''}> Override automatic stats</label><p>Optional: enter tested final values for special conditions. Automatic hero and item calculation is the default.</p></div></details><section class="duel-results" aria-label="Build comparison results"><div class="duel-results-heading"><div><span class="duel-kicker">THE TRADE-OFF</span><h2>${state.comparisonMode==='heroes'?'What each hero takes.':'Same hero. Clear differences.'}</h2></div><span class="duel-model-badge">${state.comparisonMode==='heroes'?'HITS & ITEM EFFECTS':'BASE PHYSICAL ATTACKS'}</span></div><div data-duel-results></div></section><details class="duel-methodology"><summary>Data sources &amp; what is included <span>⌄</span></summary><div><p><strong>Automatic stats:</strong> ${esc(MAP_STAT_META.description||'Hero attributes, level gains and supported item bonuses are derived from the target map data.')} Source: ${esc(MAP_STAT_META.source||'Target map data')}.</p><p><strong>Expected physical DPS</strong> = average attack damage × attacks per second × expected critical multiplier × chance to hit × target armor multiplier. Attacks per second = total attack speed ÷ (100 × base attack time). An engine-specific attack-speed cap is not applied; unusually high-AS setups need in-game confirmation.</p><p><strong>Regeneration:</strong> hero base + 0.1 HP/s per STR or 0.05 MP/s per INT + item regen. Heart adds 1% max HP per copy and 1.5% missing HP once; the strongest Sange-family HP regen amplification applies. Current health affects Heart regeneration. External buffs, debuffs and learned abilities are excluded.</p><p><strong>Physical effective HP</strong> = HP ÷ (armor multiplier × chance for an incoming attack to land). Time estimates assume uninterrupted, constant physical attacks and exclude healing or regeneration; regeneration is shown separately. Base attacks are calculated; excluded item procs, active abilities and hero modifiers are listed per build.</p><p><strong>Modern Allstars armor:</strong> positive-armor reduction = 0.052 × armor ÷ (0.9 + 0.048 × armor), documented in the <a href="https://d1stats.ru/dota-700-changelog/?lang=en" target="_blank" rel="noopener noreferrer">developer’s 7.00 changelog ↗</a>, with matching constants in v7.07b1. The multiplier is floored at zero. For negative armor, enter a tested manual reduction percentage.</p><p>Advanced manual overrides use the final values you enter. Passive item critical effects use a long-run independent approximation: 1 − product(1 − chance). Each copy rolls separately; the highest successful multiplier wins. The exact map uses PRD, so the next attack’s chance depends on hidden history. Critical damage shown is before armor and evasion. Bloodthorn and Silver Edge active guarantees, hero critical skills and other temporary buffs are excluded. Two builds and Item change use a shared target. Hero vs Hero uses the opposing loadout’s armor, resistance and selected effect conditions. Verified single-source on-hit armor debuffs and the close-range Cuirass aura are optional; mixed unverified corruption stacking needs tested manual adjustments.</p></div></details></div>`;
    updateModelFields();refreshOutputs();
  }

  function updateModelFields(){
    const manual=state.armorModel==='manual';
    root.querySelectorAll('.duel-armor-field').forEach(element=>element.hidden=manual);
    root.querySelectorAll('.duel-manual-field').forEach(element=>element.hidden=!manual);
    $('[data-duel-model-note]').textContent=manual?'Uses the physical-reduction percentages you enter. Negative reduction amplifies physical damage.':state.armorModel==='classic'?'Explicit classic assumption: positive armor uses 1 ÷ (1 + 0.06 × armor); negative armor uses 2 − 0.94^(−armor).':'Modern Allstars: positive-armor reduction = 0.052 × armor ÷ (0.9 + 0.048 × armor). For negative armor, use tested manual reduction.';
  }

  function renderAutoStats(side,result){
    const t=result.totals;
    const value=key=>Number.isFinite(t[key])?round(t[key],['armor','hpRegen','manaRegen'].includes(key)?2:1):'—';
    const damageRange=Number.isFinite(t.damageMin)&&Number.isFinite(t.damageMax)?`${round(t.damageMin,0)}–${round(t.damageMax,0)}`:value('damage');
    $(`[data-duel-stats="${side}"]`).innerHTML=state.calcMode==='auto'?`${!result.complete?'<div class="duel-incomplete-label">Partial stats · loadout data incomplete</div>':''}<div class="duel-auto-grid"><div class="duel-auto-stat duel-auto-damage"><span>ATTACK DAMAGE</span><strong>${damageRange}</strong><small>Average ${value('damage')}</small></div>${[['armor','ARMOR'],['hp','HEALTH'],['mana','MANA'],['hpRegen','HP REGEN / s'],['manaRegen','MP REGEN / s'],['attackSpeed','ATTACK SPEED'],['evasion','EVASION %'],['magicResistance','MAGIC RESIST %'],['cost','ITEM COST']].map(([key,label])=>`<div class="duel-auto-stat"><span>${label}</span><strong>${value(key)}</strong>${key==='attackSpeed'?`<small>BAT ${value('baseAttackTime')} s</small>`:key==='cost'?'<small>Gold</small>':''}</div>`).join('')}</div><div class="duel-attributes"><span><i>STR</i><strong>${value('str')}</strong></span><span><i>AGI</i><strong>${value('agi')}</strong></span><span><i>INT</i><strong>${value('int')}</strong></span></div>${state.armorModel==='manual'?`<div class="duel-manual-armor-input">${input(`${side}.physicalReduction`,state[side].physicalReduction,'Your physical reduction','% · tested value',-100,100,.1)}</div>`:''}`:'';
    const critical=result.critical;
    if(state.calcMode==='auto'&&result.complete&&critical){
      $(`[data-duel-stats="${side}"]`).innerHTML+=`<section class="duel-critical"><h3>Critical strikes</h3><div class="duel-auto-grid"><div class="duel-auto-stat"><span>CRITICAL CHANCE ≈</span><strong>${round(critical.critChance,2)}%</strong><small>Long-run estimate per landed attack</small></div><div class="duel-auto-stat"><span>AVERAGE CRITICAL HIT</span><strong>${critical.sources.length?round(critical.critDamage,1):'—'}</strong><small>Before armor · successful criticals only</small></div><div class="duel-auto-stat"><span>EXPECTED DAMAGE / HIT</span><strong>${round(critical.expectedHit,1)}</strong><small>Normal + critical outcomes</small></div></div>${critical.outcomes.map(o=>`<p><strong>×${round(o.multiplier,2)} critical:</strong> ${round(o.min,1)}–${round(o.max,1)} damage · ≈${round(o.probability*100,2)}% of attacks</p>`).join('')}<p class="duel-inventory-note">${critical.sources.length?`${critical.sources.length} passive critical item(s). Normal hit: ≈${round(critical.normalChance,2)}%. Highest successful multiplier wins; multipliers do not multiply.`:'No passive critical items equipped.'} Estimates use independent long-run rates. The map uses PRD; these are not guaranteed next-hit odds. Damage is before armor, evasion and temporary buffs.</p></section>`;
    }
    const missing=result.complete?'':`<div class="duel-data-missing"><strong>Loadout data is incomplete.</strong>${result.missing.map(message=>`<span>${esc(message)}</span>`).join('')}<small>Remove an unsupported item or choose a supported hero. No automatic combat verdict is given.</small></div>`;
    const excluded=result.excludedEffects.length?`<details class="duel-excluded"><summary>${result.excludedEffects.length} effect${result.excludedEffects.length===1?'':'s'} ${state.comparisonMode==='heroes'?'outside base stat tiles · see damage effects below':'outside this calculation'} <span>⌄</span></summary><ul>${result.excludedEffects.map(effect=>`<li>${esc(effect)}</li>`).join('')}</ul></details>`:'';
    const breakdown=result.breakdown.length?`<details class="duel-breakdown"><summary>How these stats are calculated <span>⌄</span></summary><div>${result.breakdown.map(entry=>`<p><strong>${esc(entry.label)}</strong><span>${esc(entry.value)}</span><small>${esc(entry.source)}</small></p>`).join('')}</div></details>`:'';
    const evidence=result.evidence?`<div class="duel-stat-evidence">${esc(result.evidence)}</div>`:'';
    $(`[data-duel-exclusions="${side}"]`).innerHTML=missing+breakdown+excluded+evidence;
  }

  function renderResults(first,second){
    if(state.comparisonMode==='heroes'){$('[data-duel-results]').innerHTML=renderHeroMatchup(state,first,second);return;}
    const aTotals={...first.totals,...(state.armorModel==='manual'?{physicalReduction:state.a.physicalReduction}:{})};
    const bTotals={...second.totals,...(state.armorModel==='manual'?{physicalReduction:state.b.physicalReduction}:{})};
    const a=first.complete?calculateCombat(aTotals,state.target,state.armorModel):null;
    const b=second.complete?calculateCombat(bTotals,state.target,state.armorModel):null;
    const comparison=a&&b?compareBuilds(aTotals,bTotals,state.target,state.armorModel):null;
    const maxDamage=Math.max(a?.damageInWindow??0,b?.damageInWindow??0,1);
    const metric=(label,av,bv,unit,winner=null,note='')=>`<div class="duel-metric"><div class="duel-metric-label"><strong>${label}</strong>${note?`<small>${note}</small>`:''}</div><div class="duel-metric-value ${winner==='a'?'is-leading':''}">${av}<span>${unit}</span></div><div class="duel-metric-value duel-value-b ${winner==='b'?'is-leading':''}">${bv}<span>${unit}</span></div></div>`;
    const output=(result,key,digits=1)=>result?round(result[key],digits):'—';
    const time=(result,key)=>result&&Number.isFinite(result[key])?round(result[key],2):'—';
    let summary='Complete both loadouts to compare their automatic combat stats.',tradeOff='Missing data is not treated as a zero bonus.';
    if(comparison){
      const base=Math.min(a.dps??0,b.dps??0),advantage=base>0?Math.abs(a.dps-b.dps)/base*100:null;
      summary=comparison.dpsWinner===null?'A supported target armor model is needed for the damage comparison.':comparison.dpsWinner==='tie'?'Both builds deal the same modeled base physical DPS in this scenario.':`${comparison.dpsWinner==='a'?state.a.name:state.b.name} deals ${advantage===null?'more':`${round(advantage)}% more`} modeled base physical DPS in this scenario.`;
      tradeOff=comparison.ehpWinner===null?'A supported armor model is needed for the durability comparison.':comparison.ehpWinner==='tie'?'Physical effective HP is equal.':`${comparison.ehpWinner==='a'?state.a.name:state.b.name} has higher physical effective HP.`;
    }
    const warnings=[];
    if(a?.needsManualArmor||b?.needsManualArmor)warnings.push('The modern model’s negative-armor extension is unverified. Choose manual physical reduction with tested values for the affected outputs.');
    if(a?.effectiveHp===Infinity||b?.effectiveHp===Infinity)warnings.push('100% avoidance prevents incoming physical attack damage in this model, not all damage in a real game.');
    if(state.target.incomingDps===0)warnings.push('Incoming physical DPS is zero, so survival time is unavailable.');
    if(a?.dps===0||b?.dps===0)warnings.push('A zero-DPS build cannot defeat a positive-HP target using this model.');
    const statFields=[['damage','Average attack damage'],['armor','Armor'],['hp','Health'],['mana','Mana'],['hpRegen','HP regen / s'],['manaRegen','MP regen / s'],['attackSpeed','Attack speed'],['str','Strength'],['agi','Agility'],['int','Intelligence'],['critChance','Critical chance (%)'],['critDamage','Average critical hit'],['expectedHit','Expected damage / hit'],['cost','Item cost']];
    const statTable=`<div class="duel-stat-comparison"><div class="duel-delta-heading"><strong>Every stat change, side by side.</strong><span>B − A</span></div><div class="duel-delta-row duel-delta-head"><span>STAT</span><span>A</span><span>B</span><span>CHANGE</span></div>${statFields.map(([key,label])=>{const av=first.totals[key],bv=second.totals[key],known=Number.isFinite(av)&&Number.isFinite(bv),delta=known?bv-av:null;return `<div class="duel-delta-row"><span>${label}</span><strong>${Number.isFinite(av)?round(av,['hpRegen','manaRegen'].includes(key)?2:1):'—'}</strong><strong>${Number.isFinite(bv)?round(bv,['hpRegen','manaRegen'].includes(key)?2:1):'—'}</strong><strong class="${delta>0?'duel-delta-positive':delta<0?'duel-delta-negative':''}">${delta===null?'—':delta===0?'—':`${delta>0?'+':''}${round(delta,['hpRegen','manaRegen'].includes(key)?2:1)}`}</strong></div>`;}).join('')}</div>`;
    $('[data-duel-results]').innerHTML=`${statTable}<div class="duel-verdict"><span class="duel-verdict-symbol">⇄</span><p><strong>${esc(summary)}</strong><span>${esc(tradeOff)}</span></p></div><div class="duel-result-table"><div class="duel-result-columns"><span>BASE ATTACK MODEL</span><strong><i>A</i> ${esc(state.a.name)}</strong><strong><i>B</i> ${esc(state.b.name)}</strong></div>${metric('Base physical DPS',output(a,'dps'),output(b,'dps'),'damage / s',comparison?.dpsWinner,'Excluded procs / abilities are omitted')}${metric('Physical effective HP',output(a,'effectiveHp',0),output(b,'effectiveHp',0),'expected EHP',comparison?.ehpWinner)}${metric('Time to target',time(a,'timeToTarget'),time(b,'timeToTarget'),'seconds',null,'Continuous-DPS estimate')}${metric('Physical survival',time(a,'survivalTime'),time(b,'survivalTime'),'seconds',null,'Before healing or regeneration')}${metric('DPS per 1,000 gold',output(a,'dpsPer1000Gold'),output(b,'dpsPer1000Gold'),'damage / s')}</div><div class="duel-damage-window"><div><strong>Expected damage over ${round(state.target.window)} seconds</strong><span>Uninterrupted attacks</span></div><div class="duel-chart-row"><span>A</span><div class="duel-chart-track"><div style="width:${(a?.damageInWindow??0)/maxDamage*100}%"></div></div><strong>${output(a,'damageInWindow',0)}</strong></div><div class="duel-chart-row duel-chart-b"><span>B</span><div class="duel-chart-track"><div style="width:${(b?.damageInWindow??0)/maxDamage*100}%"></div></div><strong>${output(b,'damageInWindow',0)}</strong></div></div>${warnings.length?`<div class="duel-warnings">${warnings.map(warning=>`<p>ⓘ ${esc(warning)}</p>`).join('')}</div>`:''}<div class="duel-output-note">Automatic stats plus a stated base-attack model. This comparison does not predict the winner of a fight.</div>`;
  }

  function refreshOutputs(){const a=derive('a'),b=derive('b');renderAutoStats('a',a);renderAutoStats('b',b);renderResults(a,b);}
  function setManual(enabled){
    if(enabled&&state.calcMode!=='manual')for(const side of ['a','b']){const result=derive(side);if(result.complete)Object.assign(state[side],manualStats({...state[side],...result.totals}));}
    state.calcMode=enabled?'manual':'auto';render();
  }
  function writeInput(path,value,isText=false){
    const [group,field]=path.split('.');
    if(isText){if(field&&['a','b'].includes(group)&&field==='name')state[group][field]=String(value).slice(0,42);else if(path==='title')state.title=String(value).slice(0,64);}
    else {const number=Number(value);if(field&&['a','b','target'].includes(group)&&Object.hasOwn(state[group],field)&&typeof state[group][field]==='number')state[group][field]=Number.isFinite(number)?number:0;else if(path==='level')state.level=Math.round(clamp(value,1,30,25));else if(path==='healthPercent')state.healthPercent=clamp(value,0,100,100);}
    if(state.calcMode==='auto'&&['a.physicalReduction','b.physicalReduction'].includes(path))renderResults(derive('a'),derive('b'));else refreshOutputs();
  }
  function syncSingleChange(side){if(state.comparisonMode==='item'&&side==='a')state.b.slots=normalizeItemChangeSlots(state.a.slots,state.b.slots,state.changeSlot);}

  root.addEventListener('input',event=>{const buff=event.target.closest('[data-duel-buff]'),scenario=event.target.closest('[data-duel-scenario]');if(buff){const [side,key]=buff.dataset.duelBuff.split('.');state[side].buffs[key]=Number(buff.value)||0;state[side].buffs=normalizeHeroBuffs(state[side].buffs);refreshOutputs();return;}if(scenario){const [side,key]=scenario.dataset.duelScenario.split('.');state[side][key]=scenario.value===''&&['storedDamage','incomingDamage'].includes(key)?null:Number(scenario.value)||0;refreshOutputs();return;}const number=event.target.closest('[data-duel-input]'),text=event.target.closest('[data-duel-text]');if(number)writeInput(number.dataset.duelInput,number.value);else if(text)writeInput(text.dataset.duelText,text.value,true);});
  root.addEventListener('change',event=>{
    if(event.target.dataset.duelItemDebuffs){state[event.target.dataset.duelItemDebuffs].itemDebuffs=event.target.checked;refreshOutputs();}
    if(event.target.dataset.duelMagicMode){const side=event.target.dataset.duelMagicMode;state[side].magicMode=event.target.value==='manual'?'manual':'auto';refreshOutputs();}
    if(event.target.dataset.duelEffect){const [side,id]=event.target.dataset.duelEffect.split(':');state[side].activeEffects=state[side].activeEffects.filter(x=>x!==id);if(event.target.checked)state[side].activeEffects.push(id);refreshOutputs();}
    if(event.target.matches('[data-duel-scenario]')){state=buildState(state);const [side,key]=event.target.dataset.duelScenario.split('.');event.target.value=state[side][key]??'';refreshOutputs();}
    if(event.target.matches('[data-duel-model]')){state.armorModel=ARMOR_MODELS.has(event.target.value)?event.target.value:'modern';updateModelFields();refreshOutputs();}
    if(event.target.matches('[data-duel-manual]'))setManual(event.target.checked);
    if(event.target.matches('[data-duel-change-slot]')){state.changeSlot=Math.round(clamp(event.target.value,0,5));state.b.slots=[...state.a.slots];render();}
    if(event.target.matches('[data-duel-input]')){state=buildState(state);const path=event.target.dataset.duelInput.split('.');event.target.value=path.length===2?state[path[0]][path[1]]:state[path[0]];refreshOutputs();}
  });
  root.addEventListener('click',async event=>{
    const mode=event.target.closest('[data-duel-mode]')?.dataset.duelMode;
    if(mode&&mode!==state.comparisonMode){state.comparisonMode=mode;if(mode==='item'){state.b={...structuredClone(state.a),name:'One-item change'};state.changeSlot=0;}render();return;}
    const heroButton=event.target.closest('[data-duel-hero]');if(heroButton){const side=heroButton.dataset.duelHero;if(['a','b'].includes(side)){const id=await chooseHero({title:`Choose hero ${side.toUpperCase()}`,excludeIds:HEROES.filter(h=>!heroSupport.has(h.id)).map(h=>h.id)});if(heroSupport.has(id)){state[side].heroId=id;render();}}return;}
    const item=event.target.closest('[data-duel-item]');
    if(item&&!item.disabled){const [side,indexString]=item.dataset.duelItem.split(':'),index=Number(indexString);const id=await chooseItem({title:`Build ${side.toUpperCase()} · slot ${index+1}`,excludeIds:ITEMS.filter(candidate=>!itemSupport.has(candidate.id)).map(candidate=>candidate.id)});if(itemSupport.has(id)){state[side].slots[index]=id;syncSingleChange(side);render();toast(state.calcMode==='auto'?'Item equipped. All supported stats updated automatically.':'Item label changed. Manual override values are unchanged.');}return;}
    const remove=event.target.closest('[data-duel-remove]');if(remove){const [side,index]=remove.dataset.duelRemove.split(':');state[side].slots[Number(index)]=null;syncSingleChange(side);render();return;}
    const action=event.target.closest('[data-duel-action]')?.dataset.duelAction;
    if(action==='hero'){const id=await chooseHero({title:'Choose a hero for this duel',excludeIds:HEROES.filter(hero=>!heroSupport.has(hero.id)).map(hero=>hero.id)});if(heroSupport.has(id)){state.heroId=id;render();toast(state.calcMode==='auto'?'Hero changed. Both builds recalculated.':'Hero context changed. Manual overrides stay unchanged.');}}
    else if(action==='swap'){[state.a,state.b]=[state.b,state.a];render();}
    else if(action==='copy'){state.b={...structuredClone(state.a),name:`${state.a.name.slice(0,30)} · copy`};render();toast(state.comparisonMode==='item'?'Baseline copied. Choose a replacement item.':'Build A copied to B.');}
    else if(action==='critical-example'){state.calcMode='auto';state.comparisonMode='builds';state.title='One Buriza vs two Buriza';state.a.name='One Buriza';state.b.name='Two Buriza';state.a.slots=['buriza',null,null,null,null,null];state.b.slots=['buriza','buriza',null,null,null,null];render();toast('Comparing one versus two Buriza on the selected hero.');}
    else if(action==='example'){state=buildState(EXAMPLE);render();toast('Automatic example loadouts restored.');}
    else if(action==='save'){state=buildState(state);onSave({type:'duel',title:state.title||'Build Duel',state:getState()});}
    else if(action==='share'){state=buildState(state);onShare({type:'duel',state:getState()});}
  });
  render();
  return {getState,setState(value){state=buildState(value);render();},reset(){state=buildState(EXAMPLE);render();}};
}
