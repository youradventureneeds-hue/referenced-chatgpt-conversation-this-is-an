const REQUIRED=['instagram_basic','instagram_manage_insights','pages_show_list','pages_read_engagement'];
export function normalizeInstagramAccess(data,{expectedAppId='1430683145936095',now=new Date()}={}){
 if(!data||data.is_valid!==true)throw Error('Instagram authorization expired or is invalid. Generate and extend a new token in Meta.');
 if(String(data.app_id)!==expectedAppId)throw Error('Instagram token belongs to a different Meta app. Select The Great Indian Outdoors.');
 const missing=REQUIRED.filter(scope=>!Array.isArray(data.scopes)||!data.scopes.includes(scope));if(missing.length)throw Error('Instagram read permissions are incomplete. Reauthorize the linked Page using the four required read permissions.');
 const deadlines=[data.expires_at,data.data_access_expires_at].filter(value=>Number.isFinite(value)&&value>0).map(value=>new Date(value*1000));
 if(data.expires_at!==0&&!(Number.isFinite(data.expires_at)&&data.expires_at>0))throw Error('Meta did not return a verified Instagram token expiry. Check this token in Meta before saving.');
 const expiresAt=deadlines.length?new Date(Math.min(...deadlines.map(d=>d.getTime()))):null;
 if(expiresAt&&expiresAt<=now)throw Error('Instagram authorization expired. Generate and extend a new token in Meta.');
 return {type:String(data.type||'UNKNOWN'),expiresAt,checkedAt:now,shortLived:Boolean(expiresAt&&expiresAt.getTime()-now.getTime()<86400000)};
}
/** Inspect through a read-only Graph batch, keeping both credentials out of request URLs. */
export async function inspectInstagramAccess({token,version,fetchImpl=fetch,now=new Date(),expectedAppId='1430683145936095'}){
 if(!/^v\d{1,3}\.\d{1,2}$/.test(version||''))throw Error('Check the Instagram API version.');
 const body=new URLSearchParams({batch:JSON.stringify([{method:'GET',relative_url:'debug_token?input_token='+encodeURIComponent(token)}]),include_headers:'false'});
 let response;try{response=await fetchImpl('https://graph.facebook.com/'+version+'/',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/x-www-form-urlencoded'},body,signal:AbortSignal.timeout(15000)});}catch{throw Error('Instagram token verification could not reach Meta. Try again.');}
 let result;try{result=await response.json();}catch{throw Error('Meta returned an invalid token-verification response.');}
 if(!response.ok||!Array.isArray(result)||result.length!==1||result[0]?.code!==200)throw Error('Instagram token verification failed. Use Meta’s Access Token Debugger to verify and extend the token.');
 let info;try{info=JSON.parse(result[0].body);}catch{throw Error('Meta returned an invalid token-verification response.');}
 return normalizeInstagramAccess(info.data,{expectedAppId,now});
}
