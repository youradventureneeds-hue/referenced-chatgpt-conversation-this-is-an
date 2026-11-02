import {forum,forumActor,forumJson,forumFailure,forumBody,forumId} from '@/lib/forum-server';
import {z} from 'zod';
export async function POST(request:Request){try{const actor=await forumActor(request,'reports',5);const input=z.object({topicId:forumId.optional(),replyId:forumId.optional(),reason:z.string().trim().min(5,'Please explain the issue in a few words.').max(1000)}).refine(v=>Boolean(v.topicId)!==Boolean(v.replyId),'Choose a discussion or a reply.').parse(await forumBody(request));return forumJson(await forum.report(actor,input),201);}catch(e){return forumFailure(e);}}
