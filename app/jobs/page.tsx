import Link from 'next/link';
import {prisma} from '@/lib/prisma';
import {JobCard} from '@/components/job-card';
import {jobQuerySchema} from '@/lib/validators';
import {publicJobWhere} from '@/lib/job-filters';
import {JOB_CATEGORIES} from '@/lib/job-categories.mjs';
import {JobFilters} from '@/components/job-filters';
export const dynamic='force-dynamic';
export default async function JobsPage({searchParams}:{searchParams?:Promise<{q?:string;country?:string;type?:string;category?:string;visa?:string}>}){
 const parsed=jobQuerySchema.safeParse(await searchParams||{});
 if(!parsed.success)return <main className="section"><h1>Outdoor opportunities</h1><p role="alert">One of these filters is not valid.</p><Link className="text-link" href="/jobs">Clear filters and browse jobs →</Link></main>;
 const input=parsed.data;
 const [rawJobs,countries,categoryCounts]=await Promise.all([
  prisma.job.findMany({where:publicJobWhere(input),include:{organization:{select:{name:true,slug:true,verified:true}}},orderBy:{createdAt:'desc'}}),
  prisma.job.findMany({where:{status:'PUBLISHED',reviewedByAdmin:true},select:{country:true},distinct:['country'],orderBy:{country:'asc'}}),
  prisma.job.groupBy({by:['category'],where:publicJobWhere({...input,category:undefined}),_count:{_all:true}}),
 ]);
 const counts=new Map(categoryCounts.map(c=>[c.category,c._count._all]));
 const jobs=rawJobs.map(job=>({id:job.id,title:job.title,slug:job.slug,summary:job.description.split('\n\nOriginal vacancy:')[0],jobType:job.workType,category:job.category,sponsorshipAvailable:job.visaSponsorship,country:job.country,location:job.region?`${job.region}, ${job.country}`:job.country,organization:job.organization}));
 return <main className="section job-directory"><p className="eyebrow">GLOBAL JOB BOARD</p><h1>Outdoor opportunities</h1><p className="lead">Find your kind of work outdoors. Browse by job category, country, and work type.</p>
  <JobFilters q={input.q||''} category={input.category||'all'} country={input.country||'all'} type={input.type||'all'} visa={['true','on'].includes(input.visa||'')} countries={countries.map(({country})=>country)} categories={Object.entries(JOB_CATEGORIES).map(([value,label])=>({value,label,count:counts.get(value)||0}))}/>
  <p className="muted" role="status">{jobs.length} {jobs.length===1?'opportunity':'opportunities'} found · Filters update as soon as you change them. Press Enter after typing a search.</p>
  {jobs.length?<div className="grid">{jobs.map(job=><JobCard key={job.id} job={job}/>)}</div>:<article className="card"><h2>No matching opportunities yet.</h2><p>Try another category or broaden your location and work type filters.</p><Link className="text-link" href="/jobs">View all published jobs →</Link></article>}
 </main>;
}
