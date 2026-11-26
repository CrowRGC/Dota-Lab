import {enhanceDraftReport,normalizeDraftPreferences} from './draft-advice.mjs';
import {HEROES} from './catalog.mjs';
import {escapeHTML,heroImage} from './common.mjs';

const ROLES=[{id:1,label:'Carry',short:'Carry'},{id:2,label:'Mid',short:'Mid'},{id:3,label:'Offlane',short:'Offlane'},{id:4,label:'Soft support',short:'Support'},{id:5,label:'Hard support',short:'Hard supp.'}];
const COVERAGE=[
  {tag:'reliable-disable',label:'Reliable disable',short:'disable',weight:6,description:'A dependable way to hold a target in place.'},
  {tag:'initiation',label:'Initiation',short:'initiation',weight:5,description:'A hero who can start the fight.'},
  {tag:'wave-clear',label:'Wave clear',short:'wave clear',weight:4,description:'A way to defend and clear creep waves.'},
  {tag:'tower-damage',label:'Tower pressure',short:'tower pressure',weight:3,description:'A way to turn an advantage into buildings.'},
  {tag:'save',label:'Saves & protection',short:'a save',weight:3,description:'A way to protect a teammate in trouble.'},
];
const tagSet=h=>new Set(Array.isArray(h?.tags)?h.tags:[]);
const roleList=h=>(Array.isArray(h?.roles)?h.roles:[]).map(Number).filter(n=>n>=1&&n<=5);
const clone=s=>JSON.parse(JSON.stringify(s));

export function normalizeDraftState(input={},heroes=HEROES){
  const catalog=new Map(heroes.map(h=>[h.id,h]));
  const used=new Set();
  const normalizeSide=side=>Array.from({length:5},(_,i)=>{const id=Array.isArray(side)?side[i]:null;if(typeof id!=='string'||!catalog.has(id)||used.has(id))return null;used.add(id);return id;});
  const allies=normalizeSide(input?.allies),enemies=normalizeSide(input?.enemies);
  const bans=[];
  for(const id of Array.isArray(input?.bans)?input.bans:[]){if(typeof id==='string'&&catalog.has(id)&&!used.has(id)){bans.push(id);used.add(id);}if(bans.length===20)break;}
  const role=Number(input?.role);
  return {...normalizeDraftPreferences(input),name:typeof input?.name==='string'?input.name.slice(0,48):'My draft',role:Number.isInteger(role)&&role>=1&&role<=5?role:5,allies,enemies,bans};
}

/** A role-filtered recommendation always belongs in that role's slot. */
export function applyDraftRecommendation(input,heroId,heroes=HEROES){
  const state=normalizeDraftState(input,heroes),hero=heroes.find(h=>h.id===heroId);
  const used=new Set([...state.allies,...state.enemies,...state.bans].filter(Boolean));
  if(!hero||!roleList(hero).includes(state.role)||used.has(heroId))return state;
  state.allies[state.role-1]=heroId;
  return state;
}

/** Transparent tag-based advice. Scores are only an ordering heuristic, never a win probability. */
export function analyzeDraft(input={},heroes=HEROES){
  const state=normalizeDraftState(input,heroes),catalog=new Map(heroes.map(h=>[h.id,h]));
  const allies=state.allies.filter(Boolean).map(id=>catalog.get(id));
  const enemies=state.enemies.filter(Boolean).map(id=>catalog.get(id));
  const coverage=COVERAGE.map(c=>({...c,count:allies.filter(h=>tagSet(h).has(c.tag)).length}));
  const gaps=coverage.filter(c=>c.count===0);
  const farmHeavy=allies.filter(h=>tagSet(h).has('farm-heavy')).length;
  const illusionThreat=enemies.some(h=>['illusions','illusion','illusion-heavy'].some(t=>tagSet(h).has(t)));
  const illusionClear=allies.some(h=>tagSet(h).has('illusion-clear'));
  const needsIllusionClear=illusionThreat&&!illusionClear;
  // Assess a replacement against the other four picks, while keeping the
  // snapshot above an honest account of the lineup currently on the board.
  const replacingHeroId=state.allies[state.role-1];
  const remainingAllies=allies.filter(h=>h.id!==replacingHeroId);
  const recommendationCoverage=COVERAGE.map(c=>({...c,count:remainingAllies.filter(h=>tagSet(h).has(c.tag)).length}));
  const recommendationGaps=recommendationCoverage.filter(c=>c.count===0);
  const recommendationFarmHeavy=remainingAllies.filter(h=>tagSet(h).has('farm-heavy')).length;
  const recommendationNeedsIllusionClear=illusionThreat&&!remainingAllies.some(h=>tagSet(h).has('illusion-clear'));
  const used=new Set([...state.allies,...state.enemies,...state.bans].filter(Boolean));
  const candidates=heroes.filter(h=>!used.has(h.id)&&roleList(h).includes(state.role));
  const recommendations=candidates.map(hero=>{
    const tags=tagSet(hero),reasons=[],fits=[];
    let score=4;
    for(const gap of recommendationGaps)if(tags.has(gap.tag)){score+=gap.weight;fits.push(gap.label);reasons.push(`Adds ${gap.short} to your lineup.`);}
    if(recommendationNeedsIllusionClear&&tags.has('illusion-clear')){score+=5;fits.push('Illusion clear');reasons.unshift('Adds a way to deal with the enemy’s illusion heroes.');}
    if(!reasons.length){
      const extra=recommendationCoverage.find(c=>tags.has(c.tag));
      if(extra){reasons.push(`Adds another source of ${extra.short}.`);fits.push(extra.label);}
      else reasons.push(`Fits your selected position: ${ROLES[state.role-1].label}.`);
    }
    const caveats=[];
    if(recommendationFarmHeavy>=2&&tags.has('farm-heavy')){score-=6;caveats.push('Adds another farm-heavy hero to an already greedy lineup.');}
    return {heroId:hero.id,hero,score,reasons:reasons.slice(0,3),fits:fits.slice(0,3),caveats,role:state.role};
  }).sort((a,b)=>b.score-a.score||a.hero.name.localeCompare(b.hero.name)).slice(0,3);
  const warnings=[];
  if(farmHeavy>=2)warnings.push({id:'farm-heavy',title:'Watch the farm distribution.',text:`${farmHeavy} allied picks are tagged as farm-heavy. Decide who gets lane and jungle priority.`});
  if(needsIllusionClear)warnings.push({id:'illusion-clear',title:'Plan for illusions.',text:'An enemy pick uses illusions, and your selected allies have no illusion-clear tag yet.'});
  if(allies.length===0)warnings.push({id:'empty',title:'Start with the picks you know.',text:'Advice becomes more specific as you add allied and enemy heroes.'});
  return enhanceDraftReport({state,allies,enemies,coverage,gaps,farmHeavy,needsIllusionClear,warnings,recommendations,complete:allies.length===5,recommendationContext:{roleIndex:state.role-1,replacingHeroId,coverage:recommendationCoverage,gaps:recommendationGaps}},state,heroes);
}

function sampleDraft(heroes=HEROES){
  const used=new Set(),allies=Array(5).fill(null),enemies=Array(5).fill(null);
  const preferred=['drow','puck','centaur','rubick'];
  for(let i=0;i<4;i++){
    const hero=heroes.find(h=>h.id===preferred[i]&&!used.has(h.id))||heroes.find(h=>!used.has(h.id)&&roleList(h).includes(i+1));
    if(hero){allies[i]=hero.id;used.add(hero.id);}
  }
  const enemyNames=['anti-mage','viper','huskar','ursa'];
  for(let i=0;i<4;i++){
    const hero=heroes.find(h=>h.id===enemyNames[i]&&!used.has(h.id))||heroes.find(h=>!used.has(h.id));
    if(hero){enemies[i]=hero.id;used.add(hero.id);}
  }
  return normalizeDraftState({name:'The next pick',role:5,allies,enemies,bans:[]},heroes);
}

export function mountDraft(root,{onSave=()=>{},onShare=()=>{},toast=()=>{},chooseHero=async()=>null}={}){
  let state=sampleDraft(),busy=false,pickHistory=[];
  const catalog=new Map(HEROES.map(h=>[h.id,h]));
  const escape=escapeHTML;
  const img=(h,className='')=>heroImage(h,className);
  const remember=()=>{pickHistory.push(clone(state));if(pickHistory.length>20)pickHistory.shift();};
  const sideMarkup=(side,title,subtitle)=>{
    const ids=state[side],count=ids.filter(Boolean).length;
    return `<section class="panel draft-team draft-team-${side}" aria-label="${title}"><header class="draft-panel-head"><div><span class="draft-team-dot"></span><h2>${title}</h2><small>${subtitle}</small></div><span class="draft-pick-count">${count}<i>/ 5</i></span></header><div class="draft-slots">${ids.map((id,index)=>{
      const hero=catalog.get(id),role=ROLES[index];
      return `<div class="draft-slot ${hero?'is-picked':'is-empty'} ${side==='allies'&&index+1===state.role?'is-your-role':''}"><button class="draft-pick" data-draft-pick="${side}:${index}" aria-label="${hero?'Replace '+escape(hero.name):'Choose hero'} for ${side==='allies'?escape(role.label):'enemy pick '+(index+1)}">${hero?`<div class="draft-portrait">${img(hero)}</div><strong>${escape(hero.name)}</strong>`:'<span class="draft-add">＋</span><strong>Choose hero</strong>'}<small>${side==='allies'?`P${index+1} · ${escape(role.short)}`:`Pick ${index+1}`}</small></button>${hero?`<button class="draft-remove" data-draft-remove="${side}:${index}" aria-label="Remove ${escape(hero.name)} from ${side}">×</button>`:''}</div>`;
    }).join('')}</div></section>`;
  };
  const enemyPanel=report=>`<section class="draft-enemy-read" aria-label="Enemy lineup patterns"><div class="draft-section-label">READ THE OTHER SIDE</div><h3>${report.enemies.length?'What the enemy lineup brings.':'Add enemy picks for more context.'}</h3>${report.enemyThreats.length?report.enemyThreats.map(t=>`<div class="draft-threat"><div><strong>${escape(t.label)}</strong><span>${t.heroIds.map(id=>escape(catalog.get(id)?.name||id)).join(' · ')}</span></div><p>${escape(t.detail)}</p></div>`).join(''):`<p>${report.enemies.length?'No specific enemy pattern is flagged by the current tags. Keep checking the actual lane matchup and abilities.':'Suggestions can respond to illusion picks, initiation and tower pressure once those heroes are on the board.'}</p>`}</section>`;
  function recommendationCard(r,index,report){
    const h=r.hero,replacing=Boolean(state.allies[state.role-1]);
    const teamReasons=r.teamReasons.slice(0,3),enemyReasons=r.enemyReasons.slice(0,2);
    const changes=r.afterCoverage.map(c=>({...c,current:report.coverage.find(x=>x.tag===c.tag)?.count||0})).filter(c=>c.current!==c.count);
    return `<article class="draft-rec-card ${index===0?'draft-rec-featured':''}"><div class="draft-rec-hero"><div class="draft-rec-portrait">${img(h)}</div><div><span class="draft-rec-number">${index===0?'FIRST TO REVIEW':`ALTERNATIVE ${index}`}</span><h3>${escape(h.name)}</h3><small>${escape(h.alias||'')} · ${h.attackType==='melee'?'Melee':'Ranged'}</small></div></div><div class="draft-fit-tags">${r.fits.length?r.fits.map(f=>`<span>${escape(f)}</span>`).join(''):`<span>Position ${state.role} option</span>`}</div>${teamReasons.length?`<div class="draft-reason-group"><h4>TEAM FIT</h4><ul>${teamReasons.map(reason=>`<li>${escape(reason)}</li>`).join('')}</ul></div>`:''}${enemyReasons.length?`<div class="draft-reason-group draft-reason-enemy"><h4>ENEMY LINEUP</h4><ul>${enemyReasons.map(reason=>`<li>${escape(reason)}</li>`).join('')}</ul></div>`:''}${!teamReasons.length&&!enemyReasons.length?`<p class="draft-rec-neutral">${escape(r.reasons[0])}</p>`:''}<details class="draft-impact"><summary>If you ${replacing?'replace this pick':'add this hero'} <span>⌄</span></summary><div><small>Current team → after this pick</small>${changes.length?changes.map(c=>`<p><span>${escape(c.label)}</span><strong class="${c.count>c.current?'is-gain':'is-loss'}">${c.current} → ${c.count}</strong></p>`).join(''):'<p>No change to the five tracked team tools.</p>'}<p class="draft-impact-note">Counts show heroes with each tag, not ability strength.</p></div></details>${r.caveats.map(c=>`<p class="draft-rec-caveat">△ ${escape(c)}</p>`).join('')}<button class="draft-rec-add" data-draft-recommend="${h.id}" ${replacing?`aria-label="Replace ${escape(catalog.get(state.allies[state.role-1]).name)} with ${escape(h.name)} in position ${state.role}"`:''}>${replacing?`Replace P${state.role} <span>↻</span>`:`Add to P${state.role} <span>＋</span>`}</button></article>`;
  }
  function render(){
    const report=analyzeDraft(state),oldHero=catalog.get(state.allies[state.role-1]);
    root.classList.add('draft-lab');
    root.innerHTML=`<div class="draft-intro"><div><div class="draft-eyebrow">DRAFT LAB · HERO SUGGESTIONS</div><h2>A reason behind your next pick.</h2><p>Add the picks you know. Choose your position. Explore heroes that fill the gaps.</p></div><div class="draft-context-count"><strong>${report.allies.length+report.enemies.length}<span>/ 10</span></strong><small>known picks</small></div></div><div class="draft-toolbar"><label class="draft-name-label"><span>YOUR DRAFT</span><input data-draft-name maxlength="48" value="${escape(state.name)}" aria-label="Draft name" placeholder="Name your draft"></label><div class="draft-actions"><button class="draft-text-button" data-draft-action="sample">↺ Example</button><button class="draft-text-button" data-draft-action="clear">Start my draft</button><button class="draft-outline-button" data-draft-action="undo-pick" ${pickHistory.length?'':'disabled'}>↶ Undo edit</button><button class="draft-outline-button" data-draft-action="save">＋ Save draft</button><button class="draft-primary-button" data-draft-action="share">Share draft ↗</button></div></div><div class="draft-role-bar"><span>MY NEXT PICK</span><div role="group" aria-label="Your preferred position">${ROLES.map(r=>`<button class="${state.role===r.id?'active':''}" data-draft-role="${r.id}" aria-pressed="${state.role===r.id}"><small>${r.id}</small>${r.label}</button>`).join('')}</div></div><div class="draft-layout"><div class="draft-teams">${sideMarkup('allies','Your team','Allied slots follow positions 1–5.')}${sideMarkup('enemies','Enemy team','Enemy slots are picks, not assumed roles.')}<section class="panel draft-bans"><div><span class="draft-ban-icon">⊘</span><strong>Unavailable heroes</strong><small>Exclude bans and unwanted options.</small></div><div class="draft-ban-list">${state.bans.map(id=>{const h=catalog.get(id);return `<span class="draft-ban-chip">${img(h)}<span>${escape(h.name)}</span><button data-draft-unban="${id}" aria-label="Remove ban on ${escape(h.name)}">×</button></span>`;}).join('')}<button class="draft-ban-add" data-draft-action="ban">＋ Add ban</button></div></section>${enemyPanel(report)}</div><aside class="draft-snapshot" aria-label="Allied lineup coverage"><div class="draft-snapshot-kicker"><span>⌁</span> YOUR TEAM RIGHT NOW</div><h2>${report.gaps.length===0?'Your basics are covered.':report.gaps.length<=2?'A few gaps to think about.':'Give your team a shape.'}</h2><p>Five team tools, checked against your selected heroes’ ability tags.</p><div class="draft-coverage">${report.coverage.map(c=>`<div class="draft-coverage-row"><div><span>${c.label}</span><small class="${c.count?'covered':'missing'}">${c.count?`${c.count} ${c.count===1?'hero':'heroes'}`:'Not covered'}</small></div><div class="draft-pips" aria-label="${escape(c.label)}: ${c.count} allied heroes">${Array.from({length:5},(_,i)=>`<span class="${i<c.count?'filled':''}"></span>`).join('')}</div></div>`).join('')}</div>${report.warnings.length?`<div class="draft-warnings">${report.warnings.map(w=>`<article><strong>↗ ${escape(w.title)}</strong><p>${escape(w.text)}</p></article>`).join('')}</div>`:'<div class="draft-positive">↗ A covered tool can still be reinforced by another hero.</div>'}</aside></div><section class="draft-recommendations" aria-label="Suggested next picks"><div class="draft-rec-heading"><div><div class="draft-eyebrow">YOUR NEXT PIECE · POSITION ${state.role}</div><h2>${oldHero?`Review your ${ROLES[state.role-1].label.toLowerCase()} pick.`:`Find your ${ROLES[state.role-1].label.toLowerCase()}.`}</h2></div><p>${oldHero?`Replaces ${escape(oldHero.name)} in P${state.role}.`:`Adds a hero to P${state.role}.`}<br><span>The other four allied positions stay in place.</span></p></div><div class="draft-pick-brief"><div><strong>${report.allies.length?'What this pick should help with':'Build the picture first'}</strong><p>${report.allies.length?oldHero?'Priorities below are calculated without the hero you would replace.':'Look for tools not yet covered by the allied picks.':'Add allied picks to make these general suggestions more specific.'}</p></div><div class="draft-priority-tags">${report.priorities.slice(0,4).map(p=>`<span title="${escape(p.detail)}">${escape(p.label)}</span>`).join('')||'<span>Reinforce your team’s strengths</span>'}</div></div><div class="draft-rec-controls"><div class="draft-focus-group" role="group" aria-label="Suggestion priority">${[['balanced','Balanced'],['team','Team needs'],['enemy','Enemy response']].map(([id,label])=>`<button data-draft-focus="${id}" class="${state.focus===id?'active':''}" aria-pressed="${state.focus===id}">${label}</button>`).join('')}</div><label class="draft-search"><span class="sr-only">Search suggested heroes</span><input type="search" data-draft-filter="search" value="${escape(state.search)}" placeholder="Search hero or classic name…" maxlength="64" autocomplete="off"></label><label class="draft-attack-filter"><span class="sr-only">Attack type</span><select data-draft-filter="attackFilter"><option value="all" ${state.attackFilter==='all'?'selected':''}>All attack types</option><option value="melee" ${state.attackFilter==='melee'?'selected':''}>Melee</option><option value="ranged" ${state.attackFilter==='ranged'?'selected':''}>Ranged</option></select></label><button class="draft-text-button" data-draft-action="clear-filters">Reset filters</button></div><div class="draft-result-summary" aria-live="polite"><span>${report.recommendations.length?`Showing ${report.recommendations.length} of ${report.candidatesCount} available P${state.role} options`:`No matching P${state.role} options`}</span><small>${state.focus==='enemy'&&!report.enemyThreats.length?'No tagged enemy pattern yet; team fit still guides these suggestions.':'Ordered by draft fit · no win-rate estimates'}</small></div><div class="draft-rec-grid">${report.recommendations.length?report.recommendations.map((r,index)=>recommendationCard(r,index,report)).join(''):`<div class="draft-empty"><strong>No heroes match these settings.</strong><p>${report.rawCandidateCount?'Try another name or attack type. Search only includes available heroes in your chosen position.':'Try another position or remove a ban. Picked and banned heroes stay excluded.'}</p><button class="draft-outline-button" data-draft-action="clear-filters">Reset filters</button></div>`}</div></section><details class="draft-method-details"><summary>How suggestions work <span>⌄</span></summary><p>Suggestions use curated position and ability tags. Team needs gives more weight to missing tools; Enemy response gives more weight to tagged enemy patterns. When replacing a pick, the old hero is removed before scoring each candidate. This is draft advice, not a claim that a hero counters another or a prediction of the match result. Items, skill builds, lane matchups and execution still matter.</p></details>`;
  }
  async function pick(side,index){
    if(busy)return;
    busy=true;
    try{
      const current=state[side][index];
      const excludeIds=[...state.allies,...state.enemies,...state.bans].filter(id=>id&&id!==current);
      const id=await chooseHero({excludeIds,title:side==='allies'?`Choose your ${ROLES[index].label.toLowerCase()}`:`Choose enemy pick ${index+1}`});
      if(!id)return;
      const freshUsed=[...state.allies,...state.enemies,...state.bans].filter(x=>x&&x!==current);
      if(!catalog.has(id)||freshUsed.includes(id)){toast('That hero is already selected or unavailable.');return;}
      if(id!==current){remember();state[side][index]=id;render();}
    }catch{toast('The hero selector could not be opened. Please try again.');}finally{busy=false;}
  }
  root.addEventListener('input',e=>{
    if(e.target.matches('[data-draft-name]'))state.name=e.target.value.slice(0,48);
    if(e.target.dataset.draftFilter==='search'){
      state.search=e.target.value.slice(0,64);const caret=e.target.selectionStart;render();
      const input=root.querySelector('[data-draft-filter="search"]');input.focus({preventScroll:true});if(caret!==null)input.setSelectionRange(caret,caret);
    }
  });
  root.addEventListener('change',e=>{if(e.target.dataset.draftFilter==='attackFilter'){state.attackFilter=normalizeDraftPreferences({attackFilter:e.target.value}).attackFilter;render();}});
  root.addEventListener('click',async e=>{
    const pickButton=e.target.closest('[data-draft-pick]');if(pickButton){const [side,index]=pickButton.dataset.draftPick.split(':');if(['allies','enemies'].includes(side))await pick(side,Number(index));return;}
    const remove=e.target.closest('[data-draft-remove]');if(remove){const [side,index]=remove.dataset.draftRemove.split(':');remember();state[side][Number(index)]=null;render();return;}
    const role=e.target.closest('[data-draft-role]');if(role){state.role=Number(role.dataset.draftRole);render();return;}
    const focus=e.target.closest('[data-draft-focus]');if(focus){state.focus=normalizeDraftPreferences({focus:focus.dataset.draftFocus}).focus;render();return;}
    const unban=e.target.closest('[data-draft-unban]');if(unban){remember();state.bans=state.bans.filter(id=>id!==unban.dataset.draftUnban);render();return;}
    const rec=e.target.closest('[data-draft-recommend]');if(rec){const id=rec.dataset.draftRecommend,index=state.role-1,previous=state.allies[index];const next=applyDraftRecommendation(state,id);if(next.allies[index]===id&&previous!==id){remember();state=next;render();toast(`${catalog.get(id).name} ${previous?'replaces '+catalog.get(previous).name:'added'} in P${state.role}.`);}return;}
    const action=e.target.closest('[data-draft-action]')?.dataset.draftAction;if(!action)return;
    if(action==='clear-filters'){Object.assign(state,normalizeDraftPreferences());render();}
    if(action==='undo-pick'&&pickHistory.length){state=normalizeDraftState(pickHistory.pop());render();toast('Previous draft edit restored.');}
    if(action==='clear'){remember();state=normalizeDraftState({name:state.name,role:state.role});render();toast('Ready for your own draft.');}
    if(action==='sample'){remember();state=sampleDraft();render();toast('Editable example draft loaded.');}
    if(action==='save'){state.name=state.name.trim()||'My draft';onSave({type:'draft',title:state.name,state:clone(state)});}
    if(action==='share'){state.name=state.name.trim()||'My draft';onShare({type:'draft',state:clone(state)});}
    if(action==='ban'&&!busy){
      busy=true;
      try{const id=await chooseHero({excludeIds:[...state.allies,...state.enemies,...state.bans].filter(Boolean),title:'Exclude a hero from recommendations'});if(id&&catalog.has(id)&&![...state.allies,...state.enemies,...state.bans].includes(id)){remember();state.bans.push(id);render();}}catch{toast('The hero selector could not be opened. Please try again.');}finally{busy=false;}
    }
  });
  render();
  return {getState:()=>clone(state),setState(input){state=normalizeDraftState(input);pickHistory=[];render();},reset(){state=sampleDraft();pickHistory=[];render();}};
}
