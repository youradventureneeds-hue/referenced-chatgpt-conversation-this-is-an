export async function jobCategoryCases(db){
 let assertions=0;const check=(v,message)=>{if(!v)throw Error(message);assertions++;};
 const jobsApi=await import('../../app/api/jobs/route.ts'),categoriesApi=await import('../../app/api/admin/job-categories/route.ts');
 const base='https://category-check.local',organization=await db.organization.findFirst();
 const fixture=await db.job.create({data:{organizationId:organization.id,title:'Fixture Camp Counsellor',slug:'category-fixture',description:'Support campers on their outdoor adventures.',country:'India',workType:'SEASONAL',status:'PUBLISHED',reviewedByAdmin:true,category:'CAMPS'}});
 await db.job.create({data:{organizationId:organization.id,title:'Private category fixture',slug:'private-category-fixture',description:'Not approved for public listing',country:'India',category:'CAMPS',status:'PUBLISHED',reviewedByAdmin:false}});
 const fetchJobs=async query=>{const r=await jobsApi.GET(new Request(base+'/api/jobs?'+query));return {status:r.status,data:await r.json()};};
 let filtered=await fetchJobs('category=CAMPS&country=India&type=SEASONAL');check(filtered.status===200&&filtered.data.data.some(j=>j.id===fixture.id)&&filtered.data.data.every(j=>j.category==='CAMPS'&&j.country==='India'&&j.jobType==='SEASONAL'),'Category, country and work type combine consistently');
 check(!filtered.data.data.some(j=>j.slug==='private-category-fixture'),'Category filters never expose unreviewed jobs');
 check((await fetchJobs('category=__proto__')).status===400&&(await fetchJobs('type=NOT_A_TYPE')).status===400,'Invalid categories and work types return validation errors');
 check((await fetchJobs('category=all&country=all&type=all')).status===200,'All-category and all-country values work in the public API');
 check((await fetchJobs('category=WATER_SPORTS&country=India&type=VOLUNTEER')).data.data.length===0,'Category filters return a true empty result');
 const adminHeaders={Origin:base,Authorization:'Bearer '+process.env.ADMIN_REVIEW_KEY,'Content-Type':'application/json'};
 const change=async(category,headers=adminHeaders)=>{const r=await categoriesApi.POST(new Request(base+'/api/admin/job-categories',{method:'POST',headers,body:JSON.stringify({id:fixture.id,category})}));return {status:r.status,data:await r.json()};};
 check((await categoriesApi.GET(new Request(base+'/api/admin/job-categories'))).status===401&&(await change('CONSERVATION',{Origin:base,'Content-Type':'application/json'})).status===401,'Category administration requires owner access');
 check((await change('CONSERVATION',{...adminHeaders,Origin:'https://evil.example'})).status===403,'Category changes reject cross-origin requests');
 check((await change('INVALID')).status===400,'Admin category changes validate allowed categories');
 const manual=await change('CONSERVATION');check(manual.status===200&&manual.data.categoryManual===true&&(await db.job.findUnique({where:{id:fixture.id}})).category==='CONSERVATION','Owner can manually correct an existing job category');
 filtered=await fetchJobs('category=CAMPS');check(!filtered.data.data.some(j=>j.id===fixture.id),'Manual recategorization immediately updates public filters');
 const auto=await change('AUTO');check(auto.status===200&&auto.data.category==='CAMPS'&&auto.data.categoryManual===false,'Owner can restore automatic title-based categorization');
 await db.job.deleteMany({where:{slug:{in:['category-fixture','private-category-fixture']}}});
 return assertions;
}
