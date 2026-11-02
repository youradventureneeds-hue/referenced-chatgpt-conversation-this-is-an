import {prisma} from '@/lib/prisma';
import {currentCandidate} from '@/lib/candidate-server';
import {employerJson,sameEmployerOrigin} from '@/lib/employer-server';
import {consumeEmployerLimit} from '@/lib/employer-auth.mjs';
import {readDocumentForm,validateCandidateDocument,DOCUMENT_TOTAL_BYTES,CERTIFICATE_LIMIT} from '@/lib/candidate-documents.mjs';
export const dynamic='force-dynamic';
const metadata={id:true,kind:true,filename:true,mimeType:true,size:true,createdAt:true} as const;
export async function GET(request:Request){const user=await currentCandidate(request);if(!user)return employerJson({error:'Candidate sign-in required.'},401);return employerJson({documents:await prisma.candidateDocument.findMany({where:{userId:user.id},select:metadata,orderBy:{createdAt:'desc'}})});}
export async function POST(request:Request){
 if(!sameEmployerOrigin(request))return employerJson({error:'Invalid request origin.'},403);
 const user=await currentCandidate(request);if(!user)return employerJson({error:'Candidate sign-in required.'},401);
 try{
  if(!await consumeEmployerLimit(prisma,'candidate-upload',user.id,30,3600000))return employerJson({error:'Too many uploads. Try again later.'},429);
  const form=await readDocumentForm(request);const file=form.get('file');if(!file||typeof file==='string'||form.getAll('file').length!==1)return employerJson({error:'Choose one document per upload.'},400);
  const input=validateCandidateDocument({kind:String(form.get('kind')),name:file.name,type:file.type,bytes:Buffer.from(await file.arrayBuffer())});
  const document=await prisma.$transaction(async tx=>{
   // Serialize quota checks and CV replacement for this candidate only.
   await tx.user.update({where:{id:user.id},data:{updatedAt:new Date()},select:{id:true}});
   const existing=await tx.candidateDocument.findMany({where:{userId:user.id},select:{id:true,kind:true,size:true}});
   const retained=existing.filter(d=>!(input.kind==='CV'&&d.kind==='CV'));
   if(input.kind==='CERTIFICATION'&&retained.filter(d=>d.kind==='CERTIFICATION').length>=CERTIFICATE_LIMIT)throw Error('You can store up to 10 certification documents. Remove one before adding another.');
   if(retained.reduce((n,d)=>n+d.size,0)+input.size>DOCUMENT_TOTAL_BYTES)throw Error('Your documents exceed the 20 MB account limit. Remove a document first.');
   if(input.kind==='CV')await tx.candidateDocument.deleteMany({where:{userId:user.id,kind:'CV'}});
   return tx.candidateDocument.create({data:{userId:user.id,...input},select:metadata});
  },{timeout:15000});return employerJson({document},201);
 }catch(e){const message=(e as Error).message;return employerJson({error:/^(Each document|Choose |Upload |You can store|Your documents)/.test(message)?message:'Could not upload the document. Please try again.'},400);}
}
