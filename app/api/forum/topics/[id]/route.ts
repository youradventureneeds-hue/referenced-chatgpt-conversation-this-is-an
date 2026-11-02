import {forum,forumActor,forumJson,forumFailure,forumBody,forumId,topicInput} from '@/lib/forum-server';
export const dynamic='force-dynamic';
type Context={params:Promise<{id:string}>};
export async function GET(request:Request,{params}:Context){try{const id=forumId.parse((await params).id),before=new URL(request.url).searchParams.get('before');return forumJson(await forum.topic(id,before?forumId.parse(before):undefined));}catch(e){return forumFailure(e);}}
export async function PATCH(request:Request,{params}:Context){try{const actor=await forumActor(request,'edits',30);const id=forumId.parse((await params).id);return forumJson(await forum.changeTopic(actor,id,topicInput.parse(await forumBody(request))));}catch(e){return forumFailure(e);}}
export async function DELETE(request:Request,{params}:Context){try{const actor=await forumActor(request,'removals',30,3600000,true);const id=forumId.parse((await params).id);return forumJson(await forum.changeTopic(actor,id,{},true));}catch(e){return forumFailure(e);}}
