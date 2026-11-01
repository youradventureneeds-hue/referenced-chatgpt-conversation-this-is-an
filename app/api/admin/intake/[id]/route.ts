import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { ExtractedOpportunity } from "@/lib/intake";
import { z } from "zod";
import {adminDenied} from "@/lib/admin-access";

const reviewSchema = z.object({ status: z.enum(["APPROVED", "REJECTED", "NEEDS_REVIEW"]), reviewNotes: z.string().max(1000).optional(),verified:z.boolean().optional(),title:z.string().trim().max(180).optional(),organization:z.string().trim().max(200).optional(),country:z.string().trim().max(120).optional(),summary:z.string().trim().max(15000).optional(),jobType:z.enum(["UNSPECIFIED","FULL_TIME","PART_TIME","SEASONAL","INTERNSHIP","VOLUNTEER","GAP_YEAR"]).optional(),applicationUrl:z.string().url().refine(value=>{const u=new URL(value);return ["https:","http:"].includes(u.protocol)&&!u.username&&!u.password;}).optional() });
const slugify = (value: string) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied=adminDenied(request);if(denied)return denied;
  const body = reviewSchema.safeParse(await request.json());
  if (!body.success) return Response.json({ error: "Invalid review update" }, { status: 400 });
  const { id } = await params;
  const intake = await prisma.opportunityIntake.findUnique({ where: { id } });
  if (!intake) return Response.json({ error: "Intake item not found" }, { status: 404 });
  if (body.data.status !== "APPROVED") {
    const item = await prisma.opportunityIntake.update({ where: { id }, data: { status: body.data.status, reviewNotes: body.data.reviewNotes, reviewedAt: new Date() } });
    return Response.json({ data: item });
  }
  if (intake.approvedJobId) return Response.json({ error: "This opportunity has already been published." }, { status: 409 });
  if(!body.data.verified)return Response.json({error:"Confirm that the employer and vacancy details have been verified."},{status:400});

  const extraction = intake.extraction as unknown as ExtractedOpportunity;
  const organizationName=body.data.organization||extraction.organization;
  const organization=await prisma.organization.findFirst({where:{name:{equals:organizationName,mode:"insensitive"}}});
  if(!organization)return Response.json({error:"Choose an existing organization from the directory before approving."},{status:400});
  const title=body.data.title||extraction.title;
  if(!title||title.length<4||/^Recruitment post from|^Instagram story/i.test(title))return Response.json({error:"Enter the verified job title."},{status:400});
  const summary=body.data.summary||extraction.summary||intake.rawText;
  if(summary.length<30)return Response.json({error:"Provide a verified job summary of at least 30 characters."},{status:400});
  if(extraction.instagram?.expiresAt&&new Date(extraction.instagram.expiresAt)<new Date()&&!body.data.applicationUrl)return Response.json({error:"This story has expired. Provide a current, verified official application URL."},{status:409});
  const jobSlug = `${slugify(title)}-${intake.id.slice(-6)}`;
  const workType=body.data.jobType||"UNSPECIFIED";
  const country=body.data.country||extraction.country||"Not specified";
  const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const job = await tx.job.create({ data: { organizationId: organization.id, title, slug: jobSlug, description: summary, workType, status: "PUBLISHED", country, region: extraction.location, visaSponsorship: false, visaEligibilityNote: extraction.eligibility||"Eligibility and sponsorship must be checked with the employer.", sourceChannel: intake.sourceType, reviewedByAdmin: true } });
    return tx.opportunityIntake.update({ where: { id }, data: { status: "APPROVED", extraction:{...extraction,title,organization:organization.name,country,jobType:workType,summary,applicationUrl:body.data.applicationUrl||extraction.applicationUrl||null}, reviewNotes: body.data.reviewNotes, reviewedAt: new Date(), approvedJobId: job.id } });
  });
  return Response.json({ data: result, meta: { publishedJobSlug: jobSlug } });
}
