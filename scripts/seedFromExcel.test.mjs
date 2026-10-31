import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeRow, extractJobsFromHtml, fetchJobs, scrapeCareers, careersLinks, saveOrganization } from './seedFromExcel.mjs';

const row = { Organization: 'Camp & School', Location: 'Jackson, WY', 'Recruitment Page': 'https://example.com/jobs', Category: 'Camp', 'Contact Email': 'hr@example.com' };

test('Excel rows map to actual Prisma fields and infer US and UK countries', () => {
  assert.deepEqual(normalizeRow(row), {
    name: 'Camp & School', slug: 'camp-school', country: 'United States', region: 'Jackson, WY', careersUrl: 'https://example.com/jobs',
  });
  assert.equal(normalizeRow({ ...row, Location: 'London, UK (Global HQ)' }).country, 'United Kingdom');
  assert.equal(normalizeRow({ ...row, Location: 'Manali', Country: 'India' }).country, 'India');
  assert.throws(() => normalizeRow({ ...row, Location: 'Unknown' }), /Country/);
  assert.throws(() => normalizeRow({ ...row, 'Recruitment Page': 'mailto:jobs@example.com' }), /HTTP/);
  assert.throws(() => normalizeRow({ ...row, Organization: '' }), /Missing Organization/);
});

test('structured jobs support nested graphs, entities, deduplication and expiry', () => {
  const data = { '@graph': [
    { '@type': 'JobPosting', title: 'Field &amp; Science Educator' },
    { '@type': ['JobPosting'], title: 'Field &amp; Science Educator' },
    { '@type': 'https://schema.org/JobPosting', title: 'Expired Instructor', validThrough: '2020-01-01' },
  ] };
  assert.deepEqual(extractJobsFromHtml('<script type="application/ld+json">' + JSON.stringify(data) + '</script><h2>Expired Instructor</h2>'), ['Field & Science Educator']);
});

test('static extraction handles headings and links while excluding navigation and courses', () => {
  const html = '<nav><a>Tour Guide</a></nav><h2>Outdoor Instructor</h2><li><a>Camp Counselor</a></li><a>Outdoor Instructor</a><h2>Instructor Training</h2><a>Instructor application</a><a>Case Manager Jobs &gt;&gt;</a><footer>Camp Manager</footer>';
  assert.deepEqual(extractJobsFromHtml(html), ['Outdoor Instructor', 'Camp Counselor']);
  assert.deepEqual(extractJobsFromHtml('<script type="application/ld+json">invalid</script><h3>Science Teacher</h3>'), ['Science Teacher']);
});

test('HTTP and content failures are reported rather than treated as empty job pages', async () => {
  await assert.rejects(fetchJobs('https://example.com', async () => new Response('blocked', { status: 403 })), /HTTP 403/);
  await assert.rejects(fetchJobs('https://example.com', async () => new Response('pdf', { headers: { 'content-type': 'application/pdf' } })), /Unsupported/);
  await assert.rejects(fetchJobs('https://example.com', async () => new Response('x', { headers: { 'content-type': 'text/html', 'content-length': '5000000' } })), /4 MB/);
  assert.deepEqual(await fetchJobs('https://example.com', async () => new Response('<h2>Camp Instructor</h2>', { headers: { 'content-type': 'text/html' } })), ['Camp Instructor']);
});

test('existing legacy slugs are reused and empty scrapes never erase existing jobs', async () => {
  const calls = [];
  const prisma = { organization: {
    findMany: async () => [{ id: 'existing', slug: 'camp-and-school' }],
    upsert: async value => { calls.push(value); return value; },
  } };
  await saveOrganization(prisma, normalizeRow(row), []);
  assert.deepEqual(calls[0].where, { slug: 'camp-and-school' });
  assert.equal(Object.hasOwn(calls[0].update, 'openJobs'), false);
  assert.equal(Object.hasOwn(calls[0].update, 'verified'), false);
  await saveOrganization(prisma, normalizeRow(row), ['Camp Instructor']);
  assert.equal(calls[1].update.openJobs, 'Camp Instructor');
  await saveOrganization(prisma, normalizeRow(row), undefined);
  assert.equal(Object.hasOwn(calls[2].update, 'careersUrl'), false);
  assert.equal(calls[2].create.careersUrl, row['Recruitment Page']);
  prisma.organization.findMany = async () => [{ slug: 'one' }, { slug: 'two' }];
  await assert.rejects(saveOrganization(prisma, normalizeRow(row), []), /Multiple matching/);
});

test('moved careers pages are recovered from the official homepage', async () => {
  const visited = [];
  const fetchImpl = async url => {
    visited.push(url);
    if (url.endsWith('/old')) return new Response('missing', { status: 404 });
    return new Response(url.endsWith('/employment') ? '<h2>Outdoor Instructor</h2>' : '<a href="/employment">Employment</a>', { headers: { 'content-type': 'text/html' } });
  };
  assert.deepEqual(await scrapeCareers('https://example.com/old', fetchImpl), { jobs: ['Outdoor Instructor'], url: 'https://example.com/employment' });
  assert.equal(visited.length, 3);
  assert.deepEqual(careersLinks('<a href="https://unrelated.example/careers">Careers</a><a href="/blog/careers">Careers</a>', 'https://example.com/'), []);
});
