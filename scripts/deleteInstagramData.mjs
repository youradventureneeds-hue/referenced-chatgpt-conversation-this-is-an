import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import {parseArgs} from 'node:util';import {instagramUsername} from '../lib/instagram-collector.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));const {values}=parseArgs({options:{username:{type:'string'},write:{type:'boolean',default:false}}});
if(!values.username)throw Error('Specify the account username');const username=instagramUsername(values.username);
for(const name of ['.env','.env.local']){const p=path.join(root,name);if(fs.existsSync(p))process.loadEnvFile(p);}
const excluded=(process.env.INSTAGRAM_EXCLUDED_USERNAMES||'').split(',').map(s=>s.trim().replace(/^@/,'').toLowerCase());
if(values.write&&!excluded.includes(username))throw Error('Exclude this username in the deployed collector configuration before deleting its data');
const {PrismaClient}=await import('@prisma/client');const {PrismaPg}=await import('@prisma/adapter-pg');const p=new PrismaClient({adapter:new PrismaPg({connectionString:process.env.DATABASE_URL})});
try{const rows=await p.opportunityIntake.findMany({where:{sourceType:'INSTAGRAM',extraction:{path:['instagram','username'],equals:username}},select:{id:true,approvedJobId:true}});const ids=rows.map(r=>r.id),jobs=rows.map(r=>r.approvedJobId).filter(Boolean);
 if(values.write)await p.$transaction(async tx=>{for(const id of jobs)await tx.job.updateMany({where:{id,sourceChannel:'INSTAGRAM'},data:{status:'ARCHIVED',title:'Removed recruitment listing',description:'Source content removed following a verified removal request.',slug:'removed-instagram-'+id,country:'Not specified',region:null,workType:'UNSPECIFIED',visaEligibilityNote:null,sourceChannel:'INSTAGRAM_REMOVED'}});await tx.opportunityIntake.deleteMany({where:{id:{in:ids},sourceType:'INSTAGRAM'}});});
 console.log(JSON.stringify({mode:values.write?'write':'preview',reviewRecords:ids.length,relatedListings:jobs.length}));
}finally{await p.$disconnect();}
