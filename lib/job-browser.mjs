import {BOT,publicUrl} from './job-scraper.mjs';

// Browser rendering is opt-in for verified public hiring portals. The HTTP client
// checks robots and HTTP access first; rendering never handles a block challenge.
export async function renderHiringPage(url,client) {
  await client.get(url);
  const {chromium}=await import('playwright');
  const browser=await chromium.launch({headless:true});
  try{
    const page=await browser.newPage({userAgent:BOT+'/1.0 (+official careers aggregation)'});
    await page.route('**/*',route=>['image','media','font'].includes(route.request().resourceType())?route.abort():route.continue());
    const response=await page.goto(publicUrl(url),{waitUntil:'networkidle',timeout:45000});
    if(!response?.ok())throw Error('Browser HTTP '+response?.status());
    if(/just a moment|access denied|attention required/i.test(await page.title()))throw Error('Site blocked automated access');
    const text=await page.content();if(text.length>3_000_000)throw Error('Rendered page is too large');
    return {url:publicUrl(page.url()),text};
  }finally{await browser.close();}
}
