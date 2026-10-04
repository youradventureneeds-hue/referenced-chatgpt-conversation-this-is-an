import { PrismaClient, Role, WorkType, JobStatus } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // 1. Create Demo Admin User
  const adminUser = await prisma.user.upsert({
    where: { email: "admin@greatindianoutdoors.com" },
    update: {},
    create: {
      email: "admin@greatindianoutdoors.com",
      name: "TGI Admin",
      role: Role.ADMIN,
    },
  });

  // 2. Create Initial Outdoor Organizations
  const bikat = await prisma.organization.upsert({
    where: { slug: "bikat-adventures" },
    update: {},
    create: {
      name: "Bikat Adventures",
      slug: "bikat-adventures",
      description: "Himalayan exploration, high-altitude trekking, and mountaineering learning experiences across India.",
      website: "https://www.bikatadventures.com",
      country: "India",
      region: "Uttarakhand & Himachal Pradesh",
      verified: true,
    },
  });

  const outwardBound = await prisma.organization.upsert({
    where: { slug: "outward-bound-international" },
    update: {},
    create: {
      name: "Outward Bound Network",
      slug: "outward-bound-international",
      description: "Experiential education, wilderness expeditions, and leadership development programs worldwide.",
      website: "https://www.outwardbound.net",
      country: "International",
      region: "Global",
      verified: true,
    },
  });

  // 3. Create Initial Career & Gap-Year Opportunities
  await prisma.job.upsert({
    where: { slug: "himalayan-trek-leader-apprentice-2026" },
    update: {},
    create: {
      organizationId: bikat.id,
      title: "Himalayan Trek Leader Apprentice",
      slug: "himalayan-trek-leader-apprentice-2026",
      description: "6-month experiential apprenticeship leading expeditions, managing trail safety, and learning mountain navigation in Garhwal and Ladakh.",
      workType: WorkType.SEASONAL,
      status: JobStatus.PUBLISHED,
      country: "India",
      region: "Uttarakhand",
      visaSponsorship: false,
      visaEligibilityNote: "Open to Indian citizens or candidates holding valid employment permits in India.",
      salaryMin: 25000,
      salaryMax: 40000,
      currency: "INR",
      isUnpaid: false,
      sourceChannel: "EMPLOYER_PORTAL",
      reviewedByAdmin: true,
    },
  });

  await prisma.job.upsert({
    where: { slug: "outdoor-education-fellowship-gap-year" },
    update: {},
    create: {
      organizationId: outwardBound.id,
      title: "Outdoor Education & Wilderness Fellowship",
      slug: "outdoor-education-fellowship-gap-year",
      description: "Structured gap-year fellowship focusing on youth development, backcountry logistics, ERCA/ropes course instruction, and wilderness first response.",
      workType: WorkType.GAP_YEAR,
      status: JobStatus.PUBLISHED,
      country: "Germany",
      region: "Bavaria",
      visaSponsorship: true,
      visaEligibilityNote: "Sponsorship available for international gap-year participants with valid youth exchange eligibility.",
      salaryMin: 1200,
      salaryMax: 1800,
      currency: "EUR",
      isUnpaid: false,
      sourceChannel: "VERIFIED_PARTNER",
      reviewedByAdmin: true,
    },
  });

  console.log("Seeding complete. Initial organizations and opportunities populated.");
}

main()
  .catch((e) => {
    console.error("Error during seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });