import {HEROES} from './catalog.mjs';

const TEAM_TOOLS=[
 {tag:'reliable-disable',label:'Reliable disable',short:'disable',weight:6},
 {tag:'initiation',label:'Initiation',short:'initiation',weight:5},
 {tag:'wave-clear',label:'Wave clear',short:'wave clear',weight:4},
 {tag:'tower-damage',label:'Tower pressure',short:'tower pressure',weight:3},
 {tag:'save',label:'Saves & protection',short:'a save',weight:3},
];
const tagsOf=hero=>new Set(hero?.tags||[]);
const has=(hero,tag)=>tagsOf(hero).has(tag);
const rolesOf=hero=>(hero?.roles||[]).map(Number);
const unique=values=>[...new Set(values)];

/** These are user preferences, not inferred player skill or match statistics. */
export function normalizeDraftPreferences(input={}){
 return {
  search:typeof input?.search==='string'?input.search.slice(0,64):'',
  attackFilter:['melee','ranged'].includes(input?.attackFilter)?input.attackFilter:'all',
  focus:['team','enemy'].includes(input?.focus)?input.focus:'balanced',
 };
}

function detectEnemyThreats(enemies){
 const definitions=[
  {id:'illusions',label:'Illusions',detail:'Plan how to clear illusions and identify the real hero.',tags:['illusions','illusion','illusion-heavy'],responses:[{tag:'illusion-clear',label:'Illusion clear',weight:6,reason:'Adds illusion clear against the enemy’s illusion picks.'}]},
  {id:'initiation',label:'Fight starters',detail:'Enemy picks have initiation tags. Keep a defensive response ready.',tags:['initiation'],responses:[{tag:'save',label:'Defensive save',weight:3,reason:'Adds a defensive save to consider against enemy initiation.'},{tag:'reliable-disable',label:'Counter-initiation control',weight:2,reason:'Adds control that can help interrupt an enemy follow-up.'}]},
  {id:'tower-pressure',label:'Tower pressure',detail:'Enemy picks have tower-damage tags. Plan wave defense.',tags:['tower-damage'],responses:[{tag:'wave-clear',label:'Wave defense',weight:4,reason:'Adds wave clear to help defend against enemy tower pressure.'}]},
  {id:'frontline',label:'Frontline presence',detail:'At least two enemy picks have frontline tags. Plan target control and positioning.',tags:['frontline'],minCount:2,responses:[{tag:'reliable-disable',label:'Target control',weight:3,reason:'Adds target control to consider against the enemy’s frontline picks.'}]},
  {id:'farm-dependent',label:'Farm-dependent picks',detail:'At least two enemy picks are tagged farm-heavy. Consider a plan to contest their space.',tags:['farm-heavy'],minCount:2,responses:[{tag:'initiation',label:'Active pressure',weight:2,reason:'Adds initiation for an active plan against farm-dependent enemy picks.'},{tag:'tower-damage',label:'Objective pressure',weight:3,reason:'Adds tower pressure to help contest space against farm-dependent picks.'}]},
 ];
 return definitions.map(def=>({...def,heroIds:enemies.filter(h=>def.tags.some(t=>has(h,t))).map(h=>h.id)})).filter(threat=>threat.heroIds.length>=(threat.minCount||1));
}

/**
 * Enrich an already-normalized draft report with transparent, tag-based advice.
 * Scoring orders suggestions only. It is never a counter rating or win chance.
 * The report's existing coverage remains the current lineup; candidate coverage
 * is evaluated after removing the hero in the selected replacement position.
 */
export function enhanceDraftReport(report,input={},heroes=HEROES){
 const preferences=normalizeDraftPreferences(input),state=report.state;
 const catalog=new Map(heroes.map(h=>[h.id,h]));
 const allies=state.allies.filter(Boolean).map(id=>catalog.get(id)).filter(Boolean);
 const enemies=state.enemies.filter(Boolean).map(id=>catalog.get(id)).filter(Boolean);
 const replaced=state.allies[state.role-1];
 const retained=allies.filter(h=>h.id!==replaced);
 const coverage=TEAM_TOOLS.map(tool=>({...tool,count:retained.filter(h=>has(h,tool.tag)).length}));
 const gaps=coverage.filter(tool=>tool.count===0);
 const enemyThreats=detectEnemyThreats(enemies);
 const retainedTags=new Set(retained.flatMap(h=>h.tags||[]));
 const priorities=gaps.map(tool=>({id:tool.tag,tag:tool.tag,label:tool.label,weight:tool.weight,detail:`Not covered by the other ${retained.length} selected allied ${retained.length===1?'hero':'heroes'}.`,kind:'team'}));
 if(retained.length>=2&&!retainedTags.has('frontline'))priorities.push({id:'frontline',tag:'frontline',label:'Frontline',weight:2,detail:'The remaining allied picks have no frontline tag.',kind:'team'});
 for(const threat of enemyThreats){
  if(threat.id==='illusions'&&!retainedTags.has('illusion-clear'))priorities.unshift({id:'enemy-illusions',tag:'illusion-clear',label:'Illusion clear',weight:6,detail:'An enemy illusion hero is selected and the other allies have no illusion-clear tag.',kind:'enemy'});
 }
 const used=new Set([...state.allies,...state.enemies,...state.bans].filter(Boolean));
 const roleCandidates=heroes.filter(h=>!used.has(h.id)&&rolesOf(h).includes(state.role));
 const q=preferences.search.trim().toLocaleLowerCase();
 const candidates=roleCandidates.filter(h=>(preferences.attackFilter==='all'||h.attackType===preferences.attackFilter)&&(!q||`${h.name} ${h.alias||''}`.toLocaleLowerCase().includes(q)));
 const teamWeight=preferences.focus==='team'?1.4:preferences.focus==='enemy'?.8:1;
 const enemyWeight=preferences.focus==='enemy'?1.6:preferences.focus==='team'?.8:1;
 const retainedFarm=retained.filter(h=>has(h,'farm-heavy')).length;
 const recommendations=candidates.map(hero=>{
  const teamReasons=[],enemyReasons=[],fits=[],caveats=[],fills=[];
  let teamScore=0,enemyScore=0;
  for(const gap of gaps)if(has(hero,gap.tag)){
   teamScore+=gap.weight;fits.push(gap.label);fills.push(gap.tag);
   teamReasons.push(`Adds ${gap.short} to your lineup.`);
  }
  if(retained.length>=2&&!retainedTags.has('frontline')&&has(hero,'frontline')){
   teamScore+=2;teamReasons.push('Adds a frontline option to the remaining allied picks.');fits.push('Frontline');
  }
  for(const threat of enemyThreats)for(const response of threat.responses)if(has(hero,response.tag)){
   // Redundant control still has value, while an uncovered response gets priority.
   enemyScore+=response.weight*(retainedTags.has(response.tag)?.45:1);
   enemyReasons.push(response.reason);fits.push(response.label);
  }
  let penalty=0;
  if(retainedFarm>=2&&has(hero,'farm-heavy')){
   penalty+=6;caveats.push('Adds another farm-heavy hero; agree on farm priority before picking.');
  }
  if(retained.length>=2&&!has(hero,'reliable-disable')&&!retainedTags.has('reliable-disable'))caveats.push('The lineup would still lack a reliable-disable tag.');
  const afterCoverage=TEAM_TOOLS.map(tool=>({tag:tool.tag,label:tool.label,before:retained.filter(h=>has(h,tool.tag)).length,count:retained.filter(h=>has(h,tool.tag)).length+(has(hero,tool.tag)?1:0)}));
  const orderedReasons=preferences.focus==='enemy'?[...enemyReasons,...teamReasons]:[...teamReasons,...enemyReasons];
  if(!orderedReasons.length){const extra=coverage.find(tool=>has(hero,tool.tag));orderedReasons.push(extra?`Adds another source of ${extra.short}.`:`Fits position ${state.role}. Add more draft picks for specific advice.`);}
  const score=4+teamScore*teamWeight+enemyScore*enemyWeight-penalty;
  return {heroId:hero.id,hero,score,reasons:unique(orderedReasons).slice(0,3),teamReasons:unique(teamReasons),enemyReasons:unique(enemyReasons),fits:unique(fits).slice(0,4),fills,caveats,role:state.role,afterCoverage,tradeOff:caveats[0]||'Check lane matchups, execution and item choices before committing.'};
 }).sort((a,b)=>b.score-a.score||a.hero.name.localeCompare(b.hero.name)).slice(0,6);
 return {...report,preferences,enemyThreats,priorities:priorities.sort((a,b)=>b.weight-a.weight),recommendations,candidatesCount:candidates.length,rawCandidateCount:roleCandidates.length};
}
