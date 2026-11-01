import {createHash} from 'node:crypto';
const USERNAME=/^[a-zA-Z0-9._]{1,30}$/;
export function instagramUsername(value){const name=String(value||'').replace(/^@/,'');if(!USERNAME.test(name))throw Error('Invalid Instagram username');return name.toLowerCase();}
export function instagramFingerprint(account,id){return 'instagram:'+createHash('sha256').update(instagramUsername(account)+'\n'+String(id)).digest('hex');}
export function recruitmentSignal(caption=''){
 return /\b(hiring|recruit(?:ing|ment)?|vacanc(?:y|ies)|apply now|join our team|job openings?|positions? available|we.re looking for|buscamos|trabaja con nosotros|recrutamento|vagas|rejoignez|on recrute|stellenangebote?|wir suchen)\b|#(?:hiring|jobs|vacancies|recruitment)/i.test(caption);
}
function safePostUrl(value,username){try{const u=new URL(value);if(!['www.instagram.com','instagram.com'].includes(u.hostname)||u.protocol!=='https:'||u.username||u.password)return null;u.search='';u.hash='';return u.href;}catch{return null;}}
export function normalizeInstagramMedia(item,source,{story=false,now=new Date()}={}){
 if(!/^\d+$/.test(String(item.id||'')))throw Error('Media identifier is missing');
 const username=instagramUsername(source.username);
 const date=new Date(item.timestamp);if(Number.isNaN(date.getTime()))throw Error('Media timestamp is missing');
 const expiresAt=story?new Date(date.getTime()+86400000).toISOString():null;
 const permalink=safePostUrl(item.permalink,username);
 return {id:String(item.id),username,kind:story?'STORY':item.media_product_type==='REELS'?'REEL':item.media_type==='VIDEO'?'VIDEO':item.media_type==='CAROUSEL_ALBUM'?'CAROUSEL':'POST',caption:String(item.caption||'').slice(0,2200),permalink,sourceUrl:permalink||'https://www.instagram.com/'+username+'/',postedAt:date.toISOString(),expiresAt,expired:Boolean(expiresAt&&new Date(expiresAt)<=now),collectedAt:now.toISOString(),organizationSlug:source.organizationSlug||null,requiresVisualReview:story||!item.caption};
}
export function createInstagramClient({accessToken,accountId,version,fetchImpl=fetch,timeout=15000,pages=3}={}){
 if(!accessToken||!/^\d+$/.test(accountId||''))throw Error('Instagram access token and numeric account ID are required');
 if(!/^v\d{1,3}\.\d{1,2}$/.test(version||''))throw Error('Set INSTAGRAM_API_VERSION to the supported version shown in the Meta app');
 if(!Number.isInteger(pages)||pages<1||pages>10)throw Error('Instagram page limit must be between 1 and 10');
 async function request(path,params={}){
  const url=new URL('https://graph.facebook.com/'+version+'/'+path);
  for(const [key,value]of Object.entries(params))url.searchParams.set(key,value);
  const response=await fetchImpl(url,{headers:{Authorization:'Bearer '+accessToken,Accept:'application/json'},signal:AbortSignal.timeout(timeout)});
  let body;try{body=await response.json();}catch{throw Error('Meta returned an invalid response');}
  if(!response.ok||body.error){const code=body.error?.code;const message=code===190?'Instagram authorization expired or is invalid':code===10||code===200?'Instagram permission or app approval is required':response.status===429||[4,17,32,613].includes(code)?'Instagram rate limit reached; retry later':'Instagram request rejected; check account eligibility and app configuration';const error=new Error(message+(Number.isInteger(code)?' (Meta code '+code+')':''));error.code=code;error.status=response.status;throw error;}
  return body;
 }
 const fields='id,caption,media_type,media_product_type,permalink,timestamp';
 async function ownedEdge(edge,source){
  const output=[];let cursor;
  for(let page=0;page<pages;page++){
   const body=await request(accountId+'/'+edge,{fields:edge==='stories'?'id,media_type,permalink,timestamp':fields,limit:'25',...(cursor?{after:cursor}:{})});
   if(!Array.isArray(body.data))throw Error('Instagram returned no media collection');
   for(const item of body.data)output.push(normalizeInstagramMedia(item,source,{story:edge==='stories'}));
   // Never follow paging.next: it can contain credentials. Rebuild trusted requests.
   const after=body.paging?.cursors?.after;if(!body.paging?.next||typeof after!=='string'||after.length>2000||after===cursor)break;cursor=after;
  }
  return output;
 }
 return {
  async identity(expected){const body=await request(accountId,{fields:'id,username'});if(instagramUsername(body.username)!==instagramUsername(expected))throw Error('Connected Instagram account does not match the configured username');return {id:String(body.id),username:instagramUsername(body.username)};},
  async managed(source){await this.identity(source.username);const media=await ownedEdge('media',source);let stories=[],storyError;try{stories=await ownedEdge('stories',source);}catch(e){storyError=e.message;}return {media:[...media,...stories],storyError};},
  async discover(source){
   const username=instagramUsername(source.username),output=[];let cursor,profileWebsite;
   for(let page=0;page<pages;page++){
    // External-account discovery intentionally has no Stories edge.
    if(cursor&&!/^[A-Za-z0-9_+/=-]+$/.test(cursor))throw Error('Meta returned an unsupported pagination cursor');
    const connection='media.limit(25)'+(cursor?'.after('+cursor+')':'');
    const body=await request(accountId,{fields:'business_discovery.username('+username+'){id,username,website,'+connection+'{'+fields+'}}'});
    profileWebsite=body.business_discovery?.website;
    const media=body.business_discovery?.media;if(!Array.isArray(media?.data))throw Error('Public professional-account media is unavailable');
    for(const item of media.data)output.push(normalizeInstagramMedia(item,source));
    const after=media.paging?.cursors?.after;if(!media.data.length||typeof after!=='string'||!after||after.length>2000||after===cursor)break;cursor=after;
   }
   return {media:output,profileWebsite};
  },
 };
}

export function instagramLead(record,organization){
 if(record.expired||(!recruitmentSignal(record.caption)&&record.kind!=='STORY'))return null;
 const summary=record.caption.slice(0,500)||'A live Instagram story needs visual review. Verify recruitment details before creating a job.';
 return {sourceType:'INSTAGRAM',sourceUrl:record.sourceUrl,fingerprint:instagramFingerprint(record.username,record.id),rawText:summary,
  extraction:{title:'Recruitment post from @'+record.username,organization:organization?.name||'Needs verification',organizationId:organization?.id||null,organizationSlug:organization?.slug||null,country:'Not specified',jobType:'UNSPECIFIED',summary,confidence:0.35,issues:['Verify the vacancy, employer, location, eligibility, and application details before approval'],instagram:{mediaId:record.id,username:record.username,kind:record.kind,postedAt:record.postedAt,collectedAt:record.collectedAt,expiresAt:record.expiresAt,permalink:record.permalink,requiresVisualReview:record.requiresVisualReview}},status:'NEEDS_REVIEW'};
}
