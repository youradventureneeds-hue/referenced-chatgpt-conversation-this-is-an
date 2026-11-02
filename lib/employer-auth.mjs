import {scrypt,randomBytes,createHash,timingSafeEqual} from 'node:crypto';
import {promisify} from 'node:util';
const derive=promisify(scrypt),N=32768,r=8,p=3;
export const EMPLOYER_COOKIE='tgio_employer';
export const SESSION_SECONDS=7*24*3600;
export const secretHash=value=>createHash('sha256').update(value).digest('hex');
export function validPassword(value){return typeof value==='string'&&value.length>=12&&value.length<=128&&Buffer.byteLength(value)<=256;}
export async function hashPassword(password){if(!validPassword(password))throw Error('Use a password of 12–128 characters.');const salt=randomBytes(16).toString('hex');const hash=await derive(password,salt,64,{N,r,p,maxmem:64*1024*1024});return ['scrypt',N,r,p,salt,hash.toString('hex')].join('$');}
export async function verifyPassword(password,stored){const fields=String(stored||'').split('$');const valid=fields[0]==='scrypt'&&fields[1]===String(N)&&fields[2]===String(r)&&fields[3]===String(p)&&/^[a-f0-9]{32}$/.test(fields[4])&&/^[a-f0-9]{128}$/.test(fields[5]);const salt=valid?fields[4]:'00000000000000000000000000000000';const expected=valid?Buffer.from(fields[5],'hex'):Buffer.alloc(64);const actual=await derive(typeof password==='string'?password.slice(0,128):'',salt,64,{N,r,p,maxmem:64*1024*1024});return valid&&timingSafeEqual(actual,expected);}
export function recoveryMatches(value,stored){if(typeof value!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(value)||!stored||!/^[a-f0-9]{64}$/.test(stored))return false;return timingSafeEqual(Buffer.from(secretHash(value),'hex'),Buffer.from(stored,'hex'));}
export async function issueSession(db,userId,now=new Date()){const token=randomBytes(32).toString('base64url');await db.employerSession.create({data:{tokenHash:secretHash(token),userId,expiresAt:new Date(now.getTime()+SESSION_SECONDS*1000)}});return token;}
export async function employerForToken(db,token,now=new Date()){if(!/^[A-Za-z0-9_-]{43}$/.test(token||''))return null;const session=await db.employerSession.findUnique({where:{tokenHash:secretHash(token)},select:{expiresAt:true,user:{select:{id:true,name:true,email:true,role:true}}}});return session&&session.expiresAt>now&&session.user.role==='EMPLOYER'?session.user:null;}
export function employerCookie(request){return request.headers.get('cookie')?.split(';').map(v=>v.trim()).find(v=>v.startsWith(EMPLOYER_COOKIE+'='))?.slice(EMPLOYER_COOKIE.length+1);}
export async function consumeEmployerLimit(db,scope,value,limit,windowMs,now=new Date()){
 const key=secretHash(scope+'\n'+value),reset=new Date(now.getTime()+windowMs);
 await db.employerRateLimit.updateMany({where:{key,resetAt:{lte:now}},data:{count:0,resetAt:reset}});
 const row=await db.employerRateLimit.upsert({where:{key},create:{key,count:1,resetAt:reset},update:{count:{increment:1}}});
 return row.count<=limit;
}
