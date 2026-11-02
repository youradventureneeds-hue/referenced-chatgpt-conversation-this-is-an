import {prisma} from '@/lib/prisma';
import {currentCandidate} from '@/lib/candidate-server';
import {candidateProfileSchema} from '@/lib/candidate-validation';
import {employerJson,sameEmployerOrigin,employerBody} from '@/lib/employer-server';
import {consumeEmployerLimit} from '@/lib/employer-auth.mjs';
export const dynamic='force-dynamic';
const profileFields={headline:true,bio:true,location:true,resumeUrl:true,skills:true,certifications:true} as const;
export async function GET(request:Request){const user=await currentCandidate(request);if(!user)return employerJson({error:'Candidate sign-in required.'},401);const profile=await prisma.candidateProfile.findUnique({where:{userId:user.id},select:profileFields});return employerJson({user:{id:user.id,name:user.name,email:user.email},profile:profile||{headline:'',bio:'',location:'',resumeUrl:'',skills:[],certifications:[]}});}
export async function PATCH(request:Request){
 if(!sameEmployerOrigin(request))return employerJson({error:'Invalid request origin.'},403);
 const user=await currentCandidate(request);if(!user)return employerJson({error:'Candidate sign-in required.'},401);
 try{const parsed=candidateProfileSchema.safeParse(await employerBody(request));if(!parsed.success)return employerJson({error:parsed.error.issues[0]?.message||'Check your profile details.'},400);
 if(!await consumeEmployerLimit(prisma,'candidate-profile',user.id,60,3600000))return employerJson({error:'Too many updates. Try again later.'},429);
 const {name,...input}=parsed.data;const data={...input,skills:[...new Set(input.skills)],certifications:[...new Set(input.certifications)]};
 const result=await prisma.$transaction(async tx=>{await tx.user.update({where:{id:user.id},data:{name}});return tx.candidateProfile.upsert({where:{userId:user.id},create:{userId:user.id,...data},update:data,select:profileFields});},{timeout:15000});return employerJson({saved:true,profile:result});
 }catch{return employerJson({error:'Could not save your profile. Please try again.'},400);}
}
