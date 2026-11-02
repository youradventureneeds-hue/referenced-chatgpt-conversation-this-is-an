import {forumVersion} from '@/lib/forum-server';
import {createForumStream} from '@/lib/forum-stream.mjs';
export const dynamic='force-dynamic';
export const runtime='nodejs';
export const maxDuration=60;
export async function GET(request:Request){const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)return new Response('Invalid origin',{status:403});return new Response(createForumStream({getVersion:forumVersion,signal:request.signal}),{headers:{'Content-Type':'text/event-stream','Cache-Control':'no-cache, no-store, no-transform','X-Accel-Buffering':'no'}});}
