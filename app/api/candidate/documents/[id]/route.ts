import {prisma} from '@/lib/prisma';
import {currentCandidate} from '@/lib/candidate-server';
import {employerJson,sameEmployerOrigin} from '@/lib/employer-server';
export const dynamic='force-dynamic';
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){
 const user=await currentCandidate(request);if(!user)return employerJson({error:'Candidate sign-in required.'},401);
 const {id}=await params;const doc=await prisma.candidateDocument.findFirst({where:{id,userId:user.id}});if(!doc)return employerJson({error:'Document not found.'},404);
 const safeName=doc.filename.replace(/[^a-zA-Z0-9 ._()-]/g,'_');
 return new Response(Uint8Array.from(doc.content),{headers:{'Content-Type':doc.mimeType,'Content-Length':String(doc.size),'Content-Disposition':`attachment; filename="${safeName}"`,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; sandbox"}});
}
export async function DELETE(request:Request,{params}:{params:Promise<{id:string}>}){
 if(!sameEmployerOrigin(request))return employerJson({error:'Invalid request origin.'},403);
 const user=await currentCandidate(request);if(!user)return employerJson({error:'Candidate sign-in required.'},401);
 const {id}=await params;const deleted=await prisma.candidateDocument.deleteMany({where:{id,userId:user.id}});return deleted.count?employerJson({removed:true}):employerJson({error:'Document not found.'},404);
}
