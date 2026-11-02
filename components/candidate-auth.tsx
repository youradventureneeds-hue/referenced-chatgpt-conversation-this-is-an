'use client';
import {useState} from 'react';
import Link from 'next/link';
import {CandidateUploadFields,uploadCandidateDocument} from './candidate-documents';
type Mode='register'|'login'|'recover';
export function CandidateAuth({initialMode='register',nextPath='/candidate/dashboard'}:{initialMode?:Mode;nextPath?:string}){
 const [mode,setMode]=useState<Mode>(initialMode),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[created,setCreated]=useState(false);
 async function submit(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();const form=e.currentTarget,f=new FormData(form);setBusy(true);setError('');setNotice('');
  try{
   const cv=f.get('cv'),certs=f.getAll('certificates').filter((v):v is File=>v instanceof File&&v.size>0);
   if(mode==='register'){if(certs.length>10)throw Error('Select up to 10 certification files.');for(const file of [...(cv instanceof File&&cv.size?[cv]:[]),...certs])if(file.size>3*1024*1024)throw Error(`${file.name}: each document must be no larger than 3 MB.`);}
   const action=mode==='recover'?'forgot-password':mode;
   const response=await fetch('/api/auth/'+action,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:f.get('name'),email:f.get('email'),password:f.get('password'),role:'CANDIDATE'})});const result=await response.json();if(!response.ok)throw Error(result.error||'Please try again.');
   if(mode==='recover'){setNotice(result.message);form.reset();return;}
   if(mode==='register'){setCreated(true);try{if(cv instanceof File&&cv.size)await uploadCandidateDocument(cv,'CV');for(const file of certs)await uploadCandidateDocument(file,'CERTIFICATION');}catch(e){setError('Your account was created, but a document could not be uploaded: '+(e as Error).message+' You can upload it from your workspace.');return;}}
   window.location.assign(nextPath);
  }catch(e){setError((e as Error).message);}finally{setBusy(false);}
 }
 function change(next:Mode){setMode(next);setError('');setNotice('');}
 if(created)return <article className="card employer-auth"><h2>Your account is ready.</h2>{busy?<p role="status">Saving your private documents…</p>:<>{error&&<p className="employer-error" role="alert">{error}</p>}<Link className="button" href={nextPath}>Open your workspace →</Link></>}</article>;
 return <article className="card employer-auth"><div className="employer-tabs" role="tablist" aria-label="Candidate account"><button role="tab" aria-selected={mode==='register'} onClick={()=>change('register')}>Create account</button><button role="tab" aria-selected={mode==='login'} onClick={()=>change('login')}>Sign in</button></div><h2>{mode==='recover'?'Forgot your password?':mode==='login'?'Welcome back.':'Your next adventure starts here.'}</h2><p>{mode==='recover'?'Enter your registered email and we’ll send a link to choose a new password.':mode==='register'?'Create a private candidate account to save roles and organize your search.':'Sign in to your candidate workspace.'}</p><form key={mode} onSubmit={submit}><fieldset disabled={busy} className="candidate-upload-fields">{mode==='register'&&<label>Your name<input name="name" required minLength={2} maxLength={100} autoComplete="name"/></label>}<label>Email address<input type="email" name="email" required maxLength={254} autoComplete="email"/></label>{mode!=='recover'&&<><label>Password<input type="password" name="password" required minLength={mode==='login'?1:12} maxLength={128} autoComplete={mode==='login'?'current-password':'new-password'}/></label>{mode==='register'&&<small>Use at least 12 characters.</small>}</>}{mode==='register'&&<CandidateUploadFields/>}{error&&<p className="employer-error" role="alert">{error}</p>}{notice&&<p className="employer-notice" role="status">{notice}</p>}<button>{busy?'Please wait…':mode==='recover'?'Email reset link':mode==='register'?'Create candidate account':'Sign in →'}</button></fieldset></form><button className="employer-text-button" onClick={()=>change(mode==='recover'?'login':'recover')}>{mode==='recover'?'Back to sign in':'Forgot your password?'}</button><p className="employer-fine">Your profile and documents are private. Apply directly through each employer’s process. <Link href="/privacy">Privacy information →</Link></p><p className="employer-fine"><Link href="/employers">Hiring a team? Open the employer portal →</Link></p></article>;
}
