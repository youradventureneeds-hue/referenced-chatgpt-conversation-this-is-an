import { createHash } from "crypto";

export const sourceTypes = ["INSTAGRAM", "YOUTUBE", "WEBSITE", "NEWSLETTER", "JOB_BOARD", "CREATOR_SUBMISSION", "EMPLOYER_SUBMISSION"] as const;
export type SourceType = typeof sourceTypes[number];
export type IntakeStatus = "RECEIVED" | "EXTRACTED" | "DUPLICATE" | "NEEDS_REVIEW" | "APPROVED" | "REJECTED";
export type ExtractedOpportunity = { title: string; organization: string; location?: string; country?: string; jobType?: string; deadline?: string; eligibility?: string; confidence: number; summary: string };
export type IntakeItem = { id: string; sourceType: SourceType; sourceUrl?: string; rawText: string; status: IntakeStatus; fingerprint?: string; extraction?: ExtractedOpportunity; reviewNotes?: string; createdAt: string };

// Replace this adapter with your chosen AI provider. Keeping it deterministic lets
// the review queue work locally and ensures no opportunity is auto-published.
export function extractOpportunity(rawText: string): ExtractedOpportunity {
  const title = rawText.match(/(?:role|position|job)\s*[:\-]\s*([^\n.]+)/i)?.[1]?.trim() ?? rawText.split(/[\n.!]/)[0].slice(0, 90).trim();
  const organization = rawText.match(/(?:organization|employer|company)\s*[:\-]\s*([^\n.]+)/i)?.[1]?.trim() ?? "Needs verification";
  const location = rawText.match(/(?:location|based in)\s*[:\-]?\s*([^\n.]+)/i)?.[1]?.trim();
  const eligibility = rawText.match(/(?:eligibility|visa|citizenship)\s*[:\-]\s*([^\n.]+)/i)?.[1]?.trim();
  return { title, organization, location, eligibility, confidence: organization === "Needs verification" ? 0.48 : 0.78, summary: rawText.slice(0, 280) };
}
export function fingerprint(opportunity: ExtractedOpportunity) { return createHash("sha256").update(`${opportunity.title}|${opportunity.organization}|${opportunity.location ?? ""}`.toLowerCase()).digest("hex").slice(0, 18); }

export const demoIntake: IntakeItem[] = [
  { id: "intake-1", sourceType: "EMPLOYER_SUBMISSION", sourceUrl: "https://example.org/careers", rawText: "Role: Himalayan Trek Leader\nOrganization: Summit Roots\nLocation: Manali, Himachal Pradesh\nEligibility: Indian citizens or valid India work authorization\nLead small-group trekking expeditions.", status: "NEEDS_REVIEW", fingerprint: "demo-himalayan-001", extraction: { title: "Himalayan Trek Leader", organization: "Summit Roots", location: "Manali, Himachal Pradesh", country: "India", jobType: "SEASONAL", eligibility: "Indian citizens or valid India work authorization", confidence: 0.91, summary: "Lead small-group trekking expeditions." }, createdAt: "2026-09-26T08:00:00Z" },
  { id: "intake-2", sourceType: "INSTAGRAM", sourceUrl: "https://instagram.com/example", rawText: "Adventure camp hiring instructors for the winter season in Uttarakhand. Details in bio.", status: "NEEDS_REVIEW", fingerprint: "demo-uttarakhand-002", extraction: { title: "Adventure Camp Instructor", organization: "Needs verification", location: "Uttarakhand", country: "India", jobType: "SEASONAL", confidence: 0.52, summary: "Adventure camp hiring instructors for the winter season in Uttarakhand." }, createdAt: "2026-09-26T09:30:00Z" }
];
