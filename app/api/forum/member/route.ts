import {forum,forumActor,forumJson,forumFailure,forumBody} from '@/lib/forum-server';
import {z} from 'zod';
export async function POST(request:Request){try{const actor=await forumActor(request,'join',5,86400000);const {handle}=z.object({handle:z.string().trim().min(3).max(24)}).parse(await forumBody(request));const member=await forum.join(actor.userId,handle);return forumJson({member:{id:member.id,handle:member.handle,suspended:Boolean(member.suspendedAt)}},201);}catch(e){return forumFailure(e);}}
