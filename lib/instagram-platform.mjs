import {randomBytes,createCipheriv,createDecipheriv,randomUUID} from 'node:crypto';
import {createInstagramClient,instagramLead,instagramUsername} from './instagram-collector.mjs';
export function instagramSafeError(error){const message=String(error?.message||'');return /^(Instagram |Meta returned |Public professional-account |Connected Instagram |Invalid Instagram |Check the Instagram |Enter a Meta |Token expiry |Update the Instagram )/.test(message)&&!/(?:postgres|EAA[A-Za-z0-9]|https?:\/\/)/.test(message)?message.slice(0,250):'Collection failed. Retry the scan or update the Instagram connection.';}
const AAD=Buffer.from('tgio:instagram-token:v1');
function key(value){const decoded=Buffer.from(value||'','base64url');if(decoded.length!==32)throw Error('Instagram encryption is not configured');return decoded;}
export function encryptInstagramToken(token,secret){const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key(secret),iv);cipher.setAAD(AAD);const data=Buffer.concat([cipher.update(token,'utf8'),cipher.final()]);return ['v1',iv.toString('base64url'),cipher.getAuthTag().toString('base64url'),data.toString('base64url')].join('.');}
export function decryptInstagramToken(value,secret){const [version,iv,tag,data,...extra]=String(value||'').split('.');if(version!=='v1'||extra.length||!iv||!tag||!data)throw Error('Instagram connection must be updated');try{const decipher=createDecipheriv('aes-256-gcm',key(secret),Buffer.from(iv,'base64url'));decipher.setAAD(AAD);decipher.setAuthTag(Buffer.from(tag,'base64url'));return Buffer.concat([decipher.update(Buffer.from(data,'base64url')),decipher.final()]).toString('utf8');}catch{throw Error('Instagram connection must be updated');}}
export function instagramConnectionStatus(settings,now=new Date()){const expires=settings.tokenExpiresAt?new Date(settings.tokenExpiresAt):null;return {connected:Boolean(settings.tokenCiphertext),expired:Boolean(expires&&expires<=now||/authorization expired|access expired/i.test(settings.lastError||'')),expiresAt:expires?.toISOString()||null,expirySoon:Boolean(expires&&expires>now&&expires.getTime()-now.getTime()<7*86400000)};}
export function isRecruitmentTraining(caption){return /\b(instructor development (?:course|program)|course fee|course fees|book your (?:spot|course)|idc (?:batch|calendar))\b/i.test(caption)&&! /\b(we(?:'re| are)? hiring|job vacancy|salary|send (?:your )?(?:cv|resume))\b/i.test(caption);}
/** @param {any} options */
export function createInstagramPlatform({db,encryptionKey,fetchImpl=fetch,now=()=>new Date()}){
 const settings=()=>db.instagramSettings.upsert({where:{id:'main'},create:{id:'main'},update:{}});
 function client(config,token){return createInstagramClient({accessToken:token||decryptInstagramToken(config.tokenCiphertext,encryptionKey),accountId:config.accountId,version:config.apiVersion,pages:1,fetchImpl});}
 async function connect(input){await settings();const username=instagramUsername(input.username);if(!/^\d+$/.test(input.accountId)||!/^v\d+\.\d+$/.test(input.apiVersion))throw Error('Check the Instagram account ID and API version');if(!input.token||input.token.length<30||input.token.length>4096)throw Error('Enter a Meta access token');await client(input,input.token).identity(username);let expires=null;if(input.expiresAt){expires=new Date(input.expiresAt);if(Number.isNaN(expires.getTime())||expires<=now())throw Error('Token expiry must be in the future');}await db.instagramSettings.update({where:{id:'main'},data:{username,accountId:input.accountId,apiVersion:input.apiVersion,tokenCiphertext:encryptInstagramToken(input.token,encryptionKey),tokenExpiresAt:expires,lastError:null}});return {connected:true};}
 async function enqueue(trigger='MANUAL'){
  const config=await settings();const connection=instagramConnectionStatus(config,now());if(!connection.connected||connection.expired)throw Error('Update the Instagram connection before scanning');
  const pending=await db.instagramRun.findFirst({where:{status:{in:['QUEUED','RUNNING']}},orderBy:{createdAt:'asc'}});if(pending)return pending;
  const sources=await db.instagramSource.findMany({where:{enabled:true,...(config.country!=='ALL'?{country:config.country}:{})},orderBy:{username:'asc'},include:{organization:{select:{id:true,name:true,slug:true}}}});
  const snapshot=[{kind:'managed',username:config.username},...sources.filter(s=>s.username!==config.username).map(s=>({id:s.id,kind:'discovery',username:s.username,organizationId:s.organizationId,employerName:s.employerName,organizationSlug:s.organization?.slug||null}))];
  return db.instagramRun.create({data:{trigger,status:'QUEUED',sourceSnapshot:snapshot}});
 }
 async function processBatch(runId,limit=4){
  const leaseId=randomUUID(),stamp=now();const acquired=await db.instagramSettings.updateMany({where:{id:'main',OR:[{leaseUntil:null},{leaseUntil:{lt:stamp}}]},data:{leaseId,leaseUntil:new Date(stamp.getTime()+10*60000)}});if(!acquired.count)return {busy:true};
  try{
   const config=await settings();const run=await db.instagramRun.findUnique({where:{id:runId}});if(!run||!['QUEUED','RUNNING'].includes(run.status))return {run};
   if(instagramConnectionStatus(config,stamp).expired)throw Error('Instagram access expired. Update the connection in the control panel.');
   const api=client(config);const sources=run.sourceSnapshot;let index=run.nextIndex;let lastError=null;
   await db.instagramRun.update({where:{id:run.id},data:{status:'RUNNING'}});
   for(let n=0;n<limit&&index<sources.length;n++,index++){
    const source=sources[index];const row={username:source.username,status:'ok',media:0,leads:0};let added=0,duplicates=0,errors=0;
    const current=source.id?await db.instagramSource.findUnique({where:{id:source.id},include:{organization:{select:{id:true,name:true,slug:true}}}}):null;
    if(source.id&&(!current||!current.enabled)){row.status='skipped';const fresh=await db.instagramRun.findUnique({where:{id:run.id}});await db.instagramRun.update({where:{id:run.id},data:{nextIndex:index+1,details:[...fresh.details,row]}});continue;}
    try{
     const result=source.kind==='managed'?await api.managed(source):await api.discover(source);row.media=result.media.length;
     if(result.storyError){row.storyError=result.storyError;errors++;lastError=result.storyError;}
     const org=current?.organization||null;
     for(const media of result.media){if(isRecruitmentTraining(media.caption))continue;const lead=instagramLead(media,org);if(!lead)continue;
      row.leads++;
      // Reviewed publications may use role-specific fingerprints. Preserve them when the post URL matches.
      const existing=await db.opportunityIntake.findFirst({where:{OR:[{fingerprint:lead.fingerprint},{sourceType:'INSTAGRAM',sourceUrl:lead.sourceUrl,status:{in:['APPROVED','REJECTED']}}]}});
      if(existing){duplicates++;continue;}
      if(!org)lead.extraction.organization=current?.employerName||source.employerName||'Needs verification';
      try{await db.opportunityIntake.create({data:lead});added++;}catch(e){if(e.code==='P2002')duplicates++;else throw e;}
     }
    }catch(error){row.status='error';row.error=instagramSafeError(error);lastError=row.error;errors++;if(error.code===190){await db.instagramSettings.update({where:{id:'main'},data:{lastError:row.error,enabled:false}});row.reconnectRequired=true;}if(error.status===429||[4,17,32,613].includes(error.code))row.rateLimited=true;}
    if(current)await db.instagramSource.update({where:{id:current.id},data:{lastCheckedAt:now(),lastError:row.error||row.storyError||null}});
    const fresh=await db.instagramRun.findUnique({where:{id:run.id}});
    await db.instagramRun.update({where:{id:run.id},data:{nextIndex:index+1,accounts:{increment:1},media:{increment:row.media},leads:{increment:row.leads},queued:{increment:added},duplicates:{increment:duplicates},errors:{increment:errors},details:[...fresh.details,row],errorSummary:lastError}});
    if(row.rateLimited||row.reconnectRequired){await db.instagramRun.update({where:{id:run.id},data:{status:'FAILED',completedAt:now()}});return {stopped:true};}
   }
   const updated=await db.instagramRun.findUnique({where:{id:run.id}});
   if(updated.nextIndex>=sources.length){await db.instagramRun.update({where:{id:run.id},data:{status:updated.errors?(updated.media?'PARTIAL':'FAILED'):'SUCCESS',completedAt:now()}});await db.instagramSettings.update({where:{id:'main'},data:{lastError:updated.errorSummary,lastSuccessAt:updated.errors?config.lastSuccessAt:now()}});}
   return {run:await db.instagramRun.findUnique({where:{id:run.id}})};
  }catch(error){const message=instagramSafeError(error);await db.instagramRun.updateMany({where:{id:runId,status:{in:['QUEUED','RUNNING']}},data:{status:'FAILED',errorSummary:message,completedAt:now()}});await db.instagramSettings.update({where:{id:'main'},data:{lastError:message}});return {error:message};}
  finally{await db.instagramSettings.updateMany({where:{id:'main',leaseId},data:{leaseId:null,leaseUntil:null}});}
 }
 async function tick(){const stamp=now();let config=await settings();await db.instagramSettings.update({where:{id:'main'},data:{lastHeartbeatAt:stamp}});let pending=await db.instagramRun.findFirst({where:{status:{in:['QUEUED','RUNNING']}},orderBy:{createdAt:'asc'}});if(!pending&&config.enabled&&(!config.nextRunAt||config.nextRunAt<=stamp)){try{pending=await enqueue('SCHEDULED');await db.instagramSettings.update({where:{id:'main'},data:{nextRunAt:new Date(stamp.getTime()+config.intervalHours*3600000)}});}catch(e){await db.instagramSettings.update({where:{id:'main'},data:{lastError:instagramSafeError(e),enabled:false}});return {error:instagramSafeError(e)};}}if(!pending)return {idle:true};return processBatch(pending.id,40);}
 return {settings,connect,enqueue,processBatch,tick};
}
