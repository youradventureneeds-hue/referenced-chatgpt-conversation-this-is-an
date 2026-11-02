import {forum} from '@/lib/forum-server';
import {ForumList} from '@/components/forum-list';
import '@/components/forum.css';
export const dynamic='force-dynamic';
export const metadata={title:'Outdoor community forum | The Great Indian Outdoors',description:'Share outdoor ideas, career questions, and field experience with the community.'};
export default async function ForumPage(){const initial=await forum.list({page:1,category:undefined,q:''});return <main className="section forum-page"><ForumList initial={JSON.parse(JSON.stringify(initial))}/></main>;}
