import {z} from 'zod';
import {employerUrl} from '@/lib/employer-validation';
export const candidateProfileSchema=z.object({name:z.string().trim().min(2).max(100),headline:z.string().trim().max(150),bio:z.string().trim().max(3000),location:z.string().trim().max(150),resumeUrl:z.union([z.literal(''),employerUrl.refine(v=>new URL(v).protocol==='https:','Use a secure HTTPS link for your CV.')]),skills:z.array(z.string().trim().min(1).max(80)).max(30),certifications:z.array(z.string().trim().min(1).max(120)).max(20)});
export const candidateJobId=z.object({jobId:z.string().min(1).max(100)});
export const candidateRecordId=z.object({id:z.string().min(1).max(100)});
export const candidateStatuses=['PLANNED','APPLIED','INTERVIEW','OFFER','NOT_SELECTED','WITHDRAWN'] as const;
export const candidateApplicationCreate=candidateJobId.extend({status:z.enum(['PLANNED','APPLIED']).default('PLANNED'),confirmedExternalSubmission:z.boolean().optional()});
export const candidateApplicationUpdate=candidateRecordId.extend({status:z.enum(candidateStatuses),notes:z.string().trim().max(3000),confirmedExternalSubmission:z.boolean().optional()});
