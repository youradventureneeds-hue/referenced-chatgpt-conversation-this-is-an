import { z } from "zod";
export const registerSchema = z.object({ name: z.string().min(2), email: z.string().email(), password: z.string().min(8), role: z.enum(["CANDIDATE", "EMPLOYER"]) });
export const jobQuerySchema = z.object({ q: z.string().optional(), country: z.string().optional(), type: z.string().optional(), visa: z.string().optional() });
