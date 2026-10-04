import { jobs, organizations } from "@/lib/data";
export async function GET() { return Response.json({ data: { organizations: organizations.length, publishedJobs: jobs.length, pendingReviews: 0 } }); }
