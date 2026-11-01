import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import {load} from 'cheerio';import {createClient} from '../lib/job-scraper.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));for(const file of ['.env','.env.local']){const p=path.join(root,file);if(fs.existsSync(p))process.loadEnvFile(p);}
const {PrismaClient}=await import('@prisma/client');const {PrismaPg}=await import('@prisma/adapter-pg');const db=new PrismaClient({adapter:new PrismaPg({connectionString:process.env.DATABASE_URL})});
const known=JSON.parse(fs.readFileSync(path.join(root,'data/organization-websites.json'),'utf8'));
const config=JSON.parse(fs.readFileSync(path.join(root,'data/instagram-sources.json'),'utf8'));
const cacheFile=path.join(root,'work/instagram-handle-research.json');const researched=fs.existsSync(cacheFile)?JSON.parse(fs.readFileSync(cacheFile,'utf8')):{};
const client=createClient({timeout:10000,retries:0,delay:400});
try{const orgs=await db.organization.findMany({select:{name:true,slug:true,website:true}});const queue=orgs.values();
 await Promise.all(Array.from({length:4},async()=>{for(const org of queue){if(researched[org.slug])continue;const website=known[org.slug]||org.website;if(!website)continue;try{
  const page=await client.get(website),$=load(page.text),handles=new Set();
  $('a[href]').each((_,el)=>{try{const u=new URL($(el).attr('href'),page.url);if(!/^(www\.)?instagram\.com$/i.test(u.hostname))return;const parts=u.pathname.split('/').filter(Boolean);const handle=parts[0]==='_u'?parts[1]:parts[0];if(!handle||!/^[a-zA-Z0-9._]{1,30}$/.test(handle)||/^\d{10,}$/.test(handle)||/^(p|reel|reels|stories|explore|accounts|direct|tv|about|developer|legal|wix|physcode|thirty_f_template)$/i.test(handle))return;handles.add(handle.toLowerCase());}catch{}});
  researched[org.slug]={name:org.name,website:page.url,handles:[...handles],checkedAt:new Date().toISOString()};
 }catch(e){researched[org.slug]={name:org.name,website,error:e.message,handles:[],checkedAt:new Date().toISOString()};}
 fs.mkdirSync(path.dirname(cacheFile),{recursive:true});fs.writeFileSync(cacheFile,JSON.stringify(researched,null,2));
 } }));
 const merged=new Map();for(const [slug,row]of Object.entries(researched))for(const username of row.handles){if(/^\d{10,}$/.test(username)||['wix','physcode','thirty_f_template'].includes(username))continue;const record=merged.get(username)||{username,organizationSlug:slug,organizationSlugs:[],evidenceUrls:[],enabled:true};record.organizationSlugs.push(slug);record.evidenceUrls.push(row.website);if(record.organizationSlugs.length>1)record.organizationSlug=null;merged.set(username,record);}
 config.organizations=[...merged.values()].sort((a,b)=>a.username.localeCompare(b.username));fs.writeFileSync(path.join(root,'data/instagram-sources.json'),JSON.stringify(config,null,2));console.log(JSON.stringify({organizations:orgs.length,officialWebsiteChecks:Object.keys(researched).length,instagramAccounts:config.organizations.length,sharedAccounts:config.organizations.filter(s=>!s.organizationSlug).length}));
}finally{await db.$disconnect();}
