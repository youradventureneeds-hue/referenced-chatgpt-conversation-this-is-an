# Global employer directory

The global extension records independent outdoor centres, camps, experiential
education providers, and adventure operators with official evidence of employing
educators, counsellors, activity instructors, guides, or similar field staff.
`data/global-organizations.json` contains the reviewed records and evidence URLs.

An organization is not an assertion of a currently open vacancy. Profiles and
directory counts use approved, published job records exclusively. Current
vacancies remain subject to source verification by the weekly importer.
Some organizations provide recruitment pages; others confirm relevant staff roles
without a public hiring portal. Those employers have no invented careers URL.

All descriptions have one paragraph of exactly 60 whitespace-separated words.
Website and recruitment links are checked separately. Anti-bot responses are
recorded as source limitations and are not bypassed. Brand assets are stored
locally with provenance in `data/organization-logos.json`; missing assets use
initials. Research does not imply an employer partnership or endorsement.

Run `pnpm db:global` to preview new records or `pnpm db:global --write` to import.
Importing is repeatable and preserves existing organizations, descriptions, and
published jobs. New employers are included in the weekly directory scan whenever
they have a supported public source; a directory entry does not guarantee that
its website can be scraped automatically.

This is a documented global expansion, not a claim that every outdoor employer
on earth has been found. Small providers, changing companies, non-public hiring,
and additional language markets prevent a complete worldwide census. New
records should meet the same evidence and duplicate checks before inclusion.
