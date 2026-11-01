import {NextResponse} from "next/server";
import {ADMIN_COOKIE,adminConfigured,createAdminSession,validAdminKey} from "@/lib/admin-access";
export async function POST(request:Request) {
 if(!adminConfigured())return NextResponse.json({error:"Administrator access is not configured"},{status:503});
 if(request.headers.get("origin")!==new URL(request.url).origin)return NextResponse.json({error:"Invalid request origin"},{status:403});
 const body=await request.json().catch(()=>null);
 if(typeof body?.key!=="string"||body.key.length>1000||!validAdminKey(body.key))return NextResponse.json({error:"Invalid administrator key"},{status:401});
 const response=NextResponse.json({ok:true});response.headers.set("Cache-Control","no-store");
 response.cookies.set(ADMIN_COOKIE,createAdminSession(),{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"strict",path:"/",maxAge:12*3600});
 return response;
}
