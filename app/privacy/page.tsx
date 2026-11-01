import Link from "next/link";
export const dynamic="force-dynamic";
export default function PrivacyPage(){const email=process.env.PUBLIC_SUPPORT_EMAIL || "youradventureneeds@gmail.com";return <main className="detail"><p className="eyebrow">PRIVACY</p><h1 style={{fontSize:"clamp(2.5rem,6vw,4rem)",lineHeight:1.1}}>Instagram recruitment data</h1>
 <p>This website uses recruitment information to help people find outdoor careers. Instagram collection requires authorized Meta API access and is not active until account authorization and administrator review access are configured.</p>
 <h2 style={{fontSize:"1.7rem"}}>What the importer uses</h2><p>The importer can read permitted post and reel metadata, caption excerpts, source links, usernames, media identifiers, and publication timestamps. Stories are requested only for the connected, authorized professional account. It does not read private messages or collect Instagram passwords.</p>
 <p>Media files are not downloaded or republished. Caption excerpts and recruitment leads are held in a restricted review queue. Job details are published only after an administrator verifies and approves them. Visual text and spoken audio require separate review.</p>
 <h2 style={{fontSize:"1.7rem"}}>Access and removal</h2><p>Access tokens remain on the server and in deployment secrets. Imported recruitment records remain until reviewed, removed by the administrator, or deleted following a request. An expired story is not sufficient evidence for publishing a current vacancy.</p>
 {email?<p>For questions or removal requests, email <a className="text-link" href={`mailto:${email}`}>{email}</a>. Include the relevant Instagram username and source links. Do not send passwords or access tokens.</p>:<p>A public support contact must be configured before Instagram imports can be activated.</p>}
 <p><Link href="/data-deletion" className="text-link">Data-deletion instructions →</Link></p>
 </main>;}
