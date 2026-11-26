export const RULESET = {
  version: '7.07b1',
  label: 'v7.07b1',
  notice: 'Target map: v7.07b1. The first rules are supported by the developer’s modern-map changelog. They document the removal of legacy orb restrictions; they have not been retested in-game on v7.07b1. Other proc, duplicate-item and hero-ability interactions remain unverified.',
  mapUrl: 'https://maps.d1map.net/dota/7.07/DotA_Allstars_7.07b1.w3x',
  mapCatalog: 'https://d1map.net/maps',
};

export const HEROES = [
  {id:'drow',name:'Drow Ranger',alias:'Traxex',type:'ranged'},
  {id:'anti-mage',name:'Anti-Mage',alias:'Magina',type:'melee'},
  {id:'viper',name:'Viper',alias:'Netherdrake',type:'ranged'},
  {id:'huskar',name:'Huskar',alias:'Sacred Warrior',type:'ranged'},
  {id:'clinkz',name:'Clinkz',alias:'Bone Fletcher',type:'ranged'},
  {id:'ursa',name:'Ursa',alias:'Ulfsaar',type:'melee'},
  {id:'juggernaut',name:'Juggernaut',alias:'Yurnero',type:'melee'},
  {id:'troll',name:'Troll Warlord',alias:"Jah’rakal",type:'ranged',forms:['ranged','melee']},
].map(h=>({...h,icon:`assets/hero-${h.id}.png`}));

export const ITEMS = [
  {id:'skadi',name:'Eye of Skadi',category:'Attack effects',effects:['legacy-modifier','attack-effect'],search:'cold slow frost'},
  {id:'satanic',name:'Satanic',category:'Lifesteal',effects:['lifesteal'],search:'lifesteal active'},
  {id:'desolator',name:'Stygian Desolator',category:'Attack effects',effects:['legacy-modifier','attack-effect'],search:'armor corruption'},
  {id:'mask-of-madness',name:'Mask of Madness',category:'Lifesteal',effects:['lifesteal'],search:'berserk'},
  {id:'morbid-mask',name:'Morbid Mask',category:'Lifesteal',effects:['lifesteal'],search:'mask of death'},
  {id:'maelstrom',name:'Maelstrom',category:'On-hit & procs',effects:['lightning','attack-effect'],search:'chain lightning'},
  {id:'mjollnir',name:'Mjollnir',category:'On-hit & procs',effects:['lightning','attack-effect'],search:'chain lightning static'},
  {id:'diffusal',name:'Diffusal Blade',category:'Attack effects',effects:['legacy-modifier','attack-effect'],search:'feedback mana burn'},
  {id:'blight-stone',name:'Blight Stone',category:'Attack effects',effects:['attack-effect'],search:'armor corruption',icon:'assets/item-blight-stone.svg'},
  {id:'basher',name:'Cranium Basher',category:'On-hit & procs',effects:['bash'],search:'skull bash stun'},
  {id:'abyssal',name:'Abyssal Blade',category:'On-hit & procs',effects:['bash'],search:'stun'},
  {id:'mkb',name:'Monkey King Bar',category:'On-hit & procs',effects:['strike'],search:'true strike'},
  {id:'crystalys',name:'Crystalys',category:'On-hit & procs',effects:['critical'],search:'critical crit'},
  {id:'buriza',name:'Buriza-do Kyanon',category:'On-hit & procs',effects:['critical'],search:'daedalus critical crit'},
  {id:'vladmir',name:'Vladmir’s Offering',category:'Other items',effects:['aura'],search:'lifesteal aura'},
  {id:'helm-of-dominator',name:'Helm of the Dominator',category:'Other items',effects:['utility'],search:'dominate'},
  {id:'sange',name:'Sange',category:'Other items',effects:['utility'],search:'strength'},
  {id:'yasha',name:'Yasha',category:'Other items',effects:['utility'],search:'agility'},
  {id:'sange-yasha',name:'Sange and Yasha',category:'Other items',effects:['utility'],search:'agility strength'},
  {id:'battle-fury',name:'Battle Fury',category:'Other items',effects:['cleave'],search:'cleave splash'},
  {id:'bkb',name:'Black King Bar',category:'Other items',effects:['utility'],search:'avatar magic immunity'},
  {id:'heart',name:'Heart of Tarrasque',category:'Other items',effects:['regeneration'],search:'behemoth blood health regeneration'},
  {id:'blink',name:'Blink Dagger',category:'Other items',effects:['mobility'],search:'kelen dagger escape damage lockout'},
  {id:'refresher',name:'Refresher Orb',category:'Other items',effects:['refresh'],search:'cooldown reset refresh'},
].map(i=>({...i,icon:i.icon||`assets/item-${i.id}.png`}));

const primary={label:'Developer changelog · 6.89',url:'https://d1stats.ru/89-betas-changelog/?lang=en'};
export const RULES = [
  {
    id:'lifesteal-with-modifier',effectPairs:[['lifesteal','attack-effect']],versions:['7.07b1'],
    status:'compatible',title:'Lifesteal has no legacy orb restriction.',
    summary:'The developer documents removal of legacy orb exclusivity. Other conditions are not covered.',
    explanation:'The developer’s 6.89 changelog states that lifesteal from items stacks with other items. This documents removal of the old orb-exclusivity restriction for this pair. It does not establish proc rates, active-ability behavior or hero-ability interactions.',
    sources:[primary],evidenceScope:'Map-lineage evidence · introduced in 6.89; exact v7.07b1 in-game test pending.'
  },
  {
    id:'legacy-modifiers',effectPairs:[['legacy-modifier','legacy-modifier']],versions:['7.07b1'],
    status:'compatible',title:'The old one-orb restriction was removed.',
    summary:'The developer documents removal of legacy orb exclusivity. Other conditions are not covered.',
    explanation:'The modern-map developer removed the remaining orb effects and buff placers in 6.89. This pair is therefore not documented as mutually exclusive under the old orb system. Any separate effect-specific conditions still need their own rule.',
    sources:[primary],evidenceScope:'Map-lineage evidence · introduced in 6.89; exact v7.07b1 in-game test pending.'
  },
  {
    id:'desolator-blight',itemPairs:[['desolator','blight-stone']],versions:['7.07b1'],
    status:'compatible',title:'These armor-reduction effects stack independently.',
    summary:'The developer documents these two effects stacking independently.',
    explanation:'The developer’s 6.89 changelog specifically documents Desolator and Blight Stone stacking independently. This rule covers that named interaction; it does not calculate armor values or damage.',
    sources:[primary],evidenceScope:'Map-lineage evidence · introduced in 6.89; exact v7.07b1 in-game test pending.'
  },
  {
    id:'duplicate-hearts',itemPairs:[['heart','heart']],versions:['7.07b1'],
    status:'conditional',title:'Regeneration stacks; Behemoth’s Blood does not.',
    summary:'The 7.07a7 announcement separates stacking health regeneration from the non-stacking missing-health effect.',
    explanation:'The platform’s 7.07a7 changelog documents stacking max-health-based regeneration from multiple Hearts. Its Behemoth’s Blood missing-health effect does not stack. This distinction does not imply that every effect of two Hearts is doubled.',
    sources:[{label:'Platform changelog · 7.07a7',url:'https://eurobattle.net/client/news'}],
    evidenceScope:'Recent map-lineage evidence · 7.07a7 announcement; exact v7.07b1 in-game test pending.'
  },
  {
    id:'blink-refresher',itemPairs:[['blink','refresher']],versions:['7.07b1'],
    status:'conditional',title:'Refresher cannot clear Blink’s damage lockout.',
    summary:'The damage-triggered lockout is separate from Blink’s ordinary cooldown.',
    explanation:'The platform’s 7.07a1 changelog documents Blink’s damage-triggered lockout as unrefreshable. This rule concerns that lockout only; it does not claim that Refresher fails to reset every ordinary cooldown.',
    sources:[{label:'Platform changelog · 7.07a1',url:'https://eurobattle.net/client/news'}],
    evidenceScope:'Recent map-lineage evidence · 7.07a1 announcement; exact v7.07b1 in-game test pending.'
  },
];

export const PRESETS = {
  frost:{name:'Frost & lifesteal',heroId:'drow',attackType:'ranged',slots:['skadi','satanic','desolator',null,null,null]},
  lightning:{name:'Lightning build',heroId:'troll',attackType:'ranged',slots:['maelstrom','mjollnir','satanic',null,null,null]},
  duplicates:{name:'Duplicate effects',heroId:'juggernaut',attackType:'melee',slots:['heart','heart',null,null,null,null]},
  blink:{name:'Blink & refresh',heroId:'anti-mage',attackType:'melee',slots:['blink','refresher',null,null,null,null]},
};
