import {HERO_ROSTER} from './hero-roster.mjs';
import {MAP_ITEMS} from './all-items.mjs';
import {ITEM_STATS} from './stats-data.mjs';

// Hero role/ability tags are editorial draft aids, not numerical balance data.
export const HEROES = HERO_ROSTER;
// Direct passive bonuses are extracted from the exact target map. Unsupported
// aura effects remain explicitly unavailable in automatic loadout calculations.
export const ITEMS = MAP_ITEMS.map(i=>({...i,stats:ITEM_STATS[i.id]?.stats||null,cost:ITEM_STATS[i.id]?.cost??i.cost,autoSupported:!!ITEM_STATS[i.id]&&!ITEM_STATS[i.id].unsupportedReason,evidence:i.recipe?'Recipe only; no passive hero stats.':ITEM_STATS[i.id]?.unsupportedReason||'Carried passive bonuses from the v7.07b1 map.'}));
export const MAP_VERSION='7.07b1';
