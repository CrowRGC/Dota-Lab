export const escapeHTML = value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function heroImage(hero,className=''){return `<img class="hero-image ${escapeHTML(className)}" src="${escapeHTML(hero?.icon||'assets/mark.svg')}" alt="${escapeHTML(hero?.name||'Hero')}" loading="lazy" draggable="false">`;}
export function itemImage(item,className=''){return `<img class="item-image ${escapeHTML(className)}" src="${escapeHTML(item?.icon||'assets/mark.svg')}" alt="${escapeHTML(item?.name||'Item')}" loading="lazy" draggable="false">`;}
export const clamp=(value,min,max)=>Math.max(min,Math.min(max,Number(value)||0));
export const formatNumber=(value,digits=0)=>Number.isFinite(value)?new Intl.NumberFormat('en-US',{maximumFractionDigits:digits}).format(value):'—';
