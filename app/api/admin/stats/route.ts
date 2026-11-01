import {prisma} from "@/lib/prisma";
import {adminDenied} from "@/lib/admin-access";
export async function GET(request:Request) {
 const denied=adminDenied(request);if(denied)return denied;
 const [organizations,publishedJobs,pendingReviews]=await Promise.all([prisma.organization.count(),prisma.job.count({where:{status:"PUBLISHED",reviewedByAdmin:true}}),prisma.opportunityIntake.count({where:{status:"NEEDS_REVIEW"}})]);
 return Response.json({data:{organizations,publishedJobs,pendingReviews}},{headers:{"Cache-Control":"no-store"}});
}
