import {forumViewer,forumJson,forumFailure} from '@/lib/forum-server';
export const dynamic='force-dynamic';
export async function GET(request:Request){try{return forumJson(await forumViewer(request));}catch(e){return forumFailure(e);}}
