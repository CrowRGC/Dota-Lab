// Exact v7.07b1 QXD: each carried evasion item multiplies remaining hit chance.
export const ITEM_EVASION=Object.freeze({'the-butterfly':.35,'talisman-of-evasion':.15,"heaven-s-halberd":.2,'radiance-on':.2,'radiance-off':.2});
// Native AIdd DataE1 received-magic multiplier, excluding active buffs and auras.
export const ITEM_MAGIC_MULTIPLIER=Object.freeze({cloak:.85,'glimmer-cape':.85,'hood-of-defiance':.8,'pipe-of-insight':.7,'mage-slayer':.8,bloodthorn:.8,'eternal-shroud':.8});
export function itemDefenseProfile(slots=[]){
 const evasionSources=slots.filter(id=>Object.hasOwn(ITEM_EVASION,id));
 const hitFraction=evasionSources.reduce((chance,id)=>chance*(1-ITEM_EVASION[id]),1);
 // QXD returns100-R2I(QSD*100+.5), preserving the map's integer rounding.
 const evasion=100-Math.floor(hitFraction*100+.5);
 const resistanceSources=slots.filter(id=>Object.hasOwn(ITEM_MAGIC_MULTIPLIER,id));
 const hasPipe=slots.includes('pipe-of-insight');
 const magicResistance=resistanceSources.length>1||hasPipe?null:100*(1-.75*(resistanceSources.length?ITEM_MAGIC_MULTIPLIER[resistanceSources[0]]:1));
 const magicResistanceNotes=hasPipe?['Pipe’s additional magic-resistance aura is not fully modeled. Enter the target’s tested final magic resistance.']:resistanceSources.length>1?['Multiple item magic-resistance stacking is unverified. Enter the target’s final magic resistance to calculate magical item damage.']:[];
 return {evasion,magicResistance,evasionSources,resistanceSources,magicResistanceNotes};
}
