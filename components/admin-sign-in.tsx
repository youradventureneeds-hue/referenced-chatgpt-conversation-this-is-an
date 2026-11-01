"use client";
import {useState} from "react";
export function AdminSignIn() {
 const [key,setKey]=useState("");const [error,setError]=useState("");const [busy,setBusy]=useState(false);
 return <form className="card" style={{maxWidth:480}} onSubmit={async event=>{event.preventDefault();setBusy(true);setError("");try{const r=await fetch("/api/admin/session",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({key})});if(r.ok){window.location.reload();return;}setError((await r.json()).error||"Could not sign in");}catch{setError("Could not sign in. Please try again.");}finally{setBusy(false);}}}>
  <h2>Administrator sign-in</h2><p>Use your private administrator key to review recruitment leads.</p>
  <label>Administrator key<input type="password" required autoComplete="current-password" value={key} onChange={e=>setKey(e.target.value)} style={{display:"block",width:"100%",padding:12,margin:"12px 0"}} /></label>
  {error&&<p role="alert">{error}</p>}<button disabled={busy} type="submit">{busy?"Signing in…":"Sign in"}</button>
 </form>;
}
