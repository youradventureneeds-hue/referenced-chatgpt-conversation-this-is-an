import fs from 'node:fs';
import {randomBytes} from 'node:crypto';
import {PrismaClient} from '@prisma/client';
import {PrismaPg} from '@prisma/adapter-pg';
if(process.env.EMPLOYER_ALLOW_ISOLATED_DB_TEST!=='1')throw Error('Explicit isolated database test opt-in required.');
if(fs.existsSync('.env'))process.loadEnvFile('.env');
const url=new URL(process.env.DATABASE_URL);if(url.hostname.endsWith('.pooler.supabase.com'))url.port='6543';process.env.DATABASE_URL=url.href;
const schema='employer_check_'+randomBytes(6).toString('hex');process.env.EMPLOYER_TEST_SCHEMA=schema;process.env.ADMIN_REVIEW_KEY=randomBytes(32).toString('base64url');
const root=new PrismaClient({adapter:new PrismaPg({connectionString:url.href,max:1})});let db;
try{
 await root.$executeRawUnsafe('CREATE SCHEMA "'+schema+'"');const sql=fs.readFileSync('work/employer-check-schema.sql','utf8').replace(/CREATE SCHEMA IF NOT EXISTS "public";/,'');
 await root.$transaction(async tx=>{await tx.$executeRawUnsafe('SET LOCAL search_path TO "'+schema+'"');for(const statement of sql.split(';').map(v=>v.trim()).filter(v=>v&&v.replace(/--[^\n]*/g,'').trim()))await tx.$executeRawUnsafe(statement);},{timeout:120000});
 db=(await import('./testing/employer-db.mjs')).prisma;await db.organization.create({data:{name:'Fixture Category School',slug:'category-fixture-school',country:'India'}});
 const {jobCategoryCases}=await import('./testing/job-category-cases.mjs');console.log(JSON.stringify({categoryIntegrationPassed:true,assertions:await jobCategoryCases(db),isolatedSchemaOnly:true}));
}catch(e){console.log(JSON.stringify({categoryIntegrationPassed:false,error:String(e.message).replace(/postgres(?:ql)?:\/\/\S+/g,'[database URL]').slice(0,300)}));process.exitCode=1;}
finally{if(db)await db.$disconnect();if(/^employer_check_[a-f0-9]{12}$/.test(schema))await root.$executeRawUnsafe('DROP SCHEMA IF EXISTS "'+schema+'" CASCADE');await root.$disconnect();}
