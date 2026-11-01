import {createHmac,timingSafeEqual} from "node:crypto";
export const ADMIN_COOKIE = "tgio_admin";
function key() { const value=process.env.ADMIN_REVIEW_KEY||"";return value.length>=32&&!/replace|placeholder|change.me/i.test(value)?value:null; }
function equal(a:string,b:string) { const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&timingSafeEqual(x,y); }
export function adminConfigured() { return Boolean(key()); }
export function validAdminKey(value:string) { const secret=key();return Boolean(secret&&equal(value,secret)); }
export function createAdminSession(now=Date.now()) {
 const secret=key();if(!secret)throw Error("Administrator access is not configured");
 const payload=Buffer.from(JSON.stringify({expires:now+12*3600000})).toString("base64url");
 return payload+"."+createHmac("sha256",secret).update(payload).digest("base64url");
}
export function validAdminSession(value:string|undefined,now=Date.now()) {
 const secret=key();if(!secret||!value||value.length>1000)return false;
 const [payload,signature,...rest]=value.split(".");if(!payload||!signature||rest.length)return false;
 const expected=createHmac("sha256",secret).update(payload).digest("base64url");if(!equal(signature,expected))return false;
 try{const body=JSON.parse(Buffer.from(payload,"base64url").toString());return typeof body.expires==="number"&&body.expires>now&&body.expires<=now+12*3600000;}catch{return false;}
}
export function authorizedAdmin(request:Request) {
 const bearer=request.headers.get("authorization")?.match(/^Bearer (.+)$/)?.[1];if(bearer&&validAdminKey(bearer))return true;
 const cookie=request.headers.get("cookie")?.split(";").map(s=>s.trim()).find(s=>s.startsWith(ADMIN_COOKIE+"="))?.slice(ADMIN_COOKIE.length+1);
 return validAdminSession(cookie);
}
export function adminDenied(request:Request) {
 if(authorizedAdmin(request))return null;
 return Response.json({error:adminConfigured()?"Administrator sign-in required":"Administrator access is not configured"},{status:adminConfigured()?401:503,headers:{"Cache-Control":"no-store"}});
}
