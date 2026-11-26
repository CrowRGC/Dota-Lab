import {HEROES,ITEMS,RULES,RULESET,PRESETS} from './data.mjs';
import {analyzeBuild} from './engine.mjs';

const $=s=>document.querySelector(s);
const itemMap=new Map(ITEMS.map(i=>[i.id,i]));
const heroMap=new Map(HEROES.map(h=>[h.id,h]));
const STORE='dota-item-lab-builds-v1';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const statusText={compatible:'Documented',conditional:'Conditional',conflict:'Conflict',unknown:'Not verified'};
let state=structuredClone(PRESETS.frost), selectedSlot=3, category='All items',resultFilter='all',dragSlot=null;
let toastTimer,analysis;

function toast(message){$('#toast').textContent=message;$('#toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),3300);}
function icon(item,extra=''){return `<img class="item-icon ${extra}" src="${item.icon}" alt="" loading="lazy">`;}
function modal(id){const d=$(id);if(!d.open)d.showModal();}
function readSaved(){try{const a=JSON.parse(localStorage.getItem(STORE)||'[]');return Array.isArray(a)?a.filter(b=>validBuild(b)):[];}catch{return [];}}
function validBuild(b){return b&&typeof b==='object'&&heroMap.has(b.heroId)&&Array.isArray(b.slots)&&b.slots.length===6&&b.slots.every(id=>id===null||itemMap.has(id))&&['melee','ranged'].includes(b.attackType)&&typeof b.name==='string'&&b.name.length<=48&&(!b.map||b.map===RULESET.version);}
function normalize(b){const hero=heroMap.get(b.heroId);return {heroId:b.heroId,attackType:hero.forms?.includes(b.attackType)?b.attackType:hero.type,slots:[...b.slots],name:b.name.slice(0,48)};}
function loadBuild(b){if(!validBuild(b)){toast('This build is not supported by the current ruleset.');return;}state=normalize(b);selectedSlot=Math.max(0,state.slots.indexOf(null));resultFilter='all';$('#build-name').value=state.name;render();}
function fromHash(){if(!location.hash.startsWith('#build='))return;try{const b=JSON.parse(decodeURIComponent(location.hash.slice(7)));if(validBuild(b)){state=normalize(b);selectedSlot=Math.max(0,state.slots.indexOf(null));}else toast('This shared build is not valid for v7.07b1.');}catch{toast('This build link could not be read.');}}
function syncName(){state.name=$('#build-name').value.trim().slice(0,48)||'Untitled build';}

function renderHero(){const h=heroMap.get(state.heroId);$('#hero-portrait').innerHTML=`<img src="${h.icon}" alt="${esc(h.name)} portrait">`;$('#hero-name').textContent=h.name;$('#hero-alias').textContent=h.alias;$('#attack-type').innerHTML=h.forms?`<span>FORM</span>${h.forms.map(t=>`<button class="${state.attackType===t?'selected':''}" data-type="${t}" aria-pressed="${state.attackType===t}">${t==='ranged'?'↗ Ranged':'⚔ Melee'}</button>`).join('')}`:`<span class="type-label">${h.type==='ranged'?'↗ Ranged attacks':'⚔ Melee attacks'}</span>`;}
function renderInventory(){
  $('#inventory').innerHTML=state.slots.map((id,n)=>{const item=itemMap.get(id);return `<div class="inventory-slot ${item?'':'empty-slot'} ${selectedSlot===n?'is-selected':''}" data-slot="${n}" ${item?'draggable="true"':''}><span class="slot-num">${n+1}</span><button class="slot-pick" data-select-slot="${n}" aria-label="Slot ${n+1}: ${esc(item?.name||'empty')}. Select to ${item?'replace':'add an item'}." aria-pressed="${selectedSlot===n}">${item?`${icon(item)}<span class="item-name">${esc(item.name)}</span>`:'<span class="empty-plus">＋</span><span class="empty-label">Add item</span>'}</button>${item?`<button class="slot-remove" data-remove-slot="${n}" aria-label="Remove ${esc(item.name)} from slot ${n+1}">×</button>`:''}</div>`;}).join('');
  const count=state.slots.filter(Boolean).length;$('#slot-count').textContent=`${count} / 6 slots`;$('#add-hint').textContent=`${state.slots[selectedSlot]?'Replace':'Add to'} slot ${selectedSlot+1}`;
}
function renderCatalog(){
  const categories=['All items','Lifesteal','Attack effects','On-hit & procs','Other items'];
  $('#category-tabs').innerHTML=categories.map(c=>`<button class="${c===category?'active':''}" data-category="${esc(c)}" aria-pressed="${c===category}">${c==='On-hit & procs'?'On-hit & procs':esc(c)}</button>`).join('');
  const q=$('#item-search').value.trim().toLowerCase();const list=ITEMS.filter(i=>(category==='All items'||i.category===category)&&`${i.name} ${i.search}`.toLowerCase().includes(q));
  $('#item-total').textContent=ITEMS.length;
  $('#item-grid').innerHTML=list.length?list.map(i=>{const n=state.slots.filter(id=>id===i.id).length;return `<button class="item-tile" data-add-item="${i.id}" aria-label="Equip ${esc(i.name)} in slot ${selectedSlot+1}" title="${esc(i.name)} · ${i.category}">${icon(i)}<span class="tile-name">${esc(i.name)}</span>${n?`<span class="tile-count">${n}</span>`:''}</button>`;}).join(''):'<div class="empty-state">No items match that search.<br>Try a different name or category.</div>';
  $('#filtered-count').textContent=`${list.length} items`;
}

function renderResults(){
  analysis=analyzeBuild({...state},{items:ITEMS,rules:RULES,version:RULESET.version});
  const {counts,totalPairs}=analysis, documented=totalPairs-counts.unknown;
  $('#report-title').textContent=totalPairs===0?'Your build, explained.':counts.conflict?'Check these effects.':counts.unknown?'Some pairs need a closer look.':counts.conditional?'The conditions matter.':'Your effects, with evidence.';
  $('#report-description').textContent=totalPairs===0?'Equip at least two items to compare their effects.':`${totalPairs} item ${totalPairs===1?'pair':'pairs'} checked. ${documented} covered by developer changelog evidence. Exact-map tests are pending.`;
  $('#coverage-label').textContent='Documented pair coverage';$('#coverage-number').textContent=`${documented} / ${totalPairs}`;$('#coverage-bar').style.width=`${totalPairs?documented/totalPairs*100:0}%`;
  const filters=[['all','All',totalPairs],['compatible','Documented',counts.compatible],['unknown','Unverified',counts.unknown]];
  if(counts.conditional)filters.push(['conditional','Conditional',counts.conditional]);if(counts.conflict)filters.push(['conflict','Conflicts',counts.conflict]);
  $('#result-filters').innerHTML=filters.map(([id,title,n])=>`<button class="${resultFilter===id?'active':''}" data-result-filter="${id}" aria-pressed="${resultFilter===id}">${title}<span>${n}</span></button>`).join('');
  const pairs=analysis.pairs.filter(p=>resultFilter==='all'||p.status===resultFilter);
  if(!pairs.length){$('#result-list').innerHTML=`<div class="report-empty"><span class="empty-orb">◇</span><h3>${totalPairs?'No pairs in this category.':'Start with two items.'}</h3><p>${totalPairs?'Try another result filter to see the rest of your build.':'Choose items from the armory to see their documented interactions and open questions.'}</p></div>`;return;}
  $('#result-list').innerHTML=pairs.map(p=>{
    const a=itemMap.get(p.leftId),b=itemMap.get(p.rightId),unknown=p.status==='unknown';
    const title=unknown?(a.id===b.id?'Duplicate effect needs verification.':'This pair is not yet documented.'):p.title;
    const brief=unknown?(a.id===b.id?'Two copies do not automatically mean double the effect. A duplicate-specific rule is needed.':`${a.name} + ${b.name} has no supported rule in this preview.`):(RULES.find(r=>r.id===p.ruleId)?.summary||p.explanation);
    const sources=p.sources||[];
    return `<details class="result-card"><summary><div class="result-card-top"><div class="result-items" aria-label="${esc(a.name)} and ${esc(b.name)}">${icon(a)}<span class="pair-plus">＋</span>${icon(b)}</div><span class="badge ${p.status}">${statusText[p.status]}</span></div><h3>${esc(title)}</h3><p>${esc(brief)}</p><div class="result-meta"><span>Slots ${p.leftSlot+1} + ${p.rightSlot+1}</span><span>${unknown?'What needs checking':'Evidence & scope'} ⌄</span></div></summary><div class="rule-detail"><div class="detail-inner"><h4>${unknown?'VERIFICATION NEEDED':'SOURCE & SCOPE'}</h4><p>${esc(unknown?'Test this exact pair in v7.07b1, with the selected attack form. Check the special effects separately from item stats. No compatibility verdict is given until a supporting rule or test record is available.':p.explanation)}</p>${sources.map(s=>`<a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.label)} ↗</a>`).join('')}<p class="evidence-scope">${esc(unknown?'v7.07b1 · no verified rule available.':p.evidenceScope)}</p></div></div></details>`;
  }).join('');
}
function renderRules(){
  $('#rules-notice').textContent=RULESET.notice;
  $('#rule-library').innerHTML=RULES.map(r=>`<article class="library-rule"><h3>${esc(r.title)} <span class="badge ${r.status}">${statusText[r.status]}</span></h3><p>${esc(r.explanation)}</p>${r.sources.map(s=>`<a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.label)} ↗</a>`).join('')}<p class="scope">${esc(r.evidenceScope)}</p></article>`).join('')+`<article class="library-rule"><h3>Target map &amp; artwork</h3><p>The official map catalogue identifies v7.07b1. Classic artwork is from the DotA one archive; archived artwork does not supply this checker’s mechanics.</p><a href="${RULESET.mapCatalog}" target="_blank" rel="noopener noreferrer">Official map catalogue ↗</a><a href="https://dotaone.com/items.html" target="_blank" rel="noopener noreferrer">Classic item artwork ↗</a><a href="https://dotaone.com/heroes.html" target="_blank" rel="noopener noreferrer">Classic hero artwork ↗</a><a href="assets/SOURCES.txt" target="_blank" rel="noopener noreferrer">Artwork credits ↗</a></article>`;
}
function renderHeroGrid(){const q=$('#hero-search').value.toLowerCase().trim();const list=HEROES.filter(h=>`${h.name} ${h.alias}`.toLowerCase().includes(q));$('#hero-grid').innerHTML=list.length?list.map(h=>`<button class="hero-option" data-hero="${h.id}" aria-label="Choose ${esc(h.name)}"><img src="${h.icon}" alt=""><strong>${esc(h.name)}</strong><small>${esc(h.alias)} · ${h.forms?'Melee / ranged':h.type==='melee'?'Melee':'Ranged'}</small></button>`).join(''):'<div class="empty-state">No heroes match that search.</div>';}
function renderSaved(){
  const saved=readSaved();$('#saved-count').textContent=saved.length;
  $('#saved-list').innerHTML=saved.length?saved.map((b,i)=>`<article class="saved-build"><div class="saved-build-info"><strong>${esc(b.name)}</strong><p>${esc(heroMap.get(b.heroId).name)} · ${b.slots.filter(Boolean).length} items · v7.07b1</p></div><div class="saved-build-icons">${b.slots.filter(Boolean).slice(0,3).map(id=>icon(itemMap.get(id))).join('')}</div><button data-load-build="${i}">Load ↗</button><button class="delete-build" data-delete-build="${i}" aria-label="Delete ${esc(b.name)}">×</button></article>`).join(''):'<div class="empty-state">Your next great build belongs here.<br>Use “Save build” to keep your current loadout.</div>';
}
function render(){renderHero();renderInventory();renderCatalog();renderResults();renderSaved();}

document.addEventListener('click',e=>{
  const select=e.target.closest('[data-select-slot]');if(select){selectedSlot=Number(select.dataset.selectSlot);renderInventory();renderCatalog();}
  const remove=e.target.closest('[data-remove-slot]');if(remove){const n=Number(remove.dataset.removeSlot);state.slots[n]=null;selectedSlot=n;render();}
  const add=e.target.closest('[data-add-item]');if(add){const item=itemMap.get(add.dataset.addItem),slot=selectedSlot;state.slots[slot]=item.id;const next=state.slots.findIndex((v,n)=>n>slot&&!v);const empty=state.slots.indexOf(null);selectedSlot=next>=0?next:empty>=0?empty:slot;render();toast(`${item.name} equipped in slot ${slot+1}.`);}
  const tab=e.target.closest('[data-category]');if(tab){category=tab.dataset.category;renderCatalog();}
  const filter=e.target.closest('[data-result-filter]');if(filter){resultFilter=filter.dataset.resultFilter;renderResults();}
  const hero=e.target.closest('[data-hero]');if(hero){state.heroId=hero.dataset.hero;state.attackType=heroMap.get(state.heroId).type;$('#hero-dialog').close();render();}
  const type=e.target.closest('[data-type]');if(type){const h=heroMap.get(state.heroId);if(h.forms?.includes(type.dataset.type)){state.attackType=type.dataset.type;render();}}
  const preset=e.target.closest('[data-preset]');if(preset){loadBuild(structuredClone(PRESETS[preset.dataset.preset]));toast(`Loaded ${state.name}.`);}
  const load=e.target.closest('[data-load-build]');if(load){const b=readSaved()[Number(load.dataset.loadBuild)];if(b){loadBuild(b);$('#saved-dialog').close();toast('Build loaded.');}}
  const del=e.target.closest('[data-delete-build]');if(del){const saved=readSaved();saved.splice(Number(del.dataset.deleteBuild),1);try{localStorage.setItem(STORE,JSON.stringify(saved));renderSaved();toast('Saved build removed.');}catch{toast('Browser storage is unavailable.');}}
  if(e.target.closest('.close-dialog'))e.target.closest('dialog').close();
});
$('#item-search').addEventListener('input',renderCatalog);$('#hero-search').addEventListener('input',renderHeroGrid);
$('#build-name').addEventListener('input',syncName);
$('#choose-hero').addEventListener('click',()=>{$('#hero-search').value='';renderHeroGrid();modal('#hero-dialog');});
for(const id of ['nav-rules','version-details','report-evidence','footer-sources'])$('#'+id).addEventListener('click',()=>modal('#rules-dialog'));
$('#nav-saved').addEventListener('click',()=>{renderSaved();modal('#saved-dialog');});
$('#mobile-saved').addEventListener('click',()=>{renderSaved();modal('#saved-dialog');});
$('#how-it-works').addEventListener('click',()=>modal('#help-dialog'));
$('#nav-checker').addEventListener('click',()=>window.scrollTo({top:0,behavior:'smooth'}));
$('.brand').addEventListener('click',e=>{e.preventDefault();window.scrollTo({top:0,behavior:'smooth'});});
$('#reset-build').addEventListener('click',()=>{state.slots=Array(6).fill(null);selectedSlot=0;resultFilter='all';render();toast('Inventory cleared.');});
$('#save-build').addEventListener('click',()=>{syncName();if(!state.slots.some(Boolean)){toast('Equip an item before saving your build.');return;}const saved=readSaved();const build={...structuredClone(state),map:RULESET.version};const same=saved.findIndex(b=>b.name===state.name);if(same>=0)saved[same]=build;else saved.unshift(build);try{localStorage.setItem(STORE,JSON.stringify(saved.slice(0,40)));renderSaved();toast(same>=0?'Saved build updated.':'Build saved in this browser.');}catch{toast('Browser storage is unavailable. Use Share build instead.');}});
$('#share-build').addEventListener('click',async()=>{syncName();const url=new URL(location.href);url.hash='build='+encodeURIComponent(JSON.stringify({...state,map:RULESET.version}));let copied=false;try{await navigator.clipboard.writeText(url.href);copied=true;}catch{const t=document.createElement('textarea');t.value=url.href;t.style.position='fixed';t.style.opacity='0';document.body.append(t);t.select();try{copied=document.execCommand('copy');}catch{}t.remove();}if(copied){toast('Build link copied.');}else{let d=$('#share-dialog');if(!d){d=document.createElement('dialog');d.id='share-dialog';d.className='modal';d.innerHTML='<div class="modal-heading"><h2>Your build link.</h2><button class="icon-button close-dialog" aria-label="Close share dialog">×</button></div><p class="modal-intro">Copy this link to share the hero, items and inventory order.</p><input class="share-input" style="width:100%;padding:12px;border:1px solid #dce3cf;border-radius:5px;font-size:11px" aria-label="Shareable build link" readonly>';document.body.append(d);}d.querySelector('input').value=url.href;d.showModal();d.querySelector('input').select();}});
$('#inventory').addEventListener('dragstart',e=>{const slot=e.target.closest('[data-slot]');if(slot&&state.slots[Number(slot.dataset.slot)]){dragSlot=Number(slot.dataset.slot);e.dataTransfer.setData('text/plain',String(dragSlot));e.dataTransfer.effectAllowed='move';}});
$('#inventory').addEventListener('dragover',e=>{if(dragSlot===null)return;const s=e.target.closest('[data-slot]');if(s){e.preventDefault();s.classList.add('drag-over');}});
$('#inventory').addEventListener('dragleave',e=>{e.target.closest('[data-slot]')?.classList.remove('drag-over');});
$('#inventory').addEventListener('drop',e=>{e.preventDefault();const slot=e.target.closest('[data-slot]');if(slot&&dragSlot!==null){const dest=Number(slot.dataset.slot);[state.slots[dest],state.slots[dragSlot]]=[state.slots[dragSlot],state.slots[dest]];selectedSlot=dest;render();}dragSlot=null;});
$('#inventory').addEventListener('dragend',()=>{dragSlot=null;document.querySelectorAll('.drag-over').forEach(s=>s.classList.remove('drag-over'));});
document.addEventListener('keydown',e=>{if(e.key==='/'&&!['INPUT','TEXTAREA'].includes(document.activeElement.tagName)&&!document.querySelector('dialog[open]')){e.preventDefault();$('#item-search').focus();}});
window.addEventListener('hashchange',()=>{fromHash();$('#build-name').value=state.name;render();});
document.querySelectorAll('dialog').forEach(d=>d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}}));
for(const [id,name]of [['nav-checker','Build checker'],['nav-rules','Rule library'],['nav-saved','Saved builds']])$('#'+id).setAttribute('aria-label',name);
fromHash();$('#build-name').value=state.name;renderRules();render();
