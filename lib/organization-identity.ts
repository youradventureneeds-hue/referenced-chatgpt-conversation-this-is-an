import logos from "@/data/organization-logos.json";
import websites from "@/data/organization-websites.json";

type Logo = { src: string; darkBackground?: boolean };
export function organizationIdentity(org: { slug: string; website?: string | null; logoUrl?: string | null }) {
  const logo = (logos as Record<string, Logo>)[org.slug];
  return {
    website: (websites as Record<string, string>)[org.slug] || org.website || null,
    logo: logo?.src || org.logoUrl || null,
    darkBackground: logo?.darkBackground || false,
  };
}
