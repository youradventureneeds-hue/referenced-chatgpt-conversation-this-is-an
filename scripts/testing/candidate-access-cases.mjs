import {randomBytes} from 'node:crypto';
import {secretHash} from '../../lib/employer-auth.mjs';
import {deliveries,setMailFailure} from './account-mail.mjs';
export async function candidateAccessCases(db,{a,b,employer,email,password,call,base,check}){
 check(!('recoveryCode' in a.data)&&(await db.user.findUnique({where:{id:a.data.user.id}})).recoveryHash===null,'Candidates register without recovery codes');
 check((await call('recover','POST',{email,recoveryCode:'legacy',password,role:'CANDIDATE'})).status===400,'Legacy candidate recovery codes are disabled');
 const docs=await import('../../app/api/candidate/documents/route.ts'),doc=await import('../../app/api/candidate/documents/[id]/route.ts');
 const pdf=Buffer.from('%PDF-1.7\nFixture qualification\n%%EOF');
 async function upload(cookie,kind='CV',name='fixture.pdf',bytes=pdf,origin=base){const f=new FormData();f.set('kind',kind);f.set('file',new File([bytes],name,{type:'application/pdf'}));const r=await docs.POST(new Request(base+'/api/candidate/documents',{method:'POST',headers:{Origin:origin,...(cookie?{Cookie:cookie}:{})},body:f}));return {status:r.status,data:await r.json()};}
 async function document(id,cookie,method='GET',origin=base){return doc[method](new Request(base+'/api/candidate/documents/'+id,{method,headers:{Origin:origin,...(cookie?{Cookie:cookie}:{})}}),{params:Promise.resolve({id})});}
 check((await upload(null)).status===401,'Anonymous uploads are blocked');
 check((await upload(employer.cookie.replace('tgio_employer=','tgio_candidate='))).status===401,'Employers cannot upload candidate documents');
 check((await upload(a.cookie,'CV','fixture.pdf',pdf,'https://evil.example')).status===403,'Cross-origin uploads are blocked');
 check((await upload(a.cookie,'CV','fixture.pdf',Buffer.from('<script>bad</script>'))).status===400,'Forged PDF content is rejected');
 const cv=await upload(a.cookie);check(cv.status===201&&!('content' in cv.data.document),'Upload returns metadata without file bytes');
 check((await document(cv.data.document.id)).status===401&&(await document(cv.data.document.id,b.cookie)).status===404,'Documents require the owning candidate session');
 const download=await document(cv.data.document.id,a.cookie);check(download.status===200&&download.headers.get('content-disposition').startsWith('attachment;')&&download.headers.get('x-content-type-options')==='nosniff'&&Buffer.from(await download.arrayBuffer()).equals(pdf),'Private download preserves bytes and forces an attachment');
 check((await document(cv.data.document.id,b.cookie,'DELETE')).status===404&&(await document(cv.data.document.id,a.cookie,'DELETE','https://evil.example')).status===403,'Document removal enforces owner and origin');
 const replaced=await upload(a.cookie);check(replaced.status===201&&await db.candidateDocument.count({where:{userId:a.data.user.id,kind:'CV'}})===1&&(await document(cv.data.document.id,a.cookie)).status===404,'Replacing a CV removes the previous file atomically');
 for(let i=0;i<10;i++)check((await upload(a.cookie,'CERTIFICATION',`certificate-${i}.pdf`)).status===201,'Candidate can upload certification documents');
 check((await upload(a.cookie,'CERTIFICATION')).status===400,'Certification count is bounded');
 const ownList=await docs.GET(new Request(base+'/api/candidate/documents',{headers:{Cookie:a.cookie}})),own=await ownList.json();check(own.documents.length===11&&!JSON.stringify(own).includes('content'),'Documents list exposes only the owner metadata');
 check((await document(replaced.data.document.id,a.cookie,'DELETE')).status===200,'Candidate can remove their own document');
 const parallel=await Promise.all([upload(a.cookie),upload(a.cookie)]);check(parallel.every(v=>v.status===201)&&await db.candidateDocument.count({where:{userId:a.data.user.id,kind:'CV'}})===1,'Concurrent CV replacement retains one CV');
 check((await call('forgot','POST',{email})).status===503,'Unconfigured email service is reported honestly');
 const adminEmail=await import('../../app/api/admin/email/route.ts');const admin={Origin:base,Authorization:'Bearer '+process.env.ADMIN_REVIEW_KEY,'Content-Type':'application/json'};
 check((await adminEmail.GET(new Request(base+'/api/admin/email'))).status===401,'Email connection settings require admin access');
 check((await adminEmail.POST(new Request(base+'/api/admin/email',{method:'POST',headers:admin,body:JSON.stringify({password:'abcd efgh ijkl mnop'})}))).status===200,'Admin can verify and encrypt a Gmail app password');
 const emailConfig=await db.accountEmailSettings.findUnique({where:{id:'main'}}),safeConfig=await adminEmail.GET(new Request(base+'/api/admin/email',{headers:admin}));check(!emailConfig.passwordCiphertext.includes('abcdefghijklmnop')&&!JSON.stringify(await safeConfig.json()).includes(emailConfig.passwordCiphertext),'Gmail credential is encrypted and never serialized');
 const unknown=await call('forgot','POST',{email:'missing-'+process.env.EMPLOYER_TEST_SCHEMA+'@example.test'}),known=await call('forgot','POST',{email});check(known.status===200&&unknown.status===200&&JSON.stringify(known.data)===JSON.stringify(unknown.data),'Reset requests do not disclose whether an email has a candidate account');
 const sent=deliveries.filter(d=>d.email===email).at(-1);check(Boolean(sent?.token)&&!JSON.stringify(known.data).includes(sent.token),'Reset credential is sent only through the email transport');
 const resetRecord=await db.passwordReset.findUnique({where:{tokenHash:secretHash(sent.token)}});check(resetRecord.tokenHash!==sent.token&&resetRecord.expiresAt>Date.now(),'Reset credential is stored only as a digest with an expiry');
 const before=deliveries.length;await call('forgot','POST',{email:employer.data.user.email});check(deliveries.length===before,'Candidate reset does not issue tokens for an employer account');
 check((await call('reset','POST',{token:sent.token,password:'short'})).status===400,'Password reset enforces password requirements');
 check((await call('reset','POST',{token:sent.token,password},null,{Origin:'https://evil.example'})).status===403,'Reset requires same-origin submission');
 const expired=randomBytes(32).toString('base64url');await db.passwordReset.create({data:{userId:a.data.user.id,tokenHash:secretHash(expired),expiresAt:new Date('2020-01-01')}});check((await call('reset','POST',{token:expired,password})).status===400,'Expired reset links fail');
 const replacement='Another secure candidate test password';
 const outcomes=await Promise.all([call('reset','POST',{token:sent.token,password:replacement}),call('reset','POST',{token:sent.token,password:replacement})]);check(outcomes.filter(r=>r.status===200).length===1&&outcomes.filter(r=>r.status===400).length===1,'Concurrent reset attempts consume the link once');
 check((await call('reset','POST',{token:sent.token,password})).status===400,'Reset links cannot be reused');
 check((await call('profile','GET',null,a.cookie)).status===401,'Email recovery revokes previous candidate sessions');
 check((await call('employer','GET',null,employer.cookie)).status===200,'Candidate recovery does not revoke employer sessions');
 check((await call('login','POST',{email,password,role:'CANDIDATE'})).status===401,'Old candidate password stops working');const recovered=await call('login','POST',{email,password:replacement,role:'CANDIDATE'});check(recovered.status===200,'New password signs in to the same candidate account');
 setMailFailure(true);const resetCount=await db.passwordReset.count();await call('forgot','POST',{email});check(await db.passwordReset.count()===resetCount,'Failed email delivery leaves no usable orphan token');setMailFailure(false);
 const doomed=await db.user.create({data:{email:'delete-doc-'+process.env.EMPLOYER_TEST_SCHEMA+'@example.test',role:'CANDIDATE'}});await db.candidateDocument.create({data:{userId:doomed.id,kind:'CV',filename:'private.pdf',mimeType:'application/pdf',content:pdf,size:pdf.length}});await db.passwordReset.create({data:{userId:doomed.id,tokenHash:secretHash(randomBytes(32)),expiresAt:new Date(Date.now()+10000)}});await db.user.delete({where:{id:doomed.id}});check(await db.candidateDocument.count({where:{userId:doomed.id}})===0&&await db.passwordReset.count({where:{userId:doomed.id}})===0,'Account deletion removes private documents and reset tokens');
 return {recovered};
}
