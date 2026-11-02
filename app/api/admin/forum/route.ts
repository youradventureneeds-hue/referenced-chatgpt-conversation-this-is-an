import {adminDenied} from '@/lib/admin-access';
import {forum,forumJson,forumFailure,forumBody,forumId} from '@/lib/forum-server';
import {z} from 'zod';
export const dynamic='force-dynamic';
export async function GET(request:Request){const denied=adminDenied(request);if(denied)return denied;try{return forumJson(await forum.moderation());}catch(e){return forumFailure(e);}}
export async function POST(request:Request){const denied=adminDenied(request);if(denied)return denied;try{if(request.headers.get('origin')!==new URL(request.url).origin)return forumJson({error:'Invalid request origin.'},403);const input=z.object({id:forumId,action:z.enum(['topic_hide','topic_lock','topic_pin','reply_hide','member_suspend','report_resolve']),enabled:z.boolean().optional(),reason:z.string().trim().max(300).optional()}).refine(v=>v.action==='report_resolve'||typeof v.enabled==='boolean','Choose the moderation change.').parse(await forumBody(request));return forumJson(await forum.moderate(input));}catch(e){return forumFailure(e);}}
