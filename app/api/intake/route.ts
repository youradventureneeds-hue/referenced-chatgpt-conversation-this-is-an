import { prisma } from "@/lib/prisma";
import { extractOpportunity, fingerprint, sourceTypes } from "@/lib/intake";
import { z } from "zod";

const intakeSchema = z.object({
  sourceType: z.enum(sourceTypes),
  sourceUrl: z.string().url().optional(),
  submittedByEmail: z.string().email().optional(),
  rawText: z.string().min(30).max(15000),
});

export async function GET() {
  const items = await prisma.opportunityIntake.findMany({ orderBy: { createdAt: "desc" }, take: 100 });
  return Response.json({ data: items, meta: { humanReviewRequired: true } });
}

export async function POST(request: Request) {
  const parsed = intakeSchema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: "Provide a source type and at least 30 characters of opportunity text.", issues: parsed.error.flatten() }, { status: 400 });
  const extraction = extractOpportunity(parsed.data.rawText);
  const key = fingerprint(extraction);
  const duplicate = await prisma.opportunityIntake.findUnique({ where: { fingerprint: key } });
  if (duplicate) return Response.json({ data: duplicate, meta: { duplicateDetected: true, humanReviewRequired: true } });
  const item = await prisma.opportunityIntake.create({ data: { ...parsed.data, fingerprint: key, extraction, status: "NEEDS_REVIEW" } });
  return Response.json({ data: item, meta: { duplicateDetected: false, humanReviewRequired: true } }, { status: 201 });
}
