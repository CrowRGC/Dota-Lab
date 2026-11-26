import {visionModel,OBSERVER_RANGE,SENTRY_DETECTION_RANGE,WORLD_UNITS_PER_DIAGRAM} from './vision.mjs';
import {HEROES} from './catalog.mjs';
import {escapeHTML, heroImage} from './common.mjs';

const clone=value=>JSON.parse(JSON.stringify(value));
const clamp=(value,min=0,max=1000)=>Math.max(min,Math.min(max,Number.isFinite(Number(value))?Number(value):min));
const text=(value,fallback='',max=80)=>typeof value==='string'?value.slice(0,max):fallback;
let sequence=0;
const id=prefix=>`${prefix}-${Date.now().toString(36)}-${(++sequence).toString(36)}`;
const markerTypes=new Set(['hero','ward','sentry','rune','roshan','note']);

export function normalizeTactics(input={},heroes=HEROES){
  const known=new Set(heroes.map(h=>h.id));
  const source=input&&typeof input==='object'?input:{};
  const steps=(Array.isArray(source.steps)?source.steps:[]).slice(0,8).map((step,index)=>{
    const seen=new Set();
    const markers=(Array.isArray(step?.markers)?step.markers:[]).slice(0,80).filter(m=>m&&markerTypes.has(m.type)&&(m.type!=='hero'||known.has(m.heroId))).map((m,n)=>{
      let markerId=text(m.id,`marker-${index}-${n}`,80);if(seen.has(markerId))markerId=`marker-${index}-${n}`;seen.add(markerId);
      return {id:markerId,type:m.type,heroId:m.type==='hero'?m.heroId:null,x:clamp(m.x,18,982),y:clamp(m.y,18,982),team:m.team==='enemy'?'enemy':'ally',label:text(m.label,m.type==='note'?'Add a note':'',80)};
    });
    const routeIds=new Set();
    const arrows=(Array.isArray(step?.arrows)?step.arrows:[]).slice(0,40).map((a,n)=>{let routeId=text(a?.id,`route-${index}-${n}`,80);if(routeIds.has(routeId))routeId=`route-${index}-${n}`;routeIds.add(routeId);return {id:routeId,points:(Array.isArray(a?.points)?a.points:[]).slice(0,100).filter(p=>p&&Number.isFinite(Number(p.x))&&Number.isFinite(Number(p.y))).map(p=>({x:clamp(p.x),y:clamp(p.y)})),team:a?.team==='enemy'?'enemy':'ally',style:['pen','arrow'].includes(a?.style)?a.style:'arrow',color:['lime','red','blue','white'].includes(a?.color)?a.color:'lime',width:clamp(a?.width||5,2,14)};}).filter(a=>a.points.length>1);
    return {id:text(step?.id,`step-${index}`,80),name:text(step?.name,`Step ${index+1}`,40),markers,arrows};
  });
  if(!steps.length)steps.push({id:'step-1',name:'Step 1',markers:[],arrows:[]});
  const layerInput=source.layers&&typeof source.layers==='object'?source.layers:{};
  return {title:text(source.title,'Untitled strategy',60),steps,activeStep:Math.floor(clamp(source.activeStep,0,steps.length-1)),layers:{...Object.fromEntries(['heroes','wards','routes','notes'].map(k=>[k,layerInput[k]!==false])),highground:layerInput.highground===true,fog:layerInput.fog===true,vision:layerInput.vision!==false,pillars:layerInput.pillars!==false},snapWards:source.snapWards!==false,visionRadius:clamp(source.visionRadius||OBSERVER_RANGE,30,220)};
}

export function createTacticsHistory(initial){
  let current=clone(initial),past=[],future=[];
  return {
    getState:()=>clone(current),
    commit(next){if(JSON.stringify(next)===JSON.stringify(current))return false;past.push(clone(current));if(past.length>60)past.shift();current=clone(next);future=[];return true;},
    amend(next){current=clone(next);},
    replace(next){current=clone(next);past=[];future=[];},
    undo(){if(!past.length)return clone(current);future.push(clone(current));current=past.pop();return clone(current);},
    redo(){if(!future.length)return clone(current);past.push(clone(current));current=future.pop();return clone(current);},
    canUndo:()=>past.length>0,canRedo:()=>future.length>0,
  };
}

export function sampleTactics(heroes=HEROES){
  const ids=['ursa','drow','viper','juggernaut','anti-mage'].filter(x=>heroes.some(h=>h.id===x));
  const heroMarkers=ids.slice(0,4).map((heroId,n)=>({id:`sample-hero-${n}`,type:'hero',heroId,x:415+n*38,y:635-n*24,team:'ally',label:''}));
  const steps=[
    {id:'gather',name:'01 · Gather',markers:[...heroMarkers,{id:'gather-note',type:'note',x:360,y:720,label:'Group before moving',team:'ally'}],arrows:[{id:'approach',team:'ally',points:[{x:440,y:640},{x:510,y:560},{x:570,y:540}]}]},
    {id:'control',name:'02 · Control approaches',markers:heroMarkers.map((m,n)=>({...m,x:540+n*36,y:500+n*30})).concat([{id:'ward-1',type:'ward',x:665,y:450,team:'ally',label:'Check approach'},{id:'ward-2',type:'ward',x:560,y:620,team:'ally',label:''},{id:'control-note',type:'note',x:500,y:370,label:'Scout both approaches',team:'ally'}]),arrows:[]},
    {id:'decision',name:'03 · Commit or retreat',markers:heroMarkers.map((m,n)=>({...m,x:580+n*28,y:535+n*17})).concat([{id:'decision-note',type:'note',x:400,y:700,label:'Keep an escape route',team:'ally'}]),arrows:[{id:'retreat',team:'ally',points:[{x:620,y:565},{x:520,y:650},{x:410,y:710}]}]},
  ];
  return normalizeTactics({title:'Roshan setup · example',steps,activeStep:0},heroes);
}

export function observerVision(markers=[],radius=100){return markers.filter(m=>m.type==='ward'&&m.team==='ally').map(m=>({x:m.x,y:m.y,radius:clamp(radius,30,220)}));}

function markerLayer(marker){return marker.type==='hero'?'heroes':marker.type==='note'?'notes':'wards';}

export function mountTactics(root,{onSave=()=>{},onShare=()=>{},toast=()=>{},chooseHero=async()=>null}={}){
  const heroes=new Map(HEROES.map(h=>[h.id,h]));
  let state=sampleTactics(),history=createTacticsHistory(state),selected=null,tool='select',team='ally',selectedHero=HEROES[0]?.id||null;
  let drag=null,routeStart=null,drawing=null,playTimer=null,zoom=1,ink='lime',penWidth=5;
  const controller=new AbortController(),events={signal:controller.signal};
  root.classList.add('tactics-module');
  root.innerHTML=`<div class="tactics-intro"><div><div class="tactics-kicker">PLAN IT BEFORE YOU PLAY IT</div><h2>Your team’s strategy whiteboard.</h2><p>Move heroes, mark a route and share a step-by-step plan with your team.</p></div><div class="tactics-top-actions"><button class="tactics-button" data-action="sample">Load example</button><button class="tactics-button" data-action="save">Save strategy</button><button class="tactics-button tactics-primary" data-action="share">Share plan ↗</button></div></div>
  <div class="tactics-workspace"><section class="tactics-board-panel"><div class="tactics-board-heading"><div class="tactics-title-field"><label for="tactics-title">STRATEGY NAME</label><input id="tactics-title" maxlength="60" aria-label="Strategy name"></div><div class="tactics-history-buttons"><button class="tactics-button tactics-fog-toggle" data-action="toggle-fog" aria-pressed="false">Fog OFF</button><button class="tactics-icon-button" data-action="undo" aria-label="Undo last board edit" title="Undo (Ctrl/⌘ Z)">↶</button><button class="tactics-icon-button" data-action="redo" aria-label="Redo last board edit" title="Redo (Ctrl/⌘ Shift Z)">↷</button></div></div>
  <div class="tactics-toolbar" role="toolbar" aria-label="Map drawing tools"><button data-tool="select" title="Select and move markers">↖ <span>Select</span></button><button data-tool="hero" title="Choose a hero marker">♟ <span>Hero</span></button><button data-tool="ward" title="Place an observer ward">◉ <span>Observer</span></button><button data-tool="sentry" title="Place a sentry">◎ <span>Sentry</span></button><button data-tool="rune" title="Place a rune pin">◇ <span>Rune</span></button><button data-tool="roshan" title="Place an objective marker">⬟ <span>Roshan</span></button><button data-tool="arrow" title="Click the start and end of an arrow">↗ <span>Arrow</span></button><button data-tool="path" title="Draw a route on the map">〰 <span>Path</span></button><button data-tool="pen" title="Freehand marker without arrowhead">✎ <span>Marker</span></button><button data-tool="erase" title="Tap a marker or drawing to erase">⌫ <span>Eraser</span></button><button data-tool="note" title="Place a text note">T <span>Note</span></button></div>
  <div class="tactics-map-shell"><svg class="tactics-map" viewBox="0 0 1000 1000" xmlns="http://www.w3.org/2000/svg" role="group" tabindex="0" aria-label="Interactive Dota 1 tactics map. Use a drawing tool, or select a marker and move it with the arrow keys."></svg><span class="tactics-map-badge">DOTA 1 · v7.07b1</span></div><div class="tactics-map-status"><span id="tactics-tool-status"></span><button class="tactics-button tactics-danger" data-action="delete-selected" id="tactics-delete-button" disabled>Delete selected</button><button class="tactics-text-button" data-action="center">Place at map center</button></div><div class="tactics-map-footnote">Terrain: exact v7.07b1. Gold overlay = elevated cliff tiers, not guaranteed ward placement. Vision uses corrected terrain vertices and tree elevations. Pillars improve the view across lower terrain without increasing the ward’s range. Engine visibility and unknown custom blocker footprints still require gameplay verification.</div></section>
  <aside class="tactics-controls"><section class="tactics-control-panel tactics-toolbox"><h3>Drawing & vision</h3><div id="tactics-side-tools"></div><label class="tactics-field-label">MARKER COLOR</label><div class="tactics-ink">${['lime','red','blue','white'].map(c=>`<button data-ink="${c}" aria-label="${c} marker" style="--ink:${{lime:'#e0f69a',red:'#ff897c',blue:'#66ccff',white:'#fff'}[c]}">${c}</button>`).join('')}</div><label class="tactics-field-label">STROKE WIDTH <input type="range" min="2" max="14" value="5" data-pen-width></label><div class="tactics-zoom"><button class="tactics-button" data-action="zoom-out">−</button><strong id="tactics-zoom-label">100%</strong><button class="tactics-button" data-action="zoom-in">＋</button><button class="tactics-button" data-action="zoom-reset">Fit</button></div><label class="tactics-field-label">OBSERVER SIGHT RANGE · <span id="tactics-radius-value">1600</span> WORLD UNITS<input type="range" min="500" max="3600" step="25" value="1600" data-vision-radius></label><label class="tactics-snap-toggle"><input type="checkbox" data-snap-wards checked> Snap observers to nearby pillar targets</label><p class="tactics-small">Fog updates instantly around allied observers. Sentries show detection only; they do not reveal the fog. The standard observer range is 1600 world units, from this map’s tooltip. Higher wards see across lower terrain and lower trees; same-height trees and higher cliffs still block. Pillar targets mark isolated terrain summits; placement legality is not gameplay verified. This is a terrain-based estimate, not engine-exact vision. Custom invisible blockers, cut trees, temporary sentry sight and dynamic effects are not simulated.</p></section><section class="tactics-control-panel"><div class="tactics-control-heading"><span class="tactics-step-number">01</span><h3>Storyboard</h3><span id="tactics-step-count"></span></div><p>Break a strategy into moments your team can follow.</p><div class="tactics-step-list" id="tactics-steps"></div><div class="tactics-step-actions"><button class="tactics-button" data-action="add-step">＋ Add step</button><button class="tactics-button" data-action="duplicate-step">Duplicate</button></div><label class="tactics-field-label" for="tactics-step-name">CURRENT STEP NAME</label><input class="tactics-input" id="tactics-step-name" maxlength="40"><div class="tactics-playback"><button class="tactics-icon-button" data-action="prev-step" aria-label="Previous step">←</button><button class="tactics-button tactics-play-button" data-action="play">▶ Play steps</button><button class="tactics-icon-button" data-action="next-step" aria-label="Next step">→</button><button class="tactics-icon-button tactics-danger" data-action="delete-step" aria-label="Delete current step" title="Delete current step">×</button></div></section>
  <section class="tactics-control-panel"><div class="tactics-control-heading"><span class="tactics-step-number">02</span><h3>Marker settings</h3></div><label class="tactics-field-label">SIDE</label><div class="tactics-team-toggle"><button data-team="ally">● Allied</button><button data-team="enemy">● Enemy</button></div><label class="tactics-field-label" for="tactics-note-text">MARKER TEXT</label><input class="tactics-input" id="tactics-note-text" maxlength="80" placeholder="e.g. smoke here, wait for stun…"><p class="tactics-small">Notes use this text when you place them. Choose Select to move existing markers.</p><div id="tactics-selection"></div><h3>Objects in this step</h3><div id="tactics-object-list"></div></section>
  <section class="tactics-control-panel tactics-layer-panel"><div class="tactics-control-heading"><span class="tactics-step-number">03</span><h3>Visible layers</h3></div><div class="tactics-layer-list">${[['heroes','Hero markers'],['wards','Wards & objectives'],['routes','Arrows & routes'],['notes','Text notes'],['highground','Terrain high grounds'],['fog','Fog · allied observers'],['vision','Visible area & sentry detection'],['pillars','Elevated pillar targets']].map(([key,label])=>`<label><input type="checkbox" data-layer="${key}" checked><span>${label}</span></label>`).join('')}</div><button class="tactics-text-button tactics-danger" data-action="clear-step">Clear current step</button></section>
  <div class="tactics-shortcuts"><strong>A board for the whole team.</strong><p>Drag markers to reposition. Select a marker and use arrow keys for precise moves. Delete removes the selection. Ctrl/⌘ Z undoes an edit.</p><span>The example is illustrative; every position is editable.</span></div></aside></div>`;
  const $=selector=>root.querySelector(selector),svg=$('.tactics-map');
  $('#tactics-side-tools').append($('.tactics-toolbar'));
  const current=()=>state.steps[state.activeStep];
  const findSelected=()=>selected?.kind==='marker'?current().markers.find(m=>m.id===selected.id):selected?.kind==='arrow'?current().arrows.find(a=>a.id===selected.id):null;
  function stop(){if(playTimer){clearInterval(playTimer);playTimer=null;renderControls();}}
  function commit(mutator){const next=clone(state);mutator(next);state=normalizeTactics(next);history.commit(state);render();}
  function setStep(index){stop();state.activeStep=Math.floor(clamp(index,0,state.steps.length-1));history.amend(state);selected=null;routeStart=null;render();}
  function cursorPoint(event){const rect=svg.getBoundingClientRect();return {x:clamp((event.clientX-rect.left)/rect.width*1000),y:clamp((event.clientY-rect.top)/rect.height*1000)};}
  function displayName(marker){if(marker.type==='hero')return heroes.get(marker.heroId)?.name||'Hero';return marker.label||({ward:'Observer ward',sentry:'Sentry ward',rune:'Rune pin',roshan:'Roshan marker',note:'Text note'}[marker.type]);}
  function markerSVG(marker){
    if(!state.layers[markerLayer(marker)])return '';
    const active=selected?.kind==='marker'&&selected.id===marker.id,color=marker.team==='enemy'?'#eb947a':'#cce776',base=`data-marker-id="${escapeHTML(marker.id)}"`,title=escapeHTML(displayName(marker));
    const selectedRing=active?'<circle r="34" fill="none" stroke="#ffffff" stroke-width="3" stroke-dasharray="6 4"/>':'';
    let inside='';
    if(marker.type==='hero'){
      const hero=heroes.get(marker.heroId);inside=`<circle r="27" fill="#102d28" stroke="${color}" stroke-width="5"/><image href="${escapeHTML(hero?.icon||'')}" x="-22" y="-22" width="44" height="44" preserveAspectRatio="xMidYMid slice" clip-path="url(#tactics-hero-clip)"/>`;
    }else if(marker.type==='ward')inside=`<path d="M0 -23 21 -10 21 12 0 25 -21 12 -21 -10Z" fill="#173a30" stroke="${color}" stroke-width="3"/><ellipse rx="13" ry="8" fill="none" stroke="${color}" stroke-width="3"/><circle r="4" fill="${color}"/>`;
    else if(marker.type==='sentry')inside=`<circle r="23" fill="#133750" stroke="#6cd4ff" stroke-width="3"/><circle r="13" fill="none" stroke="#6cd4ff" stroke-width="2"/><text y="7" text-anchor="middle" fill="#fff" font-size="20">S</text>`;
    else if(marker.type==='rune')inside=`<path d="M0 -24 22 0 0 24 -22 0Z" fill="#173a30" stroke="${color}" stroke-width="3"/><path d="m-7 0 7-12 7 12-7 12Z" fill="#8cd7de"/>`;
    else if(marker.type==='roshan')inside=`<path d="m0-25 23 12-4 27L0 28l-19-14-4-27Z" fill="#51362f" stroke="${color}" stroke-width="3"/><text x="0" y="8" fill="#f3d6b0" text-anchor="middle" font-size="25" font-weight="700">R</text>`;
    else {
      const label=marker.label||'Add a note',short=label.length>40?label.slice(0,39)+'…':label,width=Math.max(90,Math.min(370,short.length*8.2+25));
      inside=`<rect x="-10" y="-23" width="${width}" height="42" rx="8" fill="#102b27" fill-opacity=".93" stroke="${active?'#fff':color}" stroke-width="2"/><text x="3" y="4" fill="#f0f4db" font-size="15" font-family="Arial,sans-serif">${escapeHTML(short)}</text>`;
    }
    return `<g ${base} transform="translate(${marker.x} ${marker.y})" class="tactics-svg-marker" role="img" aria-label="${title}"><title>${title}</title>${selectedRing}${inside}${marker.type!=='note'&&marker.label?`<text y="43" x="0" text-anchor="middle" fill="#fff9dd" stroke="#10251b" stroke-width="4" paint-order="stroke" font-size="13">${escapeHTML(marker.label.slice(0,28))}</text>`:''}</g>`;
  }
  function arrowSVG(arrow,preview=false){const active=selected?.kind==='arrow'&&selected.id===arrow.id,color=({lime:'#e0f69a',red:'#ff897c',blue:'#66ccff',white:'#ffffff'}[arrow.color]||(arrow.team==='enemy'?'#f19b84':'#e0f69a')),path=arrow.points.map((p,n)=>`${n?'L':'M'} ${p.x} ${p.y}`).join(' ');return `<g ${preview?'':`data-route-id="${escapeHTML(arrow.id)}"`} class="tactics-svg-route"><path d="${path}" fill="none" stroke="transparent" stroke-width="28" pointer-events="stroke"/><path d="${path}" fill="none" stroke="#102c24" stroke-width="12" stroke-linecap="round" stroke-linejoin="round" opacity=".7"/><path d="${path}" fill="none" stroke="${active?'#ffffff':color}" stroke-width="${(arrow.width||5)+(active?2:0)}" stroke-linecap="round" stroke-linejoin="round" ${arrow.style==='pen'?'':`marker-end="url(#tactics-arrow-${arrow.color|| (arrow.team==='enemy'?'red':'lime')})"`} ${preview?'stroke-dasharray="8 8"':''}/></g>`;}
  function renderSVG(){
    const step=current();
    const observers=observerVision(step.markers,state.visionRadius).map(m=>({...m,polygon:visionModel.polygon(m.x,m.y,m.radius)}));
    const pillarGuides=state.layers.pillars?visionModel.pillars.map((p,i)=>`<g data-pillar-id="${escapeHTML(p.id)}" class="tactics-pillar-target" transform="translate(${p.x} ${p.y})"><title>Elevated terrain ${i+1} · tier ${p.elevation}. Choose Observer and click to place on the summit. Placement legality not gameplay verified.</title><circle r="12" fill="#173849" fill-opacity=".75" stroke="#76dfff" stroke-width="2"/><path d="M-5 0H5M0-5V5" stroke="#fff" stroke-width="2"/><text y="-17" text-anchor="middle" fill="#b5edff" stroke="#102526" stroke-width="3" paint-order="stroke" font-size="11">P${i+1}</text></g>`).join(''):'';
    const fog=state.layers.fog?`<rect width="1000" height="1000" fill="#020913" opacity=".83" mask="url(#tactics-fog)" pointer-events="none"/>`:'';
    const coverage=state.layers.vision?step.markers.filter(m=>['ward','sentry'].includes(m.type)).map(m=>{
      const color=m.type==='sentry'?'#58caff':m.team==='enemy'?'#ff897c':'#e0f69a';
      if(m.type==='sentry')return `<circle cx="${m.x}" cy="${m.y}" r="${SENTRY_DETECTION_RANGE}" fill="${color}" fill-opacity=".07" stroke="${color}" stroke-width="2" stroke-dasharray="6 7" pointer-events="none"/>`;
      const points=visionModel.polygon(m.x,m.y,state.visionRadius).map(p=>`${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
      return `<polygon points="${points}" fill="${color}" fill-opacity=".1" stroke="${color}" stroke-width="2" pointer-events="none"/>`;
    }).join(''):'';
    svg.innerHTML=`<defs><mask id="tactics-fog" maskUnits="userSpaceOnUse" x="0" y="0" width="1000" height="1000"><rect width="1000" height="1000" fill="white"/>${observers.map(m=>`<polygon points="${m.polygon.map(p=>`${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')}" fill="black"/>`).join('')}</mask>${Object.entries({lime:'#e0f69a',red:'#ff897c',blue:'#66ccff',white:'#fff'}).map(([c,v])=>`<marker id="tactics-arrow-${c}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0 10 5 0 10Z" fill="${v}"/></marker>`).join('')}<clipPath id="tactics-hero-clip"><circle r="22"/></clipPath><marker id="tactics-arrow-ally" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0 10 5 0 10Z" fill="#e0f69a"/></marker><marker id="tactics-arrow-enemy" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0 10 5 0 10Z" fill="#f19b84"/></marker></defs><image href="assets/map-707b1.png" width="1000" height="1000" preserveAspectRatio="none"/>${state.layers.highground?'<image href="assets/terrain-highground.svg" width="1000" height="1000" pointer-events="none"/>':''}${fog}${coverage}${pillarGuides}<path d="M250 0V1000M500 0V1000M750 0V1000M0 250H1000M0 500H1000M0 750H1000" stroke="#d8e5c4" stroke-width="1" opacity=".13" pointer-events="none"/>${state.layers.routes?step.arrows.map(a=>arrowSVG(a)).join(''):''}${drawing?arrowSVG({id:'drawing',points:drawing,team,color:ink,width:penWidth,style:tool==='pen'?'pen':'arrow'},true):''}${routeStart?`<circle cx="${routeStart.x}" cy="${routeStart.y}" r="9" fill="#e1f594" stroke="#fff" stroke-width="2"/>`:''}${step.markers.map(markerSVG).join('')}`;
    svg.dataset.tool=tool;svg.style.width=`${zoom*100}%`;$('#tactics-zoom-label').textContent=`${Math.round(zoom*100)}%`;
  }
  function renderControls(){
    $('#tactics-title').value=state.title;$('[data-vision-radius]').value=Math.round(state.visionRadius*WORLD_UNITS_PER_DIAGRAM);$('#tactics-radius-value').textContent=Math.round(state.visionRadius*WORLD_UNITS_PER_DIAGRAM);$('[data-snap-wards]').checked=state.snapWards;$('[data-action="toggle-fog"]').textContent=state.layers.fog?'Fog ON':'Fog OFF';$('[data-action="toggle-fog"]').setAttribute('aria-pressed',String(state.layers.fog));
    $('#tactics-step-name').value=current().name;
    $('#tactics-step-count').textContent=`${state.activeStep+1} / ${state.steps.length}`;
    $('#tactics-steps').innerHTML=state.steps.map((step,n)=>`<button class="tactics-step ${n===state.activeStep?'is-active':''}" data-step="${n}" aria-pressed="${n===state.activeStep}"><span>${String(n+1).padStart(2,'0')}</span><strong>${escapeHTML(step.name||`Step ${n+1}`)}</strong><small>${step.markers.length} pins · ${step.arrows.length} routes</small></button>`).join('');
    root.querySelectorAll('button[data-tool]').forEach(button=>{button.classList.toggle('is-active',button.dataset.tool===tool);button.setAttribute('aria-pressed',String(button.dataset.tool===tool));});
    root.querySelectorAll('[data-team]').forEach(button=>{button.classList.toggle('is-active',button.dataset.team===team);button.setAttribute('aria-pressed',String(button.dataset.team===team));});
    root.querySelectorAll('[data-layer]').forEach(input=>input.checked=state.layers[input.dataset.layer]);
    $('[data-action="undo"]').disabled=!history.canUndo();$('[data-action="redo"]').disabled=!history.canRedo();
    $('[data-action="add-step"]').disabled=state.steps.length>=8;$('[data-action="duplicate-step"]').disabled=state.steps.length>=8;
    $('[data-action="delete-step"]').disabled=state.steps.length<=1;
    $('[data-action="play"]').textContent=playTimer?'Ⅱ Pause':'▶ Play steps';
    $('[data-action="center"]').hidden=['select','arrow','path','pen','erase'].includes(tool);
    const instructions={select:'Select a marker to move or edit it.',hero:`Click the map to place ${heroes.get(selectedHero)?.name||'a hero'}.`,ward:'Click to place an observer. Allied observers reveal schematic fog.',sentry:'Click to place a sentry detection marker. It does not reveal fog.',pen:'Drag to draw with your marker.',erase:'Tap a marker, arrow or stroke to erase it.',rune:'Click the map to mark a rune.',roshan:'Click the map to mark Roshan.',arrow:routeStart?'Click the arrow’s destination.':'Click the start, then the end of your arrow.',path:'Drag across the map to draw a route.',note:'Enter marker text, then click the map.'};
    $('#tactics-tool-status').textContent=instructions[tool];
    renderSelection();
  }
  function renderSelection(){
    $('#tactics-delete-button').disabled=!findSelected();
    $('#tactics-object-list').innerHTML=[...current().markers.map(m=>({id:m.id,kind:'marker',name:displayName(m)})),...current().arrows.map((a,i)=>({id:a.id,kind:'arrow',name:`${a.style==='pen'?'Marker stroke':'Arrow / path'} ${i+1}`}))].map(o=>`<div class="tactics-object-row"><button data-select-object="${escapeHTML(o.id)}" data-object-kind="${o.kind}">${escapeHTML(o.name)}</button><button data-remove-object="${escapeHTML(o.id)}" data-object-kind="${o.kind}" aria-label="Delete ${escapeHTML(o.name)}">Delete</button></div>`).join('')||'<p class="tactics-small">No objects in this step.</p>';
    const target=findSelected();if(!target){$('#tactics-selection').innerHTML='<div class="tactics-selection-empty">Select a marker or route to edit it.</div>';return;}
    const isMarker=selected.kind==='marker';
    const source=isMarker&&target.type==='ward'?visionModel.sourceInfo(target.x,target.y):null;
    const nearby=source?visionModel.snapWard(target.x,target.y):null;
    const visionDetails=source?`<div class="tactics-ward-source"><strong>Observer source · terrain tier ${source.elevation}</strong><span>${source.pillar?'On a pillar summit: lower trees do not block this preview.':source.blockedByTree?'The ward is inside a same-height tree footprint; no visibility is predicted.':'Ground placement: same-height trees and higher terrain block visibility.'}</span>${nearby?.pillar&&!source.pillar?'<button class="tactics-button" data-action="snap-selected-ward">Move to nearby pillar summit</button>':''}<small>Standard range: 1600 world units. High ground changes obstruction, not range.</small></div>`:'';
    $('#tactics-selection').innerHTML=`<div class="tactics-selected-card"><div class="tactics-selected-heading">${isMarker&&target.type==='hero'?heroImage(heroes.get(target.heroId),'tactics-selected-hero'):''}<div><span>SELECTED</span><strong>${escapeHTML(isMarker?displayName(target):'Movement route')}</strong></div><button class="tactics-icon-button tactics-danger" data-action="delete-selected" aria-label="Delete selected ${isMarker?'marker':'route'}">×</button></div>${visionDetails}${isMarker?`<label class="tactics-field-label" for="tactics-selected-label">LABEL</label><div class="tactics-label-edit"><input class="tactics-input" id="tactics-selected-label" value="${escapeHTML(target.label)}" maxlength="80" placeholder="Optional label"><button class="tactics-button" data-action="update-label">Apply</button></div><div class="tactics-coordinate-label">Position ${Math.round(target.x)} / ${Math.round(target.y)} · arrow keys to nudge</div>`:''}<button class="tactics-text-button" data-action="flip-side">Switch to ${target.team==='enemy'?'allied':'enemy'} side</button></div>`;
  }
  function render(){renderSVG();renderControls();}
  function deleteSelected(){if(!selected)return;commit(next=>{const step=next.steps[next.activeStep];if(selected.kind==='marker')step.markers=step.markers.filter(m=>m.id!==selected.id);else step.arrows=step.arrows.filter(a=>a.id!==selected.id);});selected=null;render();}
  function place(point){
    if(['select','arrow','path','pen','erase'].includes(tool))return;
    if(current().markers.length>=80){toast('This step has 80 markers. Add another step or remove a marker.');return;}
    if(tool==='hero'&&!heroes.has(selectedHero)){toast('Choose a hero first.');return;}
    if(tool==='ward')point=visionModel.snapWard(point.x,point.y,{enabled:state.snapWards});
    const marker={id:id('pin'),type:tool,heroId:tool==='hero'?selectedHero:null,x:clamp(point.x,18,982),y:clamp(point.y,18,982),team,label:$('#tactics-note-text').value.trim().slice(0,80)};
    if(tool!=='note')marker.label='';else if(!marker.label)marker.label='Add a note';
    selected={kind:'marker',id:marker.id};commit(next=>{next.steps[next.activeStep].markers.push(marker);next.layers[markerLayer(marker)]=true;});
  }
  function undo(){stop();state=history.undo();selected=null;routeStart=null;drawing=null;render();}
  function redo(){stop();state=history.redo();selected=null;routeStart=null;drawing=null;render();}

  root.addEventListener('click',async event=>{
    const remove=event.target.closest('[data-remove-object]');if(remove){selected={kind:remove.dataset.objectKind,id:remove.dataset.removeObject};deleteSelected();return;}
    const selectObject=event.target.closest('[data-select-object]');if(selectObject){selected={kind:selectObject.dataset.objectKind,id:selectObject.dataset.selectObject};tool='select';render();return;}
    const toolButton=event.target.closest('button[data-tool]');
    if(toolButton){stop();const nextTool=toolButton.dataset.tool;if(nextTool==='hero'){const heroId=await chooseHero({title:'Choose a hero marker',excludeIds:[]});if(!heroes.has(heroId))return;selectedHero=heroId;}tool=nextTool;routeStart=null;selected=null;render();return;}
    const inkButton=event.target.closest('[data-ink]');if(inkButton){ink=inkButton.dataset.ink;root.querySelectorAll('[data-ink]').forEach(b=>b.classList.toggle('is-active',b===inkButton));return;}
    const teamButton=event.target.closest('[data-team]');if(teamButton){team=teamButton.dataset.team;renderControls();return;}
    const stepButton=event.target.closest('[data-step]');if(stepButton){setStep(Number(stepButton.dataset.step));return;}
    const action=event.target.closest('[data-action]')?.dataset.action;if(!action)return;
    if(action==='save')onSave({type:'tactics',title:state.title||'Untitled strategy',state:clone(state)});
    if(action==='share')onShare({type:'tactics',state:clone(state)});
    if(action==='sample'){stop();state=sampleTactics();history.replace(state);selected=null;tool='select';routeStart=null;render();toast('Loaded an editable example strategy.');}
    if(action==='toggle-fog'){commit(next=>next.layers.fog=!next.layers.fog);}
    if(action==='snap-selected-ward'&&selected?.kind==='marker')commit(next=>{const marker=next.steps[next.activeStep].markers.find(m=>m.id===selected.id);if(marker?.type==='ward'){const p=visionModel.snapWard(marker.x,marker.y);marker.x=p.x;marker.y=p.y;}});
    if(action==='undo')undo();if(action==='redo')redo();
    if(action==='add-step'&&state.steps.length<8){stop();commit(next=>{next.steps.push({id:id('step'),name:`Step ${next.steps.length+1}`,markers:[],arrows:[]});next.activeStep=next.steps.length-1;});selected=null;render();}
    if(action==='duplicate-step'&&state.steps.length<8){stop();commit(next=>{const copied=clone(next.steps[next.activeStep]);copied.id=id('step');copied.name=(copied.name+' · copy').slice(0,40);next.steps.splice(next.activeStep+1,0,copied);next.activeStep++;});selected=null;render();}
    if(action==='delete-step'&&state.steps.length>1){stop();commit(next=>{next.steps.splice(next.activeStep,1);next.activeStep=Math.min(next.activeStep,next.steps.length-1);});selected=null;render();}
    if(action==='prev-step')setStep((state.activeStep-1+state.steps.length)%state.steps.length);
    if(action==='next-step')setStep((state.activeStep+1)%state.steps.length);
    if(action==='play'){if(playTimer){stop();return;}selected=null;playTimer=setInterval(()=>{state.activeStep=(state.activeStep+1)%state.steps.length;history.amend(state);render();},1700);renderControls();}
    if(action==='clear-step'){stop();selected=null;commit(next=>{next.steps[next.activeStep].markers=[];next.steps[next.activeStep].arrows=[];});toast('Current step cleared. Undo is available.');}
    if(action==='delete-selected')deleteSelected();
    if(action==='update-label'&&selected?.kind==='marker'){const value=$('#tactics-selected-label')?.value||'';commit(next=>{const m=next.steps[next.activeStep].markers.find(m=>m.id===selected.id);if(m)m.label=value.slice(0,80);});}
    if(action==='flip-side'&&selected){commit(next=>{const step=next.steps[next.activeStep],target=selected.kind==='marker'?step.markers.find(m=>m.id===selected.id):step.arrows.find(a=>a.id===selected.id);if(target)target.team=target.team==='enemy'?'ally':'enemy';});}
    if(action==='zoom-in'){zoom=Math.min(3,zoom+.25);renderSVG();}
    if(action==='zoom-out'){zoom=Math.max(1,zoom-.25);renderSVG();}
    if(action==='zoom-reset'){zoom=1;renderSVG();}
    if(action==='center')place({x:500,y:500});
  },events);
  root.addEventListener('change',event=>{
    if(event.target.id==='tactics-title')commit(next=>next.title=event.target.value.trim()||'Untitled strategy');
    if(event.target.id==='tactics-step-name')commit(next=>next.steps[next.activeStep].name=event.target.value.trim()||`Step ${next.activeStep+1}`);
    if(event.target.hasAttribute('data-vision-radius')){commit(next=>next.visionRadius=Number(event.target.value)/WORLD_UNITS_PER_DIAGRAM);}
    if(event.target.hasAttribute('data-snap-wards'))commit(next=>next.snapWards=event.target.checked);
    if(event.target.hasAttribute('data-pen-width'))penWidth=Number(event.target.value);
    if(event.target.dataset.layer){state.layers[event.target.dataset.layer]=event.target.checked;history.amend(state);renderSVG();renderControls();}
  },events);
  svg.addEventListener('contextmenu',event=>{event.preventDefault();const m=event.target.closest('[data-marker-id]'),a=event.target.closest('[data-route-id]');if(m||a){selected=m?{kind:'marker',id:m.dataset.markerId}:{kind:'arrow',id:a.dataset.routeId};deleteSelected();}},events);
  svg.addEventListener('pointerdown' ,event=>{
    if(event.button!==0)return;stop();svg.focus();let point=cursorPoint(event);
    const pillar=event.target.closest('[data-pillar-id]');if(pillar&&tool==='ward'){const p=visionModel.pillars.find(p=>p.id===pillar.dataset.pillarId);if(p)point={x:p.x,y:p.y};}
    if(tool==='erase'){const m=event.target.closest('[data-marker-id]'),a=event.target.closest('[data-route-id]');selected=m?{kind:'marker',id:m.dataset.markerId}:a?{kind:'arrow',id:a.dataset.routeId}:null;deleteSelected();return;}
    if(!['select','erase'].includes(tool)&&event.target.closest('[data-marker-id]')){selected={kind:'marker',id:event.target.closest('[data-marker-id]').dataset.markerId};tool='select';render();return;}
    if(tool==='select'){
      const marker=event.target.closest('[data-marker-id]'),route=event.target.closest('[data-route-id]');
      if(marker){selected={kind:'marker',id:marker.dataset.markerId};const m=findSelected();drag={id:m.id,dx:m.x-point.x,dy:m.y-point.y,moved:false};svg.setPointerCapture(event.pointerId);}
      else if(route)selected={kind:'arrow',id:route.dataset.routeId};else selected=null;
      renderSVG();renderSelection();return;
    }
    if(tool==='arrow'){if(current().arrows.length>=40){toast('This step has 40 routes. Add another step or remove a route.');return;}if(!routeStart){routeStart=point;render();}else{if(Math.hypot(routeStart.x-point.x,routeStart.y-point.y)<5){toast('Choose a different destination for the arrow.');return;}const start=routeStart;routeStart=null;commit(next=>{next.steps[next.activeStep].arrows.push({id:id('route'),team,color:ink,width:penWidth,style:'arrow',points:[start,point]});next.layers.routes=true;});}return;}
    if(tool==='path'||tool==='pen'){if(current().arrows.length>=40){toast('This step has 40 routes. Add another step or remove a route.');return;}drawing=[point];svg.setPointerCapture(event.pointerId);renderSVG();return;}
    place(point);
  },events);
  svg.addEventListener('pointermove',event=>{
    const point=cursorPoint(event);
    if(drag){const m=current().markers.find(m=>m.id===drag.id);if(m){const p=m.type==='ward'?visionModel.snapWard(point.x+drag.dx,point.y+drag.dy,{enabled:state.snapWards}):{x:point.x+drag.dx,y:point.y+drag.dy};m.x=clamp(p.x,18,982);m.y=clamp(p.y,18,982);drag.moved=true;renderSVG();}return;}
    if(drawing){const previous=drawing.at(-1);if(Math.hypot(previous.x-point.x,previous.y-point.y)>7&&drawing.length<100){drawing.push(point);renderSVG();}}
  },events);
  function finishPointer(event,cancel=false){
    if(drag){if(cancel)state=history.getState();else if(drag.moved)history.commit(state);drag=null;render();}
    if(drawing){const points=drawing;drawing=null;if(!cancel&&points.length>1)commit(next=>{next.steps[next.activeStep].arrows.push({id:id('route'),team,color:ink,width:penWidth,style:tool==='pen'?'pen':'arrow',points});next.layers.routes=true;});else renderSVG();}
    if(svg.hasPointerCapture(event.pointerId))svg.releasePointerCapture(event.pointerId);
  }
  svg.addEventListener('pointerup',event=>finishPointer(event),events);
  svg.addEventListener('pointercancel',event=>finishPointer(event,true),events);
  svg.addEventListener('lostpointercapture',event=>{if(drag||drawing)finishPointer(event,true);},events);
  root.addEventListener('keydown',event=>{
    if(['INPUT','TEXTAREA','SELECT'].includes(event.target.tagName))return;
    if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='z'){event.preventDefault();event.shiftKey?redo():undo();return;}
    if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='y'){event.preventDefault();redo();return;}
    if((event.key==='Delete'||event.key==='Backspace')&&selected){event.preventDefault();deleteSelected();return;}
    if(event.key==='Escape'){tool='select';selected=null;routeStart=null;drawing=null;render();return;}
    const direction={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[event.key];
    if(direction&&selected?.kind==='marker'){event.preventDefault();const distance=event.shiftKey?20:5;commit(next=>{const marker=next.steps[next.activeStep].markers.find(m=>m.id===selected.id);if(marker){marker.x=clamp(marker.x+direction[0]*distance,18,982);marker.y=clamp(marker.y+direction[1]*distance,18,982);}});}
  },events);
  render();
  return {getState:()=>clone(state),setState(next){stop();state=normalizeTactics(next);history.replace(state);selected=null;routeStart=null;drawing=null;tool='select';render();},reset(){stop();state=normalizeTactics({title:'Untitled strategy'});history.replace(state);selected=null;routeStart=null;drawing=null;tool='select';render();},pause:stop,destroy(){stop();controller.abort();}};
}
