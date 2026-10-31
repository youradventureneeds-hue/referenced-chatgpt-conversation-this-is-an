import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';

const root = fileURLToPath(new URL('../', import.meta.url));
const defaultFile = path.join(root, 'data/Outdoor_Education_Jobs_USA_Expanded.xlsx');
const rolePattern = /\b(counsell?or|guide|instructor|educator|teacher|facilitator|leader|coach|trainer|manager|director|coordinator|intern|specialist|naturalist|ecologist|researcher|medic|chef|cook|driver|assistant|officer|lifeguard|nurse|supervisor|technician|administrator)\b/i;

export function cleanText(value = '') {
  return String(value).replace(/<[^>]*>/g, ' ')
    .replace(/&(?:amp|nbsp|quot|apos|lt|gt);|&#(?:x[\da-f]+|\d+);/gi, entity => {
      const named = { '&amp;': '&', '&nbsp;': ' ', '&quot;': '"', '&apos;': "'", '&lt;': '<', '&gt;': '>' };
      if (named[entity.toLowerCase()] !== undefined) return named[entity.toLowerCase()];
      const hex = /^&#x/i.test(entity);
      const number = parseInt(entity.slice(hex ? 3 : 2, -1), hex ? 16 : 10);
      return number > 0 && number <= 0x10ffff ? String.fromCodePoint(number) : '';
    }).replace(/\s+/g, ' ').trim();
}

export function slugify(name) {
  return name.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export function httpUrl(value) {
  const url = new URL(String(value).trim());
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw new Error('Expected an HTTP(S) URL without credentials');
  }
  return url.href;
}

export function normalizeRow(row) {
  const cells = Object.fromEntries(Object.entries(row).map(([k, v]) => [k.trim().toLowerCase(), String(v ?? '').trim()]));
  const name = cells.organization || cells.name;
  if (!name) throw new Error('Missing Organization');
  const slug = slugify(name);
  if (!slug) throw new Error('Organization must contain letters or numbers for its URL');
  const location = cells.location || cells.region || '';
  let country = cells.country;
  if (!country) {
    if (/\b(UK|United Kingdom)\b/i.test(location)) country = 'United Kingdom';
    else if (/\b(USA|United States)\b/i.test(location) || /,\s*(AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY|DC)\b/.test(location)) country = 'United States';
    else throw new Error('Add a Country column: country could not be determined from Location');
  }
  return {
    name, slug, country, region: location || undefined,
    careersUrl: httpUrl(cells['recruitment page'] || cells.careersurl || ''),
    ...(cells.website ? { website: httpUrl(cells.website) } : {}),
  };
}

export function extractJobsFromHtml(html, now = Date.now()) {
  const structured = [];
  let hasJobPosting = false;
  function visit(value, depth = 0) {
    if (!value || typeof value !== 'object' || depth > 30) return;
    if (Array.isArray(value)) return value.forEach(item => visit(item, depth + 1));
    const types = [].concat(value['@type'] || []);
    if (types.some(type => /(?:^|\/)JobPosting$/.test(type))) {
      hasJobPosting = true;
      const expiry = Date.parse(value.validThrough);
      if ((!Number.isFinite(expiry) || expiry >= now) && typeof value.title === 'string') {
        structured.push(cleanText(value.title));
      }
    }
    for (const child of Object.values(value)) visit(child, depth + 1);
  }
  for (const match of html.matchAll(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try { visit(JSON.parse(match[1])); } catch { /* Some sites have malformed metadata. */ }
  }
  const candidates = [...structured];
  if (!hasJobPosting) {
    const content = html.replace(/<(script|style|nav|header|footer)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ');
    for (const match of content.matchAll(/<(li|h[1-6]|a)\b[^>]*>([\s\S]*?)<\/\1>/gi)) {
      const text = cleanText(match[2]);
      if (text.length >= 6 && text.length <= 110 && text.split(' ').length <= 15 && rolePattern.test(text)
        && !/\b(blog|login|log in|home|contact|privacy|cookies|meet our|our team|about us|training|courses?|certification|become a|learn to|guide to|applications?|jobs|positions|opportunities|openings)\b/i.test(text)
        && !/[.!?]$/.test(text)) candidates.push(text);
    }
  }
  const seen = new Set();
  return candidates.filter(text => {
    const key = text.toLowerCase();
    if (!text || seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 30);
}

async function fetchPage(url, fetchImpl = fetch) {
  const response = await fetchImpl(url, {
    headers: { 'User-Agent': 'TGIO-Careers-Importer/1.0', Accept: 'text/html,application/xhtml+xml' },
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) throw new Error('HTTP ' + response.status);
  const type = response.headers.get('content-type') || '';
  if (type && !/text\/html|application\/xhtml\+xml/i.test(type)) throw new Error('Unsupported page type: ' + type);
  if (Number(response.headers.get('content-length')) > 4_000_000) throw new Error('Page exceeds 4 MB');
  const reader = response.body.getReader();
  const chunks = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.length;
      if (length > 4_000_000) throw new Error('Page exceeds 4 MB');
      chunks.push(Buffer.from(value));
    }
  } finally { await reader.cancel(); }
  return { html: Buffer.concat(chunks).toString('utf8'), url: response.url || url };
}

export async function fetchJobs(url, fetchImpl = fetch) {
  return extractJobsFromHtml((await fetchPage(url, fetchImpl)).html);
}

export function careersLinks(html, baseUrl) {
  const links = [];
  for (const match of html.matchAll(/<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    try {
      const url = httpUrl(new URL(match[1].replace(/&amp;/g, '&'), baseUrl).href);
      const label = cleanText(match[2]);
      const sameHost = new URL(url).hostname === new URL(baseUrl).hostname;
      const hiringPortal = /(^|\.)(applytojob\.com|bamboohr\.com|workable\.com|greenhouse\.io|lever\.co|adp\.com|paylocity\.com|icims\.com|myworkdayjobs\.com|prismhr-hire\.com|paycomonline\.net)$/.test(new URL(url).hostname);
      if ((sameHost || hiringPortal) && /careers?|employment|work-with-us|open.positions|current.openings|job.openings|view.jobs/i.test(url + ' ' + label)
        && !/\.(pdf|png|jpg)(?:\?|$)|\/blog\/|email-signup|\/perks\//i.test(url)) {
        const parsed = new URL(url);
        parsed.hash = '';
        links.push({ url: parsed.href, score: (hiringPortal ? 2 : 0) + (/open.positions|current.openings|career.openings|apply.now/i.test(url + ' ' + label) ? 1 : 0) });
      }
    } catch { /* Ignore non-web links. */ }
  }
  return [...new Set(links.sort((a, b) => b.score - a.score).map(link => link.url))].filter(url => url !== baseUrl).slice(0, 3);
}

export async function scrapeCareers(url, fetchImpl = fetch) {
  let page;
  let recovered = false;
  try { page = await fetchPage(url, fetchImpl); }
  catch (error) {
    // A moved careers URL can often be recovered from the organization's homepage.
    if (!/^HTTP (404|410)$/.test(error.message)) throw error;
    page = await fetchPage(new URL('/', url).href, fetchImpl);
    recovered = true;
  }
  const jobs = recovered ? [] : extractJobsFromHtml(page.html);
  if (jobs.length) return { jobs, url: page.url };
  for (const link of careersLinks(page.html, page.url)) {
    try {
      const linked = await fetchPage(link, fetchImpl);
      const linkedJobs = extractJobsFromHtml(linked.html);
      if (linkedJobs.length) return { jobs: linkedJobs, url: linked.url };
    } catch { /* Keep the original careers URL if a linked portal fails. */ }
  }
  if (recovered) throw new Error('Original careers URL is unavailable; no replacement with job titles was found');
  return { jobs: [], url: page.url };
}

export async function saveOrganization(prisma, organization, jobs) {
  // Older CSV imports may have used a different slug for the same name.
  const existing = await prisma.organization.findMany({
    where: { OR: [{ slug: organization.slug }, { name: { equals: organization.name, mode: 'insensitive' } }] },
    select: { id: true, slug: true }, take: 2,
  });
  if (existing.length > 1) throw new Error('Multiple matching organizations; resolve duplicate names/slugs before importing');
  const data = { ...organization, slug: existing[0]?.slug || organization.slug };
  // Empty or failed extraction is not proof that existing openings have closed.
  if (jobs?.length) data.openJobs = jobs.join(' | ');
  const update = { ...data };
  if (jobs === undefined) delete update.careersUrl;
  return prisma.organization.upsert({
    where: { slug: data.slug }, update, create: data,
  });
}

export async function main(args = process.argv.slice(2)) {
  const { values } = parseArgs({ args, options: {
    file: { type: 'string' }, limit: { type: 'string' }, report: { type: 'string' },
    write: { type: 'boolean', default: false }, 'dry-run': { type: 'boolean', default: false },
    offline: { type: 'boolean', default: false }, help: { type: 'boolean', short: 'h' },
  } });
  if (values.help) {
    console.log('Usage: node scripts/seedFromExcel.mjs [--file workbook.xlsx] [--limit 5] [--offline] [--write] [--report report.json]\nDefault: preview only. --offline validates Excel without fetching websites. --write saves organizations to the database.');
    return;
  }
  if (values.write && values['dry-run']) throw new Error('Use either --write or --dry-run');
  const limit = values.limit === undefined ? Infinity : Number(values.limit);
  if (!(limit > 0 && (Number.isInteger(limit) || limit === Infinity))) throw new Error('--limit must be a positive integer');
  const xlsx = (await import('xlsx')).default;
  const workbook = xlsx.read(fs.readFileSync(values.file ? path.resolve(values.file) : defaultFile), { type: 'buffer' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) throw new Error('Workbook contains no worksheets');
  const headers = (xlsx.utils.sheet_to_json(sheet, { header: 1 })[0] || []).map(value => String(value).trim().toLowerCase());
  for (const required of ['organization', 'recruitment page']) {
    if (!headers.includes(required)) throw new Error('Missing Excel column: ' + required);
  }
  const rows = xlsx.utils.sheet_to_json(sheet, { defval: '' }).slice(0, limit);
  if (!rows.length) throw new Error('Workbook contains no organization rows');
  const results = [];
  const summary = { total: rows.length, saved: 0, previewed: 0, failed: 0, scrapeWarnings: 0 };
  const reportPath = path.resolve(values.report || path.join(root, 'work/excel-import-report.json'));
  let prisma;
  try {
    if (values.write) {
      for (const file of ['.env', '.env.local']) {
        const envPath = path.join(root, file);
        if (fs.existsSync(envPath)) process.loadEnvFile(envPath);
      }
      if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is missing; configure the project .env before using --write');
      const { PrismaClient } = await import('@prisma/client');
      const { PrismaPg } = await import('@prisma/adapter-pg');
      // Use Node's PostgreSQL driver for portable TLS, including Windows.
      prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
      await prisma.$connect();
    }
    console.log((values.write ? 'IMPORT' : 'PREVIEW') + ': ' + rows.length + ' organizations' + (values.offline ? ' (offline)' : ''));
    const cache = new Map();
    const hostQueues = new Map();
    const processRow = async ([index, row]) => {
      const result = { row: index + 2, name: row.Organization, source: row };
      try {
        const organization = normalizeRow(row);
        result.organization = organization;
        if (!values.offline) {
          try {
            if (!cache.has(organization.careersUrl)) {
              const host = new URL(organization.careersUrl).hostname;
              const pending = (hostQueues.get(host) || Promise.resolve()).then(async () => {
                await new Promise(resolve => setTimeout(resolve, 300));
                return scrapeCareers(organization.careersUrl);
              });
              // Fetch each shared portal once; serialize requests to the same host.
              cache.set(organization.careersUrl, pending);
              hostQueues.set(host, pending.catch(() => {}));
            }
            const scraped = await cache.get(organization.careersUrl);
            result.jobs = scraped.jobs;
            if (scraped.url !== organization.careersUrl) {
              result.originalCareersUrl = organization.careersUrl;
              organization.careersUrl = scraped.url;
            }
            if (!result.jobs.length) result.warning = 'No job titles detected. Page may use JavaScript or an external hiring portal; existing jobs will be preserved.';
          } catch (error) { result.warning = 'Scrape failed: ' + error.message + '. Existing jobs will be preserved.'; }
        }
        if (result.warning) summary.scrapeWarnings++;
        if (prisma) {
          await saveOrganization(prisma, organization, result.jobs);
          summary.saved++;
          result.status = 'saved';
        } else {
          summary.previewed++;
          result.status = 'preview';
        }
        console.log('[' + (index + 1) + '/' + rows.length + '] ' + organization.name + ': ' + (result.jobs?.length ?? 0) + ' titles' + (result.warning ? '; ' + result.warning : ''));
      } catch (error) {
        result.status = 'failed';
        result.error = error.message;
        summary.failed++;
        console.error('Row ' + result.row + ': ' + error.message);
      }
      results[index] = result;
    };
    const queue = rows.entries();
    await Promise.all(Array.from({ length: Math.min(3, rows.length) }, async () => {
      for (const item of queue) await processRow(item);
    }));
  } finally {
    if (prisma) await prisma.$disconnect();
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify({ generatedAt: new Date().toISOString(), mode: values.write ? 'write' : 'preview', summary, results }, null, 2));
  }
  console.log(JSON.stringify(summary));
  console.log('Report: ' + reportPath);
  if (summary.failed) process.exitCode = 1;
  return { summary, results };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
