import {forum,forumActor,forumJson,forumFailure,forumBody,forumId,replyInput} from '@/lib/forum-server';
type Context={params:Promise<{id:string}>};
export async function PATCH(request:Request,{params}:Context){try{const actor=await forumActor(request,'edits',30);return forumJson(await forum.changeReply(actor,forumId.parse((await params).id),replyInput.parse(await forumBody(request))));}catch(e){return forumFailure(e);}}
export async function DELETE(request:Request,{params}:Context){try{const actor=await forumActor(request,'removals',30,3600000,true);return forumJson(await forum.changeReply(actor,forumId.parse((await params).id),{},true));}catch(e){return forumFailure(e);}}
