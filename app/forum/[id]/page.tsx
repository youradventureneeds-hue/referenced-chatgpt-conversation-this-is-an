import {notFound} from 'next/navigation';
import {forum} from '@/lib/forum-server';
import {ForumError} from '@/lib/forum.mjs';
import {ForumThread} from '@/components/forum-thread';
import '@/components/forum.css';
export const dynamic='force-dynamic';
export default async function DiscussionPage({params}:{params:Promise<{id:string}>}){const {id}=await params;let data;try{data=await forum.topic(id,undefined);}catch(e){if(e instanceof ForumError&&e.status===404)notFound();throw e;}return <main className="section forum-page"><ForumThread key={id} initial={JSON.parse(JSON.stringify(data))}/></main>;}
