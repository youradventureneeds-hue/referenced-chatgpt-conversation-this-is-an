import {cookies} from 'next/headers';
import {ADMIN_COOKIE,adminConfigured,validAdminSession} from '@/lib/admin-access';
import {AdminSignIn} from '@/components/admin-sign-in';
import {ForumModeration} from '@/components/forum-moderation';
import '@/components/forum.css';
export const dynamic='force-dynamic';
export default async function ForumAdminPage(){const signedIn=validAdminSession((await cookies()).get(ADMIN_COOKIE)?.value);return <main className="section forum-page"><p className="eyebrow">ADMINISTRATION</p><h1>Community moderation.</h1>{signedIn?<ForumModeration/>:adminConfigured()?<AdminSignIn/>:<p>Administrator access is not configured.</p>}</main>;}
