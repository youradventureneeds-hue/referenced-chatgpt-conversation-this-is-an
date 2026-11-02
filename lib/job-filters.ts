import type {Prisma} from '@prisma/client';
import {jobQuerySchema} from '@/lib/validators';
import type {z} from 'zod';
export function publicJobWhere(input:z.infer<typeof jobQuerySchema>):Prisma.JobWhereInput {
 return {status:'PUBLISHED',reviewedByAdmin:true,
  ...(input.country?{country:{equals:input.country,mode:'insensitive'}}:{}),
  ...(input.type?{workType:input.type}:{}),
  ...(input.category?{category:input.category}:{}),
  ...(['true','on'].includes(input.visa||'')?{visaSponsorship:true}:{}),
  ...(input.q?{OR:[{title:{contains:input.q,mode:'insensitive'}},{description:{contains:input.q,mode:'insensitive'}},{region:{contains:input.q,mode:'insensitive'}},{organization:{name:{contains:input.q,mode:'insensitive'}}}]}:{}),
 };
}
