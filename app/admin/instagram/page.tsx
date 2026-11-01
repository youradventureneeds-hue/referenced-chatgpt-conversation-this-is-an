import {cookies} from 'next/headers';
import {ADMIN_COOKIE,adminConfigured,validAdminSession} from '@/lib/admin-access';
import {AdminSignIn} from '@/components/admin-sign-in';
import {InstagramAdmin} from '@/components/instagram-admin';
export const dynamic='force-dynamic';
export default async function InstagramPage(){
 const signedIn=validAdminSession((await cookies()).get(ADMIN_COOKIE)?.value);
 return <main className="section"><p className="eyebrow">ADMINISTRATION</p><h1>Instagram recruitment</h1>{signedIn?<InstagramAdmin/>:adminConfigured()?<AdminSignIn/>:<p>Administrator access is not configured.</p>}</main>;
}
