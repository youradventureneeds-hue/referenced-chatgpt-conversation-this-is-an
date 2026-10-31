import test from 'node:test';
import assert from 'node:assert/strict';
import {extractStructured,extractHtmlVacancy,assess,plain,publicUrl,workType,employerMatches,discoverLinks,createClient,crawlOrganization,IMPORT_CHANNEL} from '../lib/job-scraper.mjs';
import {persistCandidate,reconcileMissing} from '../lib/job-sync.mjs';

const org={id:'org-1',name:'Teton Science Schools',slug:'teton-science-schools',careersUrl:'https://example.com/careers'};
const description='Teach outdoor science and support students through field investigations and environmental learning. This full-time position works with an experienced team of educators.';
const candidate={title:'Field Educator',description,url:'https://example.com/job/42',sourceKey:'lever:teton:42',employerMatched:true,country:'United States',region:'Jackson, WY',workType:'FULL_TIME',evidence:'official feed'};
const jsonld=value=>'<script type="application/ld+json">'+JSON.stringify(value)+'</script>';

test('extracts real vacancies, decodes escaped markup, and resolves location and work type',()=>{
 const html=jsonld({'@graph':[{'@type':'JobPosting',title:'Field Educator',description:'\\u003cp\\u003e'+description+'\\u003c/p\\u003e',url:'/job/42',hiringOrganization:{name:org.name},jobLocation:{address:{addressCountry:'US',addressLocality:'Jackson',addressRegion:'WY'}},employmentType:'FULL_TIME',identifier:{value:'42'}}]});
 const [job]=extractStructured(html,'https://example.com/careers',org);
 assert.equal(job.description,description);assert.equal(job.url,candidate.url);assert.equal(job.country,'United States');assert.equal(job.employerMatched,true);assert.equal(assess(job).publishable,true);
});

test('role navigation alone is never published as an opening',()=>{
 assert.deepEqual(extractStructured('<nav><a>Camp Instructor</a></nav><h2>Director Careers</h2>','https://example.com',org),[]);
 assert.equal(plain('<p>Field &amp; Science</p>'),'Field & Science');
});

test('unknown metadata is explicitly unspecified rather than guessed',()=>{
 const [job]=extractStructured(jsonld({'@type':'JobPosting',title:'Field Educator',description,hiringOrganization:{name:org.name}}),'https://example.com/job/42',org);
 assert.equal(job.workType,'UNSPECIFIED');assert.equal(job.country,'Not specified');assert.equal(assess(job).publishable,true);
});

test('renaming a vacancy keeps its identity when its official detail URL is stable',()=>{
 const record={'@type':'JobPosting',title:'Field Educator',description,hiringOrganization:{name:org.name}};
 const first=extractStructured(jsonld(record),'https://example.com/job/42',org)[0];
 const second=extractStructured(jsonld({...record,title:'Senior Field Educator'}),'https://example.com/job/42',org)[0];
 assert.equal(first.sourceKey,second.sourceKey);
});

test('HTML vacancies require a specific role, employer mention and an application link',()=>{
 const html='<main><h1>Field Educator</h1><p>Teton Science Schools '+description.repeat(2)+'</p><a href="/apply">Apply now</a></main>';
 assert.equal(extractHtmlVacancy(html,'https://example.com/careers/educator',org).length,1);
 assert.equal(extractHtmlVacancy(html.replace('Field Educator','Careers and Opportunities'),'https://example.com/careers',org).length,0);
 assert.equal(extractHtmlVacancy(html.replace('Apply now','Learn more'),'https://example.com/careers/educator',org).length,0);
});

test('shared portals require the specific organization and reject unrelated employers',()=>{
 assert.equal(employerMatches(org,'A different science school'),false);
 assert.equal(employerMatches({name:'NOLS (National Outdoor Leadership School)'},'NOLS'),true);
 const ymca={name:'YMCA Camp Orkila'};
 const value={'@type':'JobPosting',title:'Case Manager',description,hiringOrganization:{name:'YMCA of Greater Seattle'},jobLocation:{address:{addressCountry:'US'}},employmentType:'FULL_TIME'};
 assert.equal(extractStructured(jsonld(value),'https://example.com/job/1',ymca,true)[0].employerMatched,false);
});

test('requires stated country and unambiguous work type and recognizes deadlines',()=>{
 assert.equal(workType(null,'Educator','Flexible full-time or part-time employment'),undefined);
 assert.equal(workType(null,'Development Director','Supervise volunteers and seasonal staff'),undefined);
 assert.equal(workType(null,'Substitute Teacher','Work with full-time teachers'),undefined);
 assert.equal(workType(null,'Educator','This is a full-time position in field education.'),'FULL_TIME');
 assert.equal(assess({...candidate,country:undefined}).publishable,false);
 assert.equal(assess({...candidate,workType:undefined}).publishable,false);
 assert.equal(assess({...candidate,expiresAt:'2020-01-01T23:59:59Z'}).expired,true);
});

test('uses stable public URLs and refuses private URLs and unrelated discovery links',()=>{
 assert.equal(publicUrl('https://example.com/job/42?utm_source=x&id=1#apply'),'https://example.com/job/42?id=1');
 assert.throws(()=>publicUrl('http://127.0.0.1/jobs'));
 assert.throws(()=>publicUrl('https://user:password@example.com/jobs'));
 const links=discoverLinks('<a href="https://evil.example/job/2">Instructor</a><a href="/job/42">Educator</a><a href="/jobs/role.pdf">Guide</a>','https://example.com');
 assert.deepEqual(links.vacancies,['https://example.com/job/42']);
});

test('honors robots exclusions and treats server failures as source errors',async()=>{
 let requests=0;
 const client=createClient({delay:0,fetchImpl:async url=>{requests++;return new Response('User-agent: *\nDisallow: /private');}});
 await assert.rejects(client.get('https://example.com/private/jobs'),/robots/);assert.equal(requests,1);
 const failed=createClient({delay:0,fetchImpl:async()=>new Response('unavailable',{status:503})});
 await assert.rejects(failed.get('https://example.com/jobs'),/Robots rules unavailable/);
});

test('an empty complete API feed is healthy and disabled sources make no requests',async()=>{
 const client={get:async()=>({text:'[]',url:'https://api.lever.co'})};
 const result=await crawlOrganization(org,{url:'https://jobs.lever.co/teton'},client);
 assert.equal(result.status,'ok');assert.equal(result.complete,true);assert.deepEqual(result.jobs,[]);
 const skipped=await crawlOrganization(org,{enabled:false},{get:()=>{throw Error('should not fetch')}});
 assert.equal(skipped.status,'skipped');
});

function memoryStore(){
 const state={jobs:new Map(),intakes:new Map(),next:0};
 const db={
  job:{
   findUnique:async({where})=>state.jobs.get(where.id)||null,
   findFirst:async()=>null,
   create:async({data})=>{const row={id:'job-'+(++state.next),...data};state.jobs.set(row.id,row);return row;},
   update:async({where,data})=>{const row={...state.jobs.get(where.id),...data};state.jobs.set(where.id,row);return row;},
  },
  opportunityIntake:{
   findUnique:async({where})=>[...state.intakes.values()].find(r=>r.fingerprint===where.fingerprint)||null,
   findMany:async()=>[...state.intakes.values()],
   upsert:async({where,create,update})=>{let row=[...state.intakes.values()].find(r=>r.fingerprint===where.fingerprint);row=row?{...row,...update}:{id:'intake-'+(++state.next),...create};state.intakes.set(row.id,row);return row;},
   update:async({where,data})=>{const row={...state.intakes.get(where.id),...data};state.intakes.set(where.id,row);return row;},
  },
  $transaction:async fn=>fn(db),
 };
 return {db,state};
}

test('repeat imports update a stable job instead of creating duplicates',async()=>{
 const {db,state}=memoryStore();
 assert.equal((await persistCandidate(db,org,candidate)).action,'created');
 assert.equal((await persistCandidate(db,org,{...candidate,title:'Updated Field Educator'})).action,'updated');
 assert.equal(state.jobs.size,1);assert.equal(state.intakes.size,1);
 assert.equal([...state.jobs.values()][0].sourceChannel,IMPORT_CHANNEL);
});

test('uncertain records go to review and explicit rejections stay rejected',async()=>{
 const {db,state}=memoryStore();
 assert.equal((await persistCandidate(db,org,{...candidate,country:undefined})).action,'needs_review');assert.equal(state.jobs.size,0);
 const intake=[...state.intakes.values()][0];intake.status='REJECTED';
 assert.equal((await persistCandidate(db,org,candidate)).action,'rejected');assert.equal(state.jobs.size,0);
});

test('source outages and partial crawls never archive jobs; two weekly complete absences do',async()=>{
 const {db,state}=memoryStore();await persistCandidate(db,org,candidate,{now:new Date('2026-10-01')});
 const complete={status:'ok',complete:true,feedKey:'lever:teton',jobs:[]};
 assert.equal(await reconcileMissing(db,org,{...complete,status:'error'}),0);
 assert.equal(await reconcileMissing(db,org,{...complete,complete:false}),0);
 assert.equal(await reconcileMissing(db,org,complete,{now:new Date('2026-10-05')}),0);
 assert.equal(await reconcileMissing(db,org,complete,{now:new Date('2026-10-06')}),0);
 assert.equal(await reconcileMissing(db,org,complete,{now:new Date('2026-10-12')}),1);
 assert.equal([...state.jobs.values()][0].status,'ARCHIVED');
});
