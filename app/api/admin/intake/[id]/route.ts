import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { ExtractedOpportunity } from "@/lib/intake";
import { z } from "zod";

const reviewSchema = z.object({ status: z.enum(["APPROVED", "REJECTED", "NEEDS_REVIEW"]), reviewNotes: z.string().max(1000).optional() });
const slugify = (value: string) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
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

  const extraction = intake.extraction as unknown as ExtractedOpportunity;
  const organizationName = extraction.organization === "Needs verification" ? "Unverified organization" : extraction.organization;
  const organizationSlug = slugify(organizationName);
  const jobSlug = `${slugify(extraction.title)}-${intake.id.slice(-6)}`;
  const workType = extraction.jobType === "FULL_TIME" || extraction.jobType === "GAP_YEAR" || extraction.jobType === "INTERNSHIP" || extraction.jobType === "VOLUNTEER" ? extraction.jobType : "SEASONAL";
  const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const organization = await tx.organization.upsert({ where: { slug: organizationSlug }, update: {}, create: { name: organizationName, slug: organizationSlug, country: extraction.country ?? "India" } });
    const job = await tx.job.create({ data: { organizationId: organization.id, title: extraction.title, slug: jobSlug, description: extraction.summary || intake.rawText, workType, status: "PUBLISHED", country: extraction.country ?? "India", region: extraction.location, visaSponsorship: false, visaEligibilityNote: extraction.eligibility, sourceChannel: intake.sourceType, reviewedByAdmin: true } });
    return tx.opportunityIntake.update({ where: { id }, data: { status: "APPROVED", reviewNotes: body.data.reviewNotes, reviewedAt: new Date(), approvedJobId: job.id } });
  });
  return Response.json({ data: result, meta: { publishedJobSlug: jobSlug } });
}
