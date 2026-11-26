const STATUS_PRIORITY = Object.freeze({ compatible: 1, conditional: 2, conflict: 3 });

function matchesPair(pair, left, right) {
  return Array.isArray(pair) && pair.length === 2 && (
    (pair[0] === left && pair[1] === right) ||
    (pair[0] === right && pair[1] === left)
  );
}

function matchSpecificity(rule, left, right, attackType, version) {
  if (!rule || !Object.hasOwn(STATUS_PRIORITY, rule.status)) return -1;
  if (rule.versions !== undefined && (
    !Array.isArray(rule.versions) || !rule.versions.includes(version)
  )) return -1;
  if (rule.attackType !== undefined && rule.attackType !== attackType) return -1;

  const exact = Array.isArray(rule.itemPairs) && rule.itemPairs.some(
    (pair) => matchesPair(pair, left.id, right.id)
  );

  // A generic effect interaction never establishes duplicate-item stacking.
  const effect = left.id !== right.id && Array.isArray(rule.effectPairs) &&
    rule.effectPairs.some((pair) => Array.isArray(pair) && pair.length === 2 && (
      (left.effects.includes(pair[0]) && right.effects.includes(pair[1])) ||
      (left.effects.includes(pair[1]) && right.effects.includes(pair[0]))
    ));

  if (!exact && !effect) return -1;

  // Item-specific evidence wins before attack-type specificity. At equal
  // specificity, a negative interaction cannot be hidden by a positive one.
  return (exact ? 100 : 0) + (rule.attackType !== undefined ? 10 : 0) +
    STATUS_PRIORITY[rule.status];
}

/**
 * Analyze explicit item-pair evidence. Slot numbers are zero-based.
 * heroId is accepted in the build contract, but the current rule schema has
 * no hero conditions; this function makes no claims about hero abilities.
 */
export function analyzeBuild(build = {}, dataset = {}) {
  const { slots = [], attackType } = build ?? {};
  const { items = [], rules = [], version } = dataset ?? {};
  const catalog = new Map();
  for (const item of Array.isArray(items) ? items : []) {
    if (!item || typeof item.id !== 'string' || !item.id) continue;
    catalog.set(item.id, {
      ...item,
      effects: Array.isArray(item.effects) ? item.effects : [],
    });
  }

  const selected = (Array.isArray(slots) ? slots : []).slice(0, 6)
    .map((id, slot) => ({ item: catalog.get(id), slot }))
    .filter(({ item }) => item);
  const pairs = [];
  const counts = { compatible: 0, conditional: 0, conflict: 0, unknown: 0 };

  for (let leftIndex = 0; leftIndex < selected.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < selected.length; rightIndex += 1) {
      const left = selected[leftIndex];
      const right = selected[rightIndex];
      let matchedRule;
      let bestSpecificity = -1;

      for (const rule of Array.isArray(rules) ? rules : []) {
        const specificity = matchSpecificity(rule, left.item, right.item, attackType, version);
        if (specificity > bestSpecificity) {
          matchedRule = rule;
          bestSpecificity = specificity;
        }
      }

      const status = matchedRule?.status ?? 'unknown';
      const versionLabel = typeof version === 'string' && version ? version : 'the selected map version';
      pairs.push({
        leftSlot: left.slot,
        rightSlot: right.slot,
        leftId: left.item.id,
        rightId: right.item.id,
        status,
        title: matchedRule?.title ?? 'Interaction not verified',
        explanation: matchedRule?.explanation ??
          `No applicable rule verifies this combination for ${versionLabel}. Do not assume the effects stack or conflict.`,
        sources: Array.isArray(matchedRule?.sources)
          ? matchedRule.sources.map((source) => ({ ...source })) : [],
        ruleId: matchedRule?.id ?? null,
        evidenceScope: matchedRule?.evidenceScope ?? 'unverified',
      });
      counts[status] += 1;
    }
  }

  return { pairs, counts, totalPairs: pairs.length };
}
