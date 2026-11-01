import fs from 'node:fs';
import {createInstagramClient,recruitmentSignal} from '../lib/instagram-collector.mjs';
const sources=JSON.parse(fs.readFileSync(new URL('../data/india-instagram-sources.json',import.meta.url),'utf8'));
const output=new URL('../work/india-instagram-scan.json',import.meta.url);
const report={checkedAt:new Date().toISOString(),scope:'India-based outdoor employers; public posts and reels only',maxPostsPerAccount:100,lookbackDays:365,accounts:[],candidates:[]};
const client=createInstagramClient({accessToken:process.env.INSTAGRAM_ACCESS_TOKEN,accountId:process.env.INSTAGRAM_ACCOUNT_ID,version:process.env.INSTAGRAM_API_VERSION,pages:4});
const cutoff=Date.now()-365*86400000;
const outdoorRole=/\b(trek\s*(?:leader|guide)|outdoor\s*(?:educator|instructor|leader)|camp\s*(?:counsell?or|instructor|leader|facilitator)|trip\s*(?:leader|guide)|(?:dive|diving|scuba|climbing|rafting|kayak|surf|adventure)\s*(?:master|instructor|guide|coach)|divemaster|naturalist|facilitator|mountaineer|expedition\s*leader)\b/i;
try{for(const source of sources){
 const account={name:source.name,username:source.username,status:'ok',postsChecked:0,recentPosts:0,candidates:0,evidenceUrl:source.evidenceUrl};
 try{const {media,profileWebsite}=await client.discover(source);account.profileWebsite=profileWebsite;account.postsChecked=media.length;for(const post of media){if(new Date(post.postedAt).getTime()<cutoff)continue;account.recentPosts++;const role=outdoorRole.test(post.caption),application=/\b(apply|application|resume|cv|career|recruit|hiring|vacanc|job)\b/i.test(post.caption);if(!recruitmentSignal(post.caption)&&!(role&&application))continue;account.candidates++;report.candidates.push({employer:source.name,username:source.username,postedAt:post.postedAt,kind:post.kind,sourceUrl:post.sourceUrl,outdoorRoleMentioned:role,excerpt:post.caption.slice(0,900),status:'NEEDS_VERIFICATION',location:'Not verified; employer operates in India',officialWebsite:source.evidenceUrl});}}
 catch(e){account.status='error';account.error=e.message;}
 report.accounts.push(account);console.log(JSON.stringify(account));await new Promise(resolve=>setTimeout(resolve,350));
 }}finally{report.completedAt=new Date().toISOString();report.summary={accounts:report.accounts.length,successful:report.accounts.filter(s=>s.status==='ok').length,errors:report.accounts.filter(s=>s.status==='error').length,postsChecked:report.accounts.reduce((n,s)=>n+s.postsChecked,0),recruitmentPosts:report.candidates.length,outdoorRolePosts:report.candidates.filter(s=>s.outdoorRoleMentioned).length};fs.mkdirSync(new URL('../work/',import.meta.url),{recursive:true});fs.writeFileSync(output,JSON.stringify(report,null,2));console.log(JSON.stringify(report.summary));}
