/** @type {Record<string,string>} */
export const JOB_CATEGORIES=Object.freeze({
 OUTDOOR_EDUCATION:'Outdoor education',
 CAMPS:'Camps & youth programs',
 TREKKING_GUIDING:'Trekking & trip guiding',
 ADVENTURE_INSTRUCTION:'Adventure instruction',
 WATER_SPORTS:'Water sports & diving',
 CONSERVATION:'Conservation & fieldwork',
 MANAGEMENT:'Management & leadership',
 OPERATIONS_SUPPORT:'Operations & support',
 OTHER:'Other outdoor roles',
});
export const JOB_CATEGORY_KEYS=Object.keys(JOB_CATEGORIES);
export const isJobCategory=value=>typeof value==='string'&&Object.hasOwn(JOB_CATEGORIES,value);
export const jobCategoryLabel=value=>JOB_CATEGORIES[isJobCategory(value)?value:'OTHER'];
/** Classify the role's title, avoiding unrelated activities in employer boilerplate. */
export function inferJobCategory(title){
 const text=String(title||'').normalize('NFKC').toLowerCase().replace(/[\u200b-\u200d\ufeff]/g,'').replace(/[^\p{L}\p{N}]+/gu,' ');
 if(/\b(manager|director|coordinator|head of|chief executive|ceo|superintendent)\b/.test(text))return 'MANAGEMENT';
 if(/\b(chef|cook|kitchen|galley|pantry|pastry|logistics|facilities|maintenance|cleaner|housekeeping|driver|accountant|accounting|finance|marketing|sales|alumni|external relations|business development|media|photographer|captain|mate|customer service|reception|administrat\w*)\b/.test(text))return 'OPERATIONS_SUPPORT';
 if(/\b(conservation|ecologist|ecology|biologist|ranger|steward|warden|restoration|reforestation|field technician|wildlife researcher)\b/.test(text))return 'CONSERVATION';
 if(/\b(camps?|counsell?or|youth worker)\b/.test(text))return 'CAMPS';
 if(/\b(scuba|diving|dive|divemaster|padi|sailing|sail|kayak(?:ing)?|canoe|canoeing|paddl\w*|rafting|surf(?:ing)?|watersports|water sports|lifeguard|snorkel\w*)\b/.test(text))return 'WATER_SPORTS';
 if(/\b(guide|guiding|trek|treks|trekking|backpacking|hiking|expedition|trip leader|tour leader|cycling event leader)\b/.test(text))return 'TREKKING_GUIDING';
 if(/\b(climbing|climb|ropes?|challenge course|cycling|mountain bik\w*|ski|skiing|snowboard\w*|adventure|activit(?:y|ies))\b/.test(text))return 'ADVENTURE_INSTRUCTION';
 if(/\b(educat\w*|teacher|teaching|faculty|field instructors?|wilderness instructors?|outdoor pursuits instructors?|outdoor instructors?|program instructors?|programme instructors?|lead program instructors?|science instructors?|biology instructors?|medicine instructors?)\b/.test(text))return 'OUTDOOR_EDUCATION';
 return 'OTHER';
}
