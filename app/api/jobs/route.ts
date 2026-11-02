import {prisma} from '@/lib/prisma';
import {jobQuerySchema} from '@/lib/validators';
import {publicJobWhere} from '@/lib/job-filters';
import {jobCategoryLabel} from '@/lib/job-categories.mjs';
export const dynamic='force-dynamic';
export async function GET(request:Request){
 const parsed=jobQuerySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));if(!parsed.success)return Response.json({error:'Invalid job filters'},{status:400});
 const rows=await prisma.job.findMany({where:publicJobWhere(parsed.data),include:{organization:{select:{name:true,slug:true,verified:true}}},orderBy:{createdAt:'desc'}});
 const data=rows.map(row=>({id:row.id,slug:row.slug,title:row.title,summary:row.description.split('\n\nOriginal vacancy:')[0],location:row.region?`${row.region}, ${row.country}`:row.country,country:row.country,jobType:row.workType,category:row.category,categoryLabel:jobCategoryLabel(row.category),sponsorshipAvailable:row.visaSponsorship,organization:row.organization}));
 return Response.json({data,meta:{total:data.length,source:'database'}});
}
