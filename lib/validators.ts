import { z } from "zod";
import {isJobCategory} from './job-categories.mjs';
export const registerSchema = z.object({ name: z.string().min(2), email: z.string().email(), password: z.string().min(8), role: z.enum(["CANDIDATE", "EMPLOYER"]) });
const anyFilter=(v:unknown)=>v==='all'||v===''?undefined:v;
export const jobQuerySchema = z.object({
 q:z.string().trim().max(200).optional(),
 country:z.preprocess(anyFilter,z.string().trim().max(100).optional()),
 type:z.preprocess(anyFilter,z.enum(['FULL_TIME','PART_TIME','SEASONAL','INTERNSHIP','VOLUNTEER','GAP_YEAR','UNSPECIFIED']).optional()),
 category:z.preprocess(anyFilter,z.string().refine(isJobCategory,'Unknown job category').optional()),
 visa:z.string().max(10).optional(),
});
