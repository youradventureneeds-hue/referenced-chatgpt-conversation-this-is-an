import { createHash } from 'node:crypto';
import { load } from 'cheerio';
import robotsParser from 'robots-parser';

export const BOT = 'TGIOJobBot';
export const IMPORT_CHANNEL = 'OFFICIAL_CAREERS_AUTO';
const ATS = /(^|\.)(greenhouse\.io|lever\.co|prismhr-hire\.com|bamboohr\.com|applytojob\.com|workable\.com|icims\.com|myworkdayjobs\.com|paylocity\.com|paycomonline\.net)$/i;
const GENERIC = new Set(['ymca','camp','camps','the','and','for','of','school','schools','outward','bound','network','boys','girls','inc','national','outdoor']);

export function publicUrl(value, base) {
  const u = new URL(value, base);
  const host = u.hostname.toLowerCase();
  if (!['http:','https:'].includes(u.protocol) || u.username || u.password || /^(localhost|127\.|0\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|\[)/.test(host) || !host.includes('.')) throw new Error('Unsupported public URL');
  u.hash = '';
  for (const key of [...u.searchParams.keys()]) if (/^utm_|^(fbclid|gclid|ref|source)$/i.test(key)) u.searchParams.delete(key);
  return u.href;
}

export function plain(value) {
  const decoded = String(value || '').replace(/\\u([\da-f]{4})/gi, (_, code) => String.fromCharCode(parseInt(code,16)));
  const $ = load(decoded.replace(/<\/?(?:p|div|h[1-6]|li|ul|ol|br|section|article|main)\b[^>]*>/gi,' '));
  $('script,style').remove();
  return $.text().replace(/\s+/g,' ').trim();
}

export function identity(orgId, sourceKey) {
  return createHash('sha256').update(orgId + '\n' + sourceKey).digest('hex');
}

export function employerMatches(org, value) {
  const words = org.name.toLowerCase().replace(/[^a-z0-9]+/g,' ').split(' ').filter(w=>w.length>2&&!GENERIC.has(w));
  const normalized = plain(value).toLowerCase().replace(/[^a-z0-9]+/g,' ');
  const acronyms=(org.name.match(/\b[A-Z]{3,6}\b/g)||[]).filter(w=>!GENERIC.has(w.toLowerCase()));
  return acronyms.some(w=>new RegExp('\\b'+w.toLowerCase()+'\\b').test(normalized)) || (words.length>0 && words.filter(w=>new RegExp('\\b'+w+'\\b').test(normalized)).length>=Math.min(2,words.length));
}

export function countryName(value) {
  const raw = typeof value === 'object' ? value?.name || value?.addressCountry : value;
  if (typeof raw !== 'string' || !raw.trim()) return undefined;
  const text = raw.trim();
  if (/^[a-z]{2}$/i.test(text)) {
    try { return new Intl.DisplayNames(['en'],{type:'region'}).of(text.toUpperCase()); } catch { return undefined; }
  }
  return /^(United States(?: of America)?|USA)$/i.test(text) ? 'United States' : text;
}

export function workType(value, title = '', description = '') {
  const raw = [].concat(value || []).join(' ').replace(/_/g,' ');
  // A job may supervise volunteers or seasonal staff without itself being that type.
  // Infer only from the title or an explicit declaration about this position.
  const declarations=[...description.matchAll(/(?:employment\s+type|position\s+type|job\s+type|position\s+status)\s*[:\-]\s*([^.\n]{1,70})|(?:this\s+(?:is\s+an?|role\s+is\s+an?|position\s+is\s+an?)\s+)((?:full[ -]?time|part[ -]?time|seasonal|volunteer|internship)[^.\n]{0,35})/gi)].map(match=>match[1]||match[2]).join(' ');
  const text = raw || title+' '+declarations;
  const types = [
    ['INTERNSHIP',/\bintern(?:ship)?\b/i], ['VOLUNTEER',/\bvolunteer\b/i],
    ['SEASONAL',/\bseasonal\b/i], ['PART_TIME',/\bpart[ -]?time\b/i], ['FULL_TIME',/\bfull[ -]?time\b/i],
  ].filter(([,pattern])=>pattern.test(text)).map(([type])=>type);
  return types.length === 1 ? types[0] : undefined;
}

export function expiryDate(value) {
  if (typeof value !== 'string') return undefined;
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? value+'T23:59:59.999Z' : value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : undefined;
}

export function extractStructured(html, pageUrl, org, requireMention = false) {
  const $ = load(html);
  const records = [];
  function visit(value, depth=0) {
    if (!value || typeof value !== 'object' || depth > 25) return;
    if (Array.isArray(value)) return value.forEach(item=>visit(item,depth+1));
    if ([].concat(value['@type']||[]).some(type=>/(?:^|\/)JobPosting$/.test(type))) {
      let url;
      try { url = publicUrl(value.url || value.mainEntityOfPage?.['@id'] || pageUrl,pageUrl); } catch { return; }
      const address = [].concat(value.jobLocation || [])[0]?.address;
      const remoteCountry = [].concat(value.applicantLocationRequirements || [])[0];
      const description = plain(value.description);
      const title = plain(value.title);
      const employer = plain(value.hiringOrganization?.name);
      const identifier = value.identifier?.value || value.identifier;
      const detailUrl=/\/(?:job|jobs|careers|positions?|openings?)\/[\w-]+|[?&](?:jobid|gh_jid|requisitionid)=/i.test(url);
      const sourceKey = typeof identifier === 'string' || typeof identifier === 'number'
        ? new URL(pageUrl).hostname+':'+identifier : detailUrl ? url : url+'|'+title.toLowerCase();
      records.push({ title, description, url, sourceKey,
        employer, employerMatched:employerMatches(org,requireMention ? title+' '+description : employer),
        country:countryName(address?.addressCountry || remoteCountry?.name)||'Not specified',
        region:[address?.addressLocality,address?.addressRegion].filter(Boolean).join(', ') || undefined,
        workType:workType(value.employmentType,title,description)||'UNSPECIFIED',
        expiresAt:expiryDate(value.validThrough), datePosted:expiryDate(value.datePosted), evidence:'JobPosting JSON-LD',
      });
    }
    for (const child of Object.values(value)) visit(child,depth+1);
  }
  $('script[type="application/ld+json"]').each((_,el)=>{try{visit(JSON.parse($(el).text()))}catch{}});
  return [...new Map(records.map(row=>[row.sourceKey,row])).values()];
}

export function assess(candidate, now = new Date()) {
  const issues=[];
  if (!candidate.title || candidate.title.length<4 || candidate.title.length>180) issues.push('Missing or invalid title');
  if (candidate.description.length < 100) issues.push('Insufficient vacancy description');
  if (!candidate.employerMatched) issues.push('Employer could not be matched to this organization');
  if (!candidate.country) issues.push('Job country is not stated');
  if (!candidate.workType) issues.push('Work type is absent or ambiguous');
  if (!candidate.url) issues.push('No official vacancy URL');
  const expired = candidate.expiresAt && new Date(candidate.expiresAt)<now;
  if (expired) issues.push('Application deadline has passed');
  if (candidate.datePosted && new Date(candidate.datePosted)>new Date(now.getTime()+86400000)) issues.push('Posting date is in the future');
  if (candidate.datePosted && now-new Date(candidate.datePosted)>365*86400000) issues.push('Posting is over a year old; confirm it is still open');
  return { publishable:issues.length===0, expired:Boolean(expired), issues };
}

export function extractHtmlVacancy(html,pageUrl,org,requireMention=false) {
  // Training enrollment can also say "apply" and name an instructor role.
  if(/(?:training[-_/]?courses?|instructor[-_/]?training|certification[-_/]?courses?)/i.test(new URL(pageUrl).pathname))return [];
  const $=load(html);
  $('nav,header,footer,script,style,form').remove();
  const title=plain($('h1').first().text());
  // A specific role heading and explicit application link distinguish vacancies
  // from general careers, staff biographies, courses, and recruitment landing pages.
  if(!title||title.length>140||/careers|employment|opportunities|our team|about|join us|application|work (?:at|with|for)|training|staff|open positions|^become\b/i.test(title))return [];
  if(!/\b(educator|teacher|instructor|director|manager|coordinator|specialist|counsell?or|guide|assistant|intern|nurse|cook|chef|lifeguard|technician|officer|fellow|cleaner|supervisor)\b/i.test(title))return [];
  const apply=$('a[href]').toArray().some(el=>/\bapply\b|submit.*application/i.test($(el).text()));
  if(!apply)return [];
  const area=$('main,article,.job-description,#job-description').first();
  const text=plain((area.length?area:$('body')).html());
  if(text.length<200)return [];
  const mentioned=employerMatches(org,text);
  if(!mentioned)return [];
  const explicitCountry=/\bUnited States\b|\bUnited Kingdom\b|\bCanada\b|\bIndia\b|\bGermany\b/.exec(text)?.[0];
  const type=workType(null,title,text)||'UNSPECIFIED';
  return [{title,description:text,url:publicUrl(pageUrl),sourceKey:publicUrl(pageUrl)+'|'+title.toLowerCase(),employer:org.name,employerMatched:mentioned,country:explicitCountry||'Not specified',workType:type,evidence:'Official HTML vacancy with role heading and application link'}];
}

export function discoverLinks(html, pageUrl) {
  const $=load(html);
  $('nav,header,footer,script,style').remove();
  const careers=[]; const vacancies=[]; const feeds=[];
  $('a[href],iframe[src]').each((_,el)=>{
    try{
      const href=publicUrl($(el).attr('href')||$(el).attr('src'),pageUrl);
      const u=new URL(href), base=new URL(pageUrl);
      if (u.hostname.replace(/^www\./,'')!==base.hostname.replace(/^www\./,'')&&!ATS.test(u.hostname))return;
      const label=plain($(el).text());
      if (/\.(pdf|docx?|jpe?g|png)(?:\?|$)/i.test(href))return;
      if (/(^|\.)(boards|job-boards)\.greenhouse\.io$/.test(u.hostname))feeds.push({provider:'greenhouse',token:u.pathname.split('/').filter(Boolean)[0],url:href});
      if (/^jobs\.(eu\.)?lever\.co$/.test(u.hostname))feeds.push({provider:'lever',token:u.pathname.split('/').filter(Boolean)[0],url:href,eu:u.hostname.includes('.eu.')});
      if (/\/(?:job|jobs|careers|positions?|openings?)\/[\w-]+|[?&](?:jobid|gh_jid|requisitionid)=/i.test(href) && !/view all|all jobs|job search/i.test(label))vacancies.push(href);
      else if (/careers?|employment|vacancies|work-with-us|open.positions|current.openings|view.jobs/i.test(href+' '+label))careers.push(href);
    }catch{}
  });
  // Career navigation is commonly in the header, so include same-site career links separately.
  const full=load(html);
  full('a[href]').each((_,el)=>{try{
    const href=publicUrl(full(el).attr('href'),pageUrl);
    if(new URL(href).hostname===new URL(pageUrl).hostname && /\/(careers?|employment|work-with-us)(\/|$)/i.test(new URL(href).pathname))careers.push(href);
  }catch{}});
  return {careers:[...new Set(careers)].filter(u=>u!==pageUrl).slice(0,3),vacancies:[...new Set(vacancies)].filter(u=>u!==pageUrl).slice(0,20),feeds:[...new Map(feeds.map(f=>[f.provider+f.token,f])).values()]};
}

export function feedFromUrl(value) {
  const u=new URL(value),token=u.pathname.split('/').filter(Boolean)[0];
  if(/(^|\.)(boards|job-boards)\.greenhouse\.io$/.test(u.hostname))return {provider:'greenhouse',token,url:u.href};
  if(/^jobs\.(eu\.)?lever\.co$/.test(u.hostname))return {provider:'lever',token,url:u.href,eu:u.hostname.includes('.eu.')};
  return undefined;
}

export function createClient({fetchImpl=fetch,delay=600,timeout=15000}={}) {
  const hostQueues=new Map(), cache=new Map(), robots=new Map();
  async function raw(url) {
    const origin=new URL(url).origin;
    const previous=hostQueues.get(origin)||Promise.resolve();
    let release;const done=new Promise(resolve=>{release=resolve});
    hostQueues.set(origin,previous.catch(()=>{}).then(()=>done));
    await previous.catch(()=>{});
    try{
      if(delay)await new Promise(resolve=>setTimeout(resolve,delay));
      const response=await fetchImpl(url,{headers:{'User-Agent':BOT+'/1.0 (+official careers aggregation)','Accept':'text/html,application/json'},signal:AbortSignal.timeout(timeout)});
      if(!response.ok){const error=new Error('HTTP '+response.status);error.status=response.status;throw error;}
      if(Number(response.headers.get('content-length'))>3_000_000)throw new Error('Response is too large');
      const reader=response.body.getReader(),chunks=[];let size=0;
      try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>3_000_000)throw new Error('Response is too large');chunks.push(Buffer.from(value));}}finally{await reader.cancel();}
      const finalUrl=publicUrl(response.url||url);
      return {url:finalUrl,text:Buffer.concat(chunks).toString('utf8')};
    }finally{release();}
  }
  async function get(url,{api=false}={}) {
    url=publicUrl(url);
    if(!api){
      const origin=new URL(url).origin;
      if(!robots.has(origin))robots.set(origin,raw(origin+'/robots.txt').then(r=>robotsParser(origin+'/robots.txt',r.text)).catch(e=>{if(e.status===404)return null;throw new Error('Robots rules unavailable: '+e.message);}));
      const rules=await robots.get(origin);
      if(rules?.isAllowed(url,BOT)===false)throw new Error('Disallowed by robots.txt');
    }
    if(!cache.has(url))cache.set(url,raw(url));
    return cache.get(url);
  }
  return {get};
}

export async function readFeed(feed,org,client,requireMention=false) {
  const jobs=[];let complete=true;
  if(!/^[a-z\d_-]+$/i.test(feed.token||''))throw new Error('Invalid feed identifier');
  const records=[];
  if(feed.provider==='greenhouse'){
    const response=await client.get('https://boards-api.greenhouse.io/v1/boards/'+feed.token+'/jobs?content=true',{api:true});
    const body=JSON.parse(response.text);if(!Array.isArray(body.jobs))throw new Error('Invalid Greenhouse feed');
    complete=body.meta?.total===undefined||body.meta.total===body.jobs.length;
    for(const item of body.jobs)records.push({id:item.id,title:item.title,url:item.absolute_url,description:plain(item.content),location:item.location?.name});
  }else if(feed.provider==='lever'){
    complete=false;
    for(let skip=0;skip<1000;skip+=100){
      const host=feed.eu?'api.eu.lever.co':'api.lever.co';
      const response=await client.get('https://'+host+'/v0/postings/'+feed.token+'?mode=json&limit=100&skip='+skip,{api:true});
      const body=JSON.parse(response.text);if(!Array.isArray(body))throw new Error('Invalid Lever feed');
      for(const item of body)records.push({id:item.id,title:item.text,url:item.hostedUrl,description:plain([item.descriptionPlain,...(item.lists||[]).map(l=>l.content)].join(' ')),location:item.categories?.location,type:item.categories?.commitment,country:item.country});
      if(body.length<100){complete=true;break;}
    }
  }else throw new Error('Unsupported feed');
  for(const item of records){
    const description=item.description;
    const location=item.location||'';
    const country=item.country||(/\b(?:USA|United States)\b/i.test(location)?'United States':undefined);
    jobs.push({title:plain(item.title),description,url:publicUrl(item.url),sourceKey:feed.provider+':'+feed.token+':'+item.id,employer:org.name,
      employerMatched:!requireMention||employerMatches(org,item.title+' '+description),region:location||undefined,
      workType:workType(item.type,item.title,description)||'UNSPECIFIED',country:countryName(country)||'Not specified',evidence:feed.provider+' official feed'});
  }
  return {jobs,complete,feedKey:feed.provider+':'+feed.token};
}

export async function crawlOrganization(org,source,client) {
  if(source.enabled===false)return {status:'skipped',reason:source.reason||'Disabled source',jobs:[],complete:false};
  const url=source.url||org.careersUrl||org.website;
  if(!url)return {status:'skipped',reason:'No official careers URL',jobs:[],complete:false};
  const expected=org.name.toLowerCase().split(/[^a-z0-9]+/).filter(w=>w.length>3&&!GENERIC.has(w));
  const requireMention=Boolean(source.requireOrganizationMention || (/^ymca/i.test(org.name)&&!expected.some(w=>url.toLowerCase().includes(w))));
  const jobs=[],warnings=[],seen=new Set();let complete=false,feedKey;
  const directFeed=feedFromUrl(url);
  if(directFeed){const result=await readFeed(directFeed,org,client,requireMention);return {status:'ok',...result,warnings,pages:1};}
  async function visit(url,depth=0){
    if(seen.has(url)||seen.size>=25)return;seen.add(url);
    const page=await client.get(url);
    const $=load(page.text);
    if(/just a moment|access denied|attention required/i.test($('title').text()))throw new Error('Site blocked automated access');
    const structured=extractStructured(page.text,page.url,org,requireMention);
    jobs.push(...structured);
    if(!structured.length)jobs.push(...extractHtmlVacancy(page.text,page.url,org,requireMention));
    const links=discoverLinks(page.text,page.url);
    for(const feed of links.feeds){try{const result=await readFeed(feed,org,client,requireMention);jobs.push(...result.jobs);if(result.complete){complete=true;feedKey=result.feedKey;}}catch(e){warnings.push(e.message);}}
    if(depth<2){
      for(const link of [...links.vacancies,...(depth===0?links.careers:[])]){
        try{await visit(link,depth+1);}catch(e){warnings.push(link+': '+e.message);}
      }
    }
  }
  try{await visit(publicUrl(url));}catch(error){
    if(!/HTTP (404|410)/.test(error.message))throw error;
    await visit(new URL('/',url).href);
  }
  return {status:jobs.length||complete?'ok':'needs_attention',jobs:[...new Map(jobs.map(j=>[j.sourceKey,j])).values()],complete,feedKey,warnings,pages:seen.size};
}
