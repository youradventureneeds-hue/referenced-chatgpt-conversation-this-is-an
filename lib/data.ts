import type { Job, Organization } from "./types";

export const organizations: Organization[] = [
  { id: "org-nols", slug: "northern-ranges-outdoor-school", name: "Northern Ranges Outdoor School", country: "United States", description: "Expedition-based education, leadership development and wilderness courses.", focusAreas: ["Outdoor education", "Leadership", "Expeditions"], verified: true, website: "https://example.org" },
  { id: "org-pacific", slug: "pacific-pathways", name: "Pacific Pathways", country: "New Zealand", description: "Gap-year programmes connecting young people with conservation and adventure.", focusAreas: ["Gap year", "Conservation", "Adventure"], verified: true },
  { id: "org-alpine", slug: "alpine-guardians", name: "Alpine Guardians", country: "France", description: "Mountain stewardship and guided outdoor programmes across the Alps.", focusAreas: ["Conservation", "Mountain sports"], verified: false }
];

export const jobs: Job[] = [
  { id: "job-1", slug: "wilderness-instructor-wyoming", title: "Wilderness Field Instructor", summary: "Lead multi-week backpacking expeditions and build safe, inclusive learning communities.", location: "Lander, Wyoming", country: "United States", jobType: "SEASONAL", sponsorshipAvailable: false, visaEligibleCitizenships: ["United States", "J-1 eligible"], organization: { name: organizations[0].name, slug: organizations[0].slug, verified: true } },
  { id: "job-2", slug: "gap-year-coordinator-queenstown", title: "Gap-Year Programme Coordinator", summary: "Coordinate small-group adventure and volunteer placements for international participants.", location: "Queenstown", country: "New Zealand", jobType: "FULL_TIME", sponsorshipAvailable: true, visaEligibleCitizenships: ["New Zealand", "Australia", "Working Holiday eligible"], organization: { name: organizations[1].name, slug: organizations[1].slug, verified: true } },
  { id: "job-3", slug: "alpine-conservation-intern", title: "Alpine Conservation Intern", summary: "Support trail restoration and biodiversity monitoring in a high-mountain field team.", location: "Chamonix", country: "France", jobType: "INTERNSHIP", sponsorshipAvailable: false, visaEligibleCitizenships: ["EU/EEA", "France"], organization: { name: organizations[2].name, slug: organizations[2].slug, verified: false } }
];
