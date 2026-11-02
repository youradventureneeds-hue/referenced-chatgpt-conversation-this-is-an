"use client";
import {useEffect,useState} from "react";
import {JOB_CATEGORIES,isJobCategory,inferJobCategory,jobCategoryLabel} from '@/lib/job-categories.mjs';
import type {IntakeItem} from "@/lib/intake";
function ReviewCard({item,onReviewed}:{item:IntakeItem;onReviewed:(next:IntakeItem)=>void}) {
 const data=item.extraction;const [title,setTitle]=useState(data?.title||"");const [organization,setOrganization]=useState(data?.organization||"");const [country,setCountry]=useState(data?.country||"Not specified");const [jobType,setJobType]=useState(data?.jobType||"UNSPECIFIED");const [summary,setSummary]=useState(data?.summary||"");const [applicationUrl,setApplicationUrl]=useState(data?.applicationUrl||"");const [createOrganization,setCreateOrganization]=useState(false);const [reviewNotes,setReviewNotes]=useState("");const [verified,setVerified]=useState(false);const [busy,setBusy]=useState(false);const [error,setError]=useState("");
 const [category,setCategory]=useState(data?.categoryManual&&isJobCategory(data.category)?data.category!:'AUTO');
 const expired=Boolean(data?.instagram?.expiresAt&&new Date(data.instagram.expiresAt)<new Date());
 let source:string|undefined;try{const url=new URL(item.sourceUrl||"");if(["https:","http:"].includes(url.protocol)&&!url.username&&!url.password)source=url.href;}catch{}
 async function review(status:"APPROVED"|"REJECTED") {setBusy(true);setError("");try{const r=await fetch(`/api/admin/intake/${item.id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({status,category,title,organization,country,jobType,summary,applicationUrl:applicationUrl||undefined,verified,createOrganization,reviewNotes:reviewNotes||undefined})});const result=await r.json();if(!r.ok){setError(result.error||"Review failed");return;}onReviewed(result.data);}catch{setError("Could not save review. Please try again.");}finally{setBusy(false);}}
 const inputStyle={display:"block",width:"100%",padding:"10px",margin:"5px 0 14px",border:"1px solid #ded8cd",borderRadius:6};
 return <article className="intake-card" style={{display:"block"}}><p className="eyebrow">{item.sourceType.replaceAll("_"," ")}{data?.instagram?` · ${data.instagram.kind}`:""}</p>
  {source&&<p><a href={source} target="_blank" rel="noopener noreferrer" className="text-link">View original source ↗</a></p>}
  {data?.employer&&<aside style={{background:'#edf2ec',padding:18,borderRadius:8,marginBottom:20}}><p><strong>Employer contact:</strong> {data.employer.contactName} · {data.employer.email}</p><p>Account email and organization affiliation require your verification.</p><p><a className="text-link" href={data.employer.organizationWebsite} target="_blank" rel="noreferrer">Organization website ↗</a> · {data.employer.organizationCountry}</p><p>{data.employer.organizationDescription}</p>{!data.organizationId&&<label><input type="checkbox" checked={createOrganization} onChange={e=>setCreateOrganization(e.target.checked)}/> Create this organization’s page when approving, after verifying its website and overview.</label>}<label>Feedback to employer<textarea style={inputStyle} value={reviewNotes} maxLength={1000} rows={2} onChange={e=>setReviewNotes(e.target.value)}/></label></aside>}{data?.instagram?.requiresVisualReview&&<p>Review the original image or video; its visual text and audio have not been extracted.</p>}
  {expired&&<p>This story has expired. Verify the vacancy through a current official application page before approving.</p>}
  <label>Job title<input style={inputStyle} value={title} onChange={e=>setTitle(e.target.value)}/></label>
  <label>Organization name in the directory<input style={inputStyle} value={organization} onChange={e=>setOrganization(e.target.value)}/></label>
  <label>Job country<input style={inputStyle} value={country} onChange={e=>setCountry(e.target.value)}/></label>
  <label>Job category<select style={inputStyle} value={category} onChange={e=>setCategory(e.target.value)}><option value="AUTO">Automatic: {jobCategoryLabel(inferJobCategory(title))}</option>{Object.entries(JOB_CATEGORIES).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
  <label>Work type<select style={inputStyle} value={jobType} onChange={e=>setJobType(e.target.value)}>{["UNSPECIFIED","FULL_TIME","PART_TIME","SEASONAL","INTERNSHIP","VOLUNTEER","GAP_YEAR"].map(type=><option key={type} value={type}>{type==="UNSPECIFIED"?"Not specified":type.replaceAll("_"," ")}</option>)}</select></label>
  <label>Verified job summary<textarea rows={4} style={inputStyle} value={summary} onChange={e=>setSummary(e.target.value)}/></label>
  <label>Official application URL, if available<input type="url" style={inputStyle} value={applicationUrl} onChange={e=>setApplicationUrl(e.target.value)}/></label>
  <label><input type="checkbox" checked={verified} onChange={e=>setVerified(e.target.checked)}/> I verified the employer, vacancy, location, and application details.</label>
  {error&&<p role="alert">{error}</p>}<div className="review-actions" style={{marginTop:16}}><button disabled={busy||!verified} onClick={()=>review("APPROVED")}>Approve</button><button className="reject" disabled={busy} onClick={()=>review("REJECTED")}>Reject</button></div>
 </article>;
}
export function IntakeQueue() {
 const [items,setItems]=useState<IntakeItem[]>([]);const [error,setError]=useState("");const [loading,setLoading]=useState(true);
 useEffect(()=>{fetch("/api/intake").then(async r=>{const result=await r.json();if(!r.ok)throw Error(result.error||"Could not load review queue");setItems(result.data||[]);}).catch(e=>setError(e.message)).finally(()=>setLoading(false));},[]);
 const pending=items.filter(item=>item.status==="NEEDS_REVIEW");
 return <section className="intake-queue"><div className="section-title"><div><p className="eyebrow">REVIEW QUEUE</p><h2>Verify opportunities</h2></div><span className="queue-count">{pending.length} awaiting review</span></div>{error&&<p role="alert">{error}</p>}{loading&&<p>Loading review queue…</p>}{pending.map(item=><ReviewCard key={item.id} item={item} onReviewed={next=>setItems(old=>old.map(i=>i.id===next.id?next:i))}/>)}{!loading&&!error&&!pending.length&&<p className="muted">The review queue is clear.</p>}</section>;
}
