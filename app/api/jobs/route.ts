import { prisma } from "@/lib/prisma";
import type { WorkType } from "@prisma/client";
import { jobQuerySchema } from "@/lib/validators";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = jobQuerySchema.safeParse(Object.fromEntries(searchParams));
  if (!parsed.success) return Response.json({ error: "Invalid job filters" }, { status: 400 });
  const input = parsed.data;
  const types = ["FULL_TIME", "PART_TIME", "SEASONAL", "INTERNSHIP", "VOLUNTEER", "GAP_YEAR", "UNSPECIFIED"];
  if (input.type && !types.includes(input.type)) return Response.json({ error: "Unknown work type" }, { status: 400 });
  const rows = await prisma.job.findMany({
    where: {
      status: "PUBLISHED", reviewedByAdmin: true,
      ...(input.country ? { country: { equals: input.country, mode: "insensitive" as const } } : {}),
      ...(input.type ? { workType: input.type as WorkType } : {}),
      ...(["true", "on"].includes(input.visa || "") ? { visaSponsorship: true } : {}),
      ...(input.q ? { OR: [
        { title: { contains: input.q, mode: "insensitive" as const } },
        { description: { contains: input.q, mode: "insensitive" as const } },
        { organization: { name: { contains: input.q, mode: "insensitive" as const } } },
      ] } : {}),
    },
    include: { organization: { select: { name: true, slug: true, verified: true } } },
    orderBy: { createdAt: "desc" },
  });
  const data = rows.map(row => ({
    id: row.id, slug: row.slug, title: row.title,
    summary: row.description.split("\n\nOriginal vacancy:")[0],
    location: row.region ? `${row.region}, ${row.country}` : row.country,
    country: row.country, jobType: row.workType, sponsorshipAvailable: row.visaSponsorship,
    organization: row.organization,
  }));
  return Response.json({ data, meta: { total: data.length, source: "database" } });
}
