import { organizations } from "@/lib/data";
export async function GET() { return Response.json({ data: organizations, meta: { total: organizations.length, source: "demo" } }); }
