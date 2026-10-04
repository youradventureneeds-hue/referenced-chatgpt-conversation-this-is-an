import fs from "fs";
import path from "path";
import https from "https";
import http from "http";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-");
}

function fetchHtml(url) {
  return new Promise((resolve) => {
    try {
      const client = url.startsWith("https") ? https : http;
      const req = client.get(
        url,
        {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          },
          timeout: 10000,
        },
        (res) => {
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            let redirectUrl = res.headers.location;
            if (!redirectUrl.startsWith("http")) {
              const u = new URL(url);
              redirectUrl = `${u.protocol}//${u.host}${redirectUrl}`;
            }
            return resolve(fetchHtml(redirectUrl));
          }
          let data = "";
          res.on("data", (chunk) => (data += chunk));
          res.on("end", () => resolve(data));
        }
      );
      req.on("error", () => resolve(""));
      req.on("timeout", () => {
        req.destroy();
        resolve("");
      });
    } catch {
      resolve("");
    }
  });
}

function cleanHtmlText(text) {
  return text
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function extractFullProfile(html, fallbackUrl) {
  if (!html) return { description: "Experiential outdoor and wilderness organisation.", bannerUrl: null };

  // 1. Extract Hero/Banner image from OpenGraph
  const ogImageMatch =
    html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']*)["']/i) ||
    html.match(/<meta[^>]*name=["']twitter:image["'][^>]*content=["']([^"']*)["']/i);
  let bannerUrl = ogImageMatch ? ogImageMatch[1] : null;

  if (bannerUrl && !bannerUrl.startsWith("http")) {
    const parsed = new URL(fallbackUrl);
    bannerUrl = `${parsed.protocol}//${parsed.host}${bannerUrl.startsWith("/") ? "" : "/"}${bannerUrl}`;
  }

  // 2. Extract substantive content paragraphs from About page
  const paragraphMatches = html.match(/<p[^>]*>([\s\S]*?)<\/p>/gi) || [];
  const meaningfulParagraphs = paragraphMatches
    .map(cleanHtmlText)
    .filter((p) => p.length > 80 && !p.toLowerCase().includes("cookie") && !p.toLowerCase().includes("copyright"))
    .slice(0, 4); // Take the top 3-4 substantive paragraphs

  let fullDescription = meaningfulParagraphs.join("\n\n");

  // Fallback to meta description if paragraph parsing returned sparse text
  if (fullDescription.length < 100) {
    const metaDesc =
      html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']*)["']/i) ||
      html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i);
    fullDescription = metaDesc ? metaDesc[1] : "Experiential outdoor organization leading wilderness expeditions.";
  }

  return {
    description: fullDescription,
    bannerUrl,
  };
}

async function run() {
  const csvPath = path.join(process.cwd(), "data", "organizations.csv");

  if (!fs.existsSync(csvPath)) {
    console.error(`❌ Missing file at: ${csvPath}`);
    return;
  }

  const raw = fs.readFileSync(csvPath, "utf-8");
  const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const rows = lines.slice(1);

  console.log(`\nFound ${rows.length} organizations. Scraping deep profile data...\n`);

  for (const line of rows) {
    const [name, websiteUrl, aboutUrl, region, country] = line.split(",").map((s) => s?.trim());
    if (!websiteUrl) continue;

    const targetScrapeUrl = aboutUrl || websiteUrl;
    console.log(`📡 Fetching profile story for ${name} from: ${targetScrapeUrl}`);

    const html = await fetchHtml(targetScrapeUrl);
    const profile = extractFullProfile(html, targetScrapeUrl);
    const slug = slugify(name);

    await prisma.organization.upsert({
      where: { slug: slug },
      update: {
        website: websiteUrl,
        description: profile.description,
        region: region || "Himalayan Region",
        country: country || "India",
        logoUrl: profile.bannerUrl,
      },
      create: {
        name: name,
        slug: slug,
        country: country || "India",
        region: region || "Himalayan Region",
        website: websiteUrl,
        description: profile.description,
        logoUrl: profile.bannerUrl,
        verified: true,
      },
    });

    console.log(`✅ Saved complete showcase for: ${name}`);
  }

  console.log("\n All organization showcases are saved in Supabase!\n");
}

run()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());