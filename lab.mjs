import {HEROES,ITEMS,MAP_VERSION} from './catalog.mjs';
import {escapeHTML as esc,heroImage,itemImage} from './common.mjs';
import {mountDraft} from './draft.mjs';
import {mountDuel} from './duel.mjs';
import {mountTactics} from './tactics.mjs';
import {isProject as validProject,packProject,unpackProject,MAX_PROJECT_BYTES} from './projects.mjs';

const $=s=>document.querySelector(s);
const TYPES={draft:{name:'Hero Suggestions',icon:'◈',eyebrow:'DRAFT & COUNTERPICK',heading:'A better pick starts here',description:'Build both lineups. Find the gaps. Choose your next hero.',title:'My draft'},duel:{name:'Build Duel',icon:'⇄',eyebrow:'BUILD COMPARISON',heading:'Two builds. One fair comparison',description:'Choose your hero, level and items. Compare automatic stats and the difference one item makes.',title:'Build comparison'},tactics:{name:'Strategy Board',icon:'⌖',eyebrow:'TEAM STRATEGY',heading:'Give your team a game plan',description:'Place heroes, draw routes and turn a strategy into a shareable plan.',title:'My tactics'}};
const HOME={name:'Home',eyebrow:'YOUR DOTA 1 WORKSPACE',heading:'Plan together. Build smarter. Pick better',description:'Three tools to prepare for your next game. Choose where you want to start.'};
const PAGES={home:HOME,...TYPES};
const STORE='dota-lab-projects-v2';
const titles=Object.fromEntries(Object.entries(TYPES).map(([k,v])=>[k,v.title]));
let active='home',timer,pickerResolve=null,pickerKind='hero',pickerExclude=new Set(),pickerCategory='All';
const mounted={};
function toast(msg){$('#toast').textContent=String(msg);$('#toast').classList.add('visible');clearTimeout(timer);timer=setTimeout(()=>$('#toast').classList.remove('visible'),3400);}
function showDialog(id){const d=$(id);if(!d.open)d.showModal();}
function titleFor(type){return titles[type]?.trim().slice(0,70)||TYPES[type].title;}
function syncTitle(type=active){if(!TYPES[type]||!mounted[type])return;const s=mounted[type].getState();titles[type]=String(s.name||s.title||TYPES[type].title).slice(0,70);if(active===type&&$('#project-title').value!==titles[type])$('#project-title').value=titles[type];}
function capture(type=active,state){if(!TYPES[type]||!mounted[type])return null;const s=structuredClone(state??mounted[type].getState());const title=String(s.name||s.title||titleFor(type)).trim().slice(0,70)||TYPES[type].title;return {app:'dota-lab',schema:2,type,title,map:MAP_VERSION,state:s};}
function readProjects(){try{const p=JSON.parse(localStorage.getItem(STORE)||'[]');return Array.isArray(p)?p.filter(validProject).slice(0,40):[];}catch{return [];}}
function renderSaved(){const projects=readProjects();$('#saved-count').textContent=projects.length;$('#saved-list').innerHTML=projects.length?projects.map((p,n)=>`<article class="saved-project"><span class="project-icon">${TYPES[p.type].icon}</span><div class="saved-project-info"><strong>${esc(p.title)}</strong><p>${TYPES[p.type].name} · v${MAP_VERSION}</p></div><div class="saved-project-actions"><button class="button button-small" data-load-project="${n}">Open ↗</button><button class="icon-button" data-delete-project="${n}" aria-label="Delete ${esc(p.title)}">×</button></div></article>`).join(''):'<div class="empty-state">Your next good idea belongs here.<br>Save a draft, comparison or tactics board to get started.</div>';}
function saveProject(payload){if(active==='home'&&!Object.hasOwn(TYPES,payload?.type))return;const type=Object.hasOwn(TYPES,payload?.type)?payload.type:active;const p=capture(type,payload?.state);if(!validProject(p)){toast('This project is too large to save. Try fewer steps or shorter routes.');return;}if(payload?.title&&titles[type]===TYPES[type].title){p.title=String(payload.title).slice(0,70);titles[type]=p.title;if(active===type)$('#project-title').value=p.title;}const projects=readProjects();const i=projects.findIndex(x=>x.type===type&&x.title===p.title);p.id=i>=0?projects[i].id:(crypto.randomUUID?.()||String(Date.now()));if(i>=0)projects[i]=p;else projects.unshift(p);try{localStorage.setItem(STORE,JSON.stringify(projects.slice(0,40)));renderSaved();toast(i>=0?'Project updated in this browser.':'Project saved in this browser.');}catch{toast('Browser storage is unavailable. Export JSON to keep your project.');}}
function selectTool(type){
 if(!PAGES[type])return;
 if(active==='tactics'&&type!=='tactics')mounted.tactics?.pause?.();
 active=type;
 for(const id of Object.keys(PAGES))document.getElementById(id+'-view').hidden=id!==type;
 document.querySelectorAll('[data-workspace-tool]').forEach(b=>{const selected=b.dataset.workspaceTool===type;b.classList.toggle('active',selected);if(selected)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});
 const page=PAGES[type],isHome=type==='home';
 $('#breadcrumb-tool').textContent=page.name;$('#tool-eyebrow').textContent=page.eyebrow;$('#tool-heading').textContent=page.heading;$('#tool-description').textContent=page.description;
 $('.heading-actions').hidden=isHome;$('#export-project').hidden=isHome;
 $('#project-context').textContent=isHome?'OPEN AN EXISTING PROJECT':'LOCAL PROJECT';
 $('#project-title').value=isHome?'':titleFor(type);
}

function openProject(p){if(!validProject(p)){toast('This project is not supported or is too large.');return false;}try{mounted[p.type].setState(structuredClone(p.state));titles[p.type]=p.title;selectTool(p.type);return true;}catch{toast('This project could not be loaded.');return false;}}
async function copyText(value){try{await navigator.clipboard.writeText(value);return true;}catch{const el=document.createElement('textarea');el.value=value;el.style.position='fixed';el.style.opacity='0';document.body.append(el);el.select();let ok=false;try{ok=document.execCommand('copy');}catch{}el.remove();return ok;}}
async function shareProject(payload){if(active==='home'&&!Object.hasOwn(TYPES,payload?.type))return;const type=Object.hasOwn(TYPES,payload?.type)?payload.type:active;const p=capture(type,payload?.state);if(!validProject(p)){toast('This project is too large for a link. Use Export JSON.');return;}const url=new URL(location.href);url.hash=packProject(p);$('#share-link').value=url.href;if(url.href.length>18000){toast('For this larger project, Export JSON is easier to share.');showDialog('#share-dialog');return;}if(await copyText(url.href))toast('Project link copied. Site access permissions still apply.');else{showDialog('#share-dialog');$('#share-link').select();}}
function renderPicker(){
 const q=$('#picker-search').value.trim().toLowerCase(),isHero=pickerKind==='hero';
 const all=isHero?HEROES:ITEMS;
 const list=all.filter(x=>!pickerExclude.has(x.id)&&(isHero||pickerCategory==='All'||x.kind===pickerCategory)&&`${x.name} ${x.alias||''} ${x.search||''}`.toLowerCase().includes(q));
 $('#picker-categories').innerHTML=isHero?'':['All','Equipment','Components','Consumables','Recipes'].map(k=>`<button data-item-category="${k}" class="${pickerCategory===k?'active':''}">${k}</button>`).join('');
 $('#picker-count').textContent=`${list.length} ${isHero?'heroes':'items'} · v7.07b1`;
 $('#picker-grid').innerHTML=list.length?list.map(x=>`<button class="picker-option" data-pick-id="${esc(x.id)}">${isHero?heroImage(x):itemImage(x)}<span><strong>${esc(x.name)}</strong><small>${esc(isHero?x.alias||x.attackType:x.kind+' · '+x.cost+' gold')}</small></span></button>`).join(''):'<div class="empty-state">No matches. Try another name or category.</div>';
}
function showItemDetails(id){const item=ITEMS.find(x=>x.id===id);if(!item)return;$('#item-detail-title').textContent=item.name;$('#item-detail-body').innerHTML=`<div class="catalog-item-heading">${itemImage(item)}<p>${esc(item.kind)} · ${item.cost} gold<br><small>v7.07b1 · ${esc(item.rawcode)}</small></p></div><div class="catalog-description">${esc(item.description||'No additional tooltip text in the map profile.')}</div><p class="privacy-note">${esc(item.evidence)} Special effects and active abilities are described here; the stat calculator models carried passive bonuses only.</p>`;showDialog('#item-detail');}
function choose(kind,options={}){if(pickerResolve)pickerResolve(null);pickerKind=kind;pickerCategory='All';pickerExclude=new Set(options.excludeIds||[]);$('#picker-title').textContent=options.title||(kind==='hero'?'Choose a hero.':'Choose an item.');$('#picker-eyebrow').textContent=kind==='hero'?'HERO CATALOG':'ITEM CATALOG';$('#picker-description').textContent=kind==='hero'?'Classic hero roster with curated positions and ability tags. Already selected heroes are hidden.':'Passive item bonuses come from the v7.07b1 map. Automatic totals exclude learned skills, active buffs and listed special effects.';$('#picker-search').placeholder=kind==='hero'?'Search hero or classic name…':'Search items…';$('#picker-search').value='';renderPicker();showDialog('#picker-dialog');return new Promise(resolve=>{pickerResolve=resolve;});}
const hooks={onSave:saveProject,onShare:shareProject,toast,chooseHero:opts=>choose('hero',opts),chooseItem:opts=>choose('item',opts)};
mounted.draft=mountDraft($('#draft-view'),hooks);mounted.duel=mountDuel($('#duel-view'),hooks);mounted.tactics=mountTactics($('#tactics-view'),hooks);
for(const type of Object.keys(TYPES))syncTitle(type);

document.addEventListener('click',e=>{const category=e.target.closest('[data-item-category]');if(category){pickerCategory=category.dataset.itemCategory;renderPicker();}const nav=e.target.closest('[data-workspace-tool]');if(nav)selectTool(nav.dataset.workspaceTool);if(e.target.closest('.close-modal'))e.target.closest('dialog').close();const pick=e.target.closest('[data-pick-id]');if(pick&&pickerKind==='library'){showItemDetails(pick.dataset.pickId);return;}if(pick&&pickerResolve){const resolve=pickerResolve;pickerResolve=null;$('#picker-dialog').close();resolve(pick.dataset.pickId);}const load=e.target.closest('[data-load-project]');if(load){const p=readProjects()[Number(load.dataset.loadProject)];if(p&&openProject(p)){$('#saved-dialog').close();toast('Project loaded.');}}const del=e.target.closest('[data-delete-project]');if(del){const all=readProjects();all.splice(Number(del.dataset.deleteProject),1);try{localStorage.setItem(STORE,JSON.stringify(all));renderSaved();toast('Saved copy removed. The open project is unchanged.');}catch{toast('Browser storage is unavailable.');}}});
for(const id of ['open-items','mobile-items'])$('#'+id).addEventListener('click',()=>choose('library',{title:'All items · v7.07b1'}));
$('#picker-dialog').addEventListener('close',()=>{if(pickerResolve){const resolve=pickerResolve;pickerResolve=null;resolve(null);}});$('#picker-search').addEventListener('input',renderPicker);
document.addEventListener('input',e=>{if(e.target.closest('.tool-view'))syncTitle();});
document.addEventListener('click',e=>{if(e.target.closest('.tool-view'))syncTitle();});
$('#save-project').addEventListener('click',()=>saveProject());$('#share-project').addEventListener('click',()=>shareProject());
for(const id of ['open-saved','mobile-saved'])$('#'+id).addEventListener('click',()=>{renderSaved();showDialog('#saved-dialog');});
for(const id of ['open-sources','footer-sources'])$('#'+id).addEventListener('click',()=>showDialog('#sources-dialog'));
$('.brand').addEventListener('click',e=>{e.preventDefault();selectTool('home');window.scrollTo({top:0,behavior:'smooth'});});
$('#copy-share').addEventListener('click',async()=>{if(await copyText($('#share-link').value))toast('Project link copied.');else{$('#share-link').select();toast('Select and copy the link manually.');}});
$('#export-project').addEventListener('click',()=>{const p=capture();if(!p)return;const blob=new Blob([JSON.stringify(p,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=(p.title.replace(/[^a-z0-9 -]/gi,'').trim().replace(/\s+/g,'-')||'dota-project')+'.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('Project exported as JSON.');});
$('#import-project').addEventListener('click',()=>$('#import-file').click());$('#import-file').addEventListener('change',async()=>{const file=$('#import-file').files[0];if(!file)return;try{if(file.size>MAX_PROJECT_BYTES)throw new Error('size');const p=JSON.parse(await file.text());if(openProject(p))toast('Project imported. Save it to keep a browser copy.');}catch{toast('Choose a valid Dota Lab project JSON file under 2 MB.');}finally{$('#import-file').value='';}});
function loadHash(){if(!location.hash.startsWith('#project='))return;try{const p=unpackProject(location.hash);if(p&&openProject(p))toast('Shared project loaded.');}catch{toast('This project link could not be read.');}}
window.addEventListener('hashchange',loadHash);
document.querySelectorAll('dialog').forEach(d=>d.addEventListener('click',e=>{if(e.target!==d)return;const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}));
$('#roster-count').textContent=HEROES.length;renderSaved();selectTool('home');loadHash();
