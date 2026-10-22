/** Bounded English quantity/scope heuristics, not measurement identity or factual verification. */
const SCALE = { thousand: 1e3, million: 1e6, billion: 1e9, trillion: 1e12 };
const UNIT = new Map();
for (const [canonical, aliases] of Object.entries({
  '%': ['%', 'percent', 'percentage', 'per cent'], 'percentage-points': ['percentage points', 'percentage point'], countries: ['countries', 'country'],
  people: ['people', 'persons', 'deaths', 'death', 'lives'], households: ['households', 'household'],
  cities: ['cities', 'city'], members: ['members'], states: ['states'], usd: ['usd', 'us$', 'dollars', 'dollar'],
  euros: ['euros', 'euro'], hectares: ['hectares', 'ha'], km: ['km', 'kilometres', 'kilometers'],
  km2: ['km2', 'km²'], tonnes: ['tonnes', 'tons'], mw: ['mw'], gw: ['gw'], cases: ['cases'],
  events: ['events'], disasters: ['disasters'], hazards: ['hazards'], reports: ['reports'], projects: ['projects'],
  partners: ['partners'], organizations: ['organizations', 'organisations'], governments: ['governments'],
  municipalities: ['municipalities'], schools: ['schools'], hospitals: ['hospitals'], children: ['children'],
  women: ['women'], men: ['men'], adults: ['adults'], staff: ['staff'], participants: ['participants'],
  times: ['times'], fold: ['fold'], years: ['years'], homes: ['homes', 'houses'],
})) for (const alias of aliases) UNIT.set(alias, canonical);

export function readQuantities(input) {
  const text = String(input), found = [];
  // Offsets distinguish repeated identical values; punctuation/signs are retained for abstention below.
  const pattern = /(?<![\w.])(?:(US\$|USD|EUR|[$€])\s*)?(\d+(?:[,\s]\d+)*(?:\.\d+)*)\s*(%|[\p{L}]+\$?(?:[²2])?)?/gu;
  for (const match of text.matchAll(pattern)) {
    // Consume first, then validate: unsupported grouping/decimal forms never leak a prefix.
    if (!/^(?:\d{1,3}(?:,\d{3})+|\d{1,3}(?:\s\d{3})+|\d+)(?:\.\d+)?$/.test(match[2])) continue;
    const value = Number(match[2].replace(/[,\s]/g, ''));
    let word = (match[3] || '').toLowerCase(), scale = SCALE[word] || 1;
    let suffix = text.slice(match.index + match[0].length), subset = false;
    if (word === 'percentage' && /^[\s‐‑–-]+points?\b/i.test(suffix)) word = 'percentage points';
    if (word === 'per' && /^\s+cent\b/i.test(suffix)) word = 'per cent';
    if (word === 'of' && /^\s+(which|these|those|them)\b/i.test(suffix) && found.length) {
      const previous = found.at(-1);
      word = previous.unit;
      subset = true;
    }
    const currency = match[1] && (/EUR|€/i.test(match[1]) ? 'euros' : 'usd');
    let dimension = currency || UNIT.get(word);
    if (SCALE[word]) {
      const noun = suffix.match(/^\s+([\p{L}]+\$?)\b/u)?.[1]?.toLowerCase();
      dimension ||= UNIT.get(noun);
    }
    if (!dimension && !SCALE[word]) continue;
    // Bare magnitudes remain visible in the legacy receipt, but cannot establish a counted unit.
    const unit = currency && !SCALE[word] ? currency : word === 'percentage points' ? 'percentage-points' : word === 'per cent' || word === 'percent' || word === 'percentage' ? '%' : word === 'country' ? 'countries' : word || dimension;
    const before = text.slice(Math.max(0, match.index - 1), match.index);
    const rate = /^\s*(?:per\b|\/)/i.test(suffix) || /\bper\s+\d|\/\s*\d/.test(text);
    const decimalComma = /\d,$/.test(text.slice(0, match.index));
    found.push({ value, unit, dimension, scale, index: match.index, end: match.index + match[0].length,
      unsafe: !Number.isFinite(value) || /^[.,]\d/.test(suffix) || rate || decimalComma || /[−–+\-/]/.test(before), subset });
  }
  return found;
}

const definitions = {
  affected: /\b(?:affected|impacted)\b/i,
  displaced: /\b(?:displaced|displacement)\b/i,
  evacuated: /\b(?:evacuated|evacuation)\b/i,
  deaths: /\b(?:deaths?|died|killed|fatalities|mortality|lives lost)\b/i,
  injuries: /\b(?:injured|injuries)\b/i,
  losses: /\b(?:losses|damage|damages|economic cost)\b/i,
  funding: /\b(?:funding|financing|investment|invested|budget)\b/i,
  area: /\b(?:area|land|territory)\b/i,
  population: /\b(?:population|residents|inhabitants)\b/i,
  probability: /\b(?:probability|likelihood|chance)\b/i,
  coverage: /\b(?:coverage|covered|access)\b/i,
};
const measures = text => {
  const result = new Set(Object.entries(definitions).filter(([, re]) => re.test(text)).map(([key]) => key));
  // A population affected/displaced is an impact measure, rather than two independent measurements.
  if (['affected', 'displaced', 'evacuated', 'deaths', 'injuries'].some(key => result.has(key))) result.delete('population');
  return result;
};
const hazardWords = { flood: /\bflood(?:s|ing)?\b/i, drought: /\bdroughts?\b/i, landslide: /\blandslides?\b/i,
  earthquake: /\bearthquakes?\b/i, cyclone: /\b(?:cyclones?|hurricanes?|typhoons?)\b/i,
  wildfire: /\b(?:wildfires?|forest fires?)\b/i, tsunami: /\btsunamis?\b/i, heat: /\bheatwaves?\b/i };
const hazards = text => new Set(Object.entries(hazardWords).filter(([, re]) => re.test(text)).map(([key]) => key));
const words = text => String(text).toLowerCase().match(/[\p{L}]+/gu) || [];
const STOP = new Set('a an the and or of to in on for by with from at as is are was were be been this that these those its their our which who while than into over under about more less nearly around some per cent percent number total recorded reported estimated'.split(' '));
const lexical = text => new Set(words(text).filter(word => word.length > 2 && !STOP.has(word)).map(word => word.replace(/(ing|ed|es|s)$/, '')));
const overlap = (a, b) => [...a].some(x => b.has(x));
const different = (a, b) => a.size && b.size && !overlap(a, b);
const same = (a, b) => a.size === b.size && [...a].every(x => b.has(x));

// Clause boundaries isolate e.g. affected and displaced populations without changing original evidence.
function clause(text, q, quantities) {
  const boundaries = [...text.matchAll(/;|\b(?:while|whereas|but|and)\b/gi)]
    .filter(boundary => quantities.some(item => item.end <= boundary.index)
      && quantities.some(item => item.index > boundary.index));
  let start = 0, end = text.length;
  for (const boundary of boundaries) {
    if (boundary.index < q.index) start = boundary.index + boundary[0].length;
    else if (boundary.index >= q.end) { end = boundary.index; break; }
  }
  return text.slice(start, end);
}
function sourceScope(fact, q, quantities) {
  const local = clause(fact.text, q, quantities), context = fact.context || '';
  const extract = re => new Set((`${local} ${context}`.match(re) || []).map(x => x.toLowerCase().replace(/\s+/g, ' ')));
  const ownYears = local.match(/\b(?:19|20)\d{2}\b/g);
  const years = new Set(ownYears || context.match(/\b(?:19|20)\d{2}\b/g) || []);
  const months = extract(/\b(?:january|february|march|april|may|june|july|august|september|october|november|december)\b/gi);
  const dates = extract(/\b(?:\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)|(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}|(?:19|20)\d{2}-\d{2}-\d{2})\b/gi);
  // Equivalent quarter spellings share a key; unmatched period markers abstain below.
  const quarters = new Set([...`${local} ${context}`.matchAll(/\b(?:q([1-4])|([1-4])(?:st|nd|rd|th)?[ -]+quarter|(first|second|third|fourth)[ -]+quarter|quarter\s+([1-4]))\b/gi)]
    .map(m => m[1] || m[2] || m[4] || ({ first: '1', second: '2', third: '3', fourth: '4' })[m[3].toLowerCase()]));
  const periods = extract(/\b(?:(?:first|second|third|fourth|early|late|mid)[ -]+(?:half|period|semester|trimester)|h[12]|(?:fiscal|financial|calendar)[ -]+year)\b/gi);
  // Retained headings can be opaque place/entity scopes. Unequal short heading paths
  // veto comparison; they are never interpreted as known places or model ground truth.
  const headings = new Set(context.split(/\s+[\/·]\s+|\n/).map(s => s.trim().toLowerCase().replace(/\s+/g, ' '))
    .filter(s => s && s.length <= 100 && !/[.!?]/.test(s)));
  const times = extract(/\b(?:[01]?\d|2[0-3]):[0-5]\d\b/g);
  // Only explicit capitalized prepositional locations; no gazetteer, geocoding or guessed place names.
  const places = new Set([...`${local} ${context}`.matchAll(/\b(?:[Ii]n|[Aa]cross|[Ww]ithin|[Tt]hroughout)\s+(?:the\s+)?((?:[A-Z][\p{L}]+)(?:\s+(?:and\s+)?[A-Z][\p{L}]+){0,2})\b/gu)]
    .map(m => m[1].toLowerCase()).filter(place => !/^(?:the|january|february|march|april|may|june|july|august|september|october|november|december)\b/.test(place)));
  const populations = new Set([...extract(/\b(?:children|adults|women|men|households|people|persons|residents|population|countries|schools|hospitals|homes|houses)\b/gi)].map(x => x === 'persons' ? 'people' : x === 'houses' ? 'homes' : x));
  const denominator = new Set([...`${local} ${context}`.matchAll(/\b(?:of|among)\s+(?:(?:the|all)\s+)?((?:(?:surveyed|registered|rural|urban)\s+)*(?:children|adults|women|men|households|people|residents|population|countries|schools|hospitals|homes|houses))\b/gi)]
    .map(m => m[1].toLowerCase()));
  const basis = new Set([...extract(/\b(?:annual|annually|yearly|monthly|daily|cumulative)\b/gi)].map(x => /annual|yearly/.test(x) ? 'annual' : x));
  const mode = new Set([...extract(/\b(?:projected|forecast|predicted|observed)\b/gi)].map(x => x === 'observed' ? x : 'projected'));
  const change = new Set([...extract(/\b(?:increase|increased|growth|decrease|decreased|decline|reduction)\b/gi)].map(x => /increase|growth/.test(x) ? 'increase' : 'decrease'));
  const localMeasures = measures(local);
  const negated = /\b(?:not|never|no|without)\b/i.test(local);
  const bounded = /\b(?:at least|at most|up to|more than|less than|fewer than|over|under)\s+\d|[<>≤≥]\s*\d/i.test(local);
  const approximate = /\b(?:about|around|approximately|approx|roughly|nearly|almost|circa|estimated|estimate|rounded|rounding|some)\b|[~≈]/i.test(`${local} ${context}`);
  return { local, negated, bounded, approximate, quarters, periods, headings, measures: localMeasures.size ? localMeasures : measures(context), hazards: hazards(`${local} ${context}`), years, months, dates, times, places, populations, denominator, basis, mode, change };
}

// A selection owns this cache: no cross-document retention or stale source scope.
export function scopedQuantities(fact) {
  const quantities = readQuantities(fact.text);
  return quantities.map(q => ({ ...q, scope: sourceScope(fact, q, quantities) }));
}

export function comparableQuantities(a, x, b, y) {
  if (x.unsafe || y.unsafe || !x.dimension || x.dimension !== y.dimension) return false;
  const left = x.scope || sourceScope(a, x, readQuantities(a.text)), right = y.scope || sourceScope(b, y, readQuantities(b.text));
  if (left.approximate || right.approximate || left.bounded || right.bounded || left.negated !== right.negated || Boolean(left.change.size) !== Boolean(right.change.size)) return false;
  // A specified period on only one side is insufficient to establish shared time.
  for (const key of ['quarters', 'periods']) if (!same(left[key], right[key])) return false;
  if (left.headings.size && right.headings.size && !same(left.headings, right.headings)) return false;
  // Ambiguous multi-hazard or multi-measure claims cannot establish scope with these rules.
  if (left.hazards.size > 1 || right.hazards.size > 1 || different(left.hazards, right.hazards)) return false;
  for (const key of ['years', 'months', 'dates', 'times', 'places', 'populations', 'denominator', 'basis', 'mode', 'change']) {
    if (different(left[key], right[key])) return false;
  }
  // Shared years/places must not hide an additional, differing scope item.
  for (const key of ['years', 'months', 'dates', 'times', 'places', 'populations', 'denominator']) if (left[key].size && right[key].size && !same(left[key], right[key])) return false;
  if (left.measures.size > 1 || right.measures.size > 1 || different(left.measures, right.measures)) return false;
  const l = lexical(left.local), r = lexical(right.local);
  const shared = [...l].filter(word => r.has(word)).length;
  const wording = shared >= 2 && shared / Math.max(1, Math.min(l.size, r.size)) >= 0.6;
  // Controlled paraphrases need a recognized shared measure plus an explicit shared hazard or population.
  const paraphrase = left.measures.size === 1 && same(left.measures, right.measures)
    && (overlap(left.hazards, right.hazards) || overlap(left.populations, right.populations));
  return wording || paraphrase;
}

/** Only an explicit interval is a range; an arbitrary list of values is not one. */
export function hasRange(text) {
  return /\bbetween\s+\S+[\s\S]*?\band\s+(?:[$€]\s*)?\d|\d[\d,.]*\s*(?:%|[\p{L}$]+)?\s*(?:to|[–−-])\s*(?:[$€]\s*)?\d/iu.test(text);
}
