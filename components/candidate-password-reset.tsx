'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
export function CandidatePasswordReset(){
 const [token,setToken]=useState(''),[ready,setReady]=useState(false),[busy,setBusy]=useState(false),[done,setDone]=useState(false),[error,setError]=useState('');
 useEffect(()=>{setToken(new URLSearchParams(window.location.hash.slice(1)).get('token')||'');setReady(true);window.history.replaceState(null,'',window.location.pathname);},[]);
 async function submit(e:React.FormEvent<HTMLFormElement>){e.preventDefault();const f=new FormData(e.currentTarget);if(f.get('password')!==f.get('confirm')){setError('The passwords do not match.');return;}setBusy(true);setError('');try{const r=await fetch('/api/auth/reset-password',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token,password:f.get('password')})});const d=await r.json();if(!r.ok)throw Error(d.error||'Please request a new reset link.');setToken('');setDone(true);}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 if(done)return <article className="card employer-auth"><h2>Password updated.</h2><p>Your previous sessions have been signed out. Use your new password to sign in.</p><Link className="button" href="/candidates?mode=login">Sign in →</Link></article>;
 if(!ready)return <p role="status">Opening your reset link…</p>;
 if(!/^[A-Za-z0-9_-]{43}$/.test(token))return <article className="card"><h2>Request a password-reset email.</h2><p>Open the complete link from your email, or request a new one below.</p><Link href="/candidates?mode=recover">Email me a new reset link →</Link></article>;
 return <article className="card employer-auth"><h2>Choose a new password.</h2><p>This link works once and expires 30 minutes after it was requested.</p><form onSubmit={submit}><label>New password<input name="password" type="password" autoComplete="new-password" required minLength={12} maxLength={128}/></label><label>Confirm new password<input name="confirm" type="password" autoComplete="new-password" required minLength={12} maxLength={128}/></label>{error&&<p role="alert" className="employer-error">{error}</p>}<button disabled={busy}>{busy?'Updating…':'Reset password'}</button></form><p><Link href="/candidates?mode=recover">Request another reset email →</Link></p></article>;
}
