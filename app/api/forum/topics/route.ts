import {forum,forumActor,forumJson,forumFailure,forumBody,topicCreate,listInput} from '@/lib/forum-server';
export const dynamic='force-dynamic';
export async function GET(request:Request){try{const args=listInput.parse(Object.fromEntries(new URL(request.url).searchParams));return forumJson(await forum.list(args));}catch(e){return forumFailure(e);}}
export async function POST(request:Request){try{const actor=await forumActor(request,'topics',5);const input=topicCreate.parse(await forumBody(request));return forumJson(await forum.createTopic(actor,input),201);}catch(e){return forumFailure(e);}}
