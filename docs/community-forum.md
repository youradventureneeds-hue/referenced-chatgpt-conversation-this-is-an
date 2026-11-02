# Outdoor community forum

The public forum is `/forum`; individual discussions are `/forum/<id>`. Anyone can read visible discussions. Existing candidate and employer accounts can participate after choosing a separate public handle. Forum responses never publish an account's email, name, CV link, or private candidate workspace. Handles are normalized, unique, and set once; handle changes require the site owner.

Topics support categories, search, pagination, chronological replies, editing by their author, and removal of the author's text. A discussion displays the latest 50 replies; Earlier replies loads the previous page without losing the reply draft. Live refreshes preserve the composer and avoid moving readers who are reading earlier messages. Draft submission IDs are bound to the account and discussion to prevent duplicate posts after retries.

## Live updates

The browser opens `/api/forum/stream` using EventSource. The Node route sends bounded Server-Sent Events and automatically reconnects after approximately 25 seconds. Every two seconds it checks a central database revision, cached for up to one second per function instance. Committed public changes cause a revision notification; each reader then fetches a fresh public snapshot. New replies normally arrive within roughly two to three seconds without refreshing the page. Connections close in hidden browser tabs and on cancellation. If streaming fails, visible pages fall back to five-second refreshes while reconnecting.

The notification channel contains revision numbers only. It does not send private account information, reports, or hidden content. Full public snapshots after reconnect avoid relying on replay of every notification. Serverless invocations are bounded and do not depend on shared process memory for correctness. This implementation requires no third-party real-time service or new provider secrets. Traffic consumes the existing Vercel function and database quotas; a higher-volume community may warrant a dedicated pub/sub service.

## Posting and moderation

Posting requires the existing session, a valid forum handle, a same-origin request, and an account that is not suspended. Current limits include five new topics per account per hour, 120 replies per hour, 30 edits/removals per hour, five reports per hour, and a broader network limit. Reports do not automatically hide posts. A member can report an opening or reply; repeated reports use one case for that member and target, and a renewed concern reopens the case.

The site owner uses `/admin/forum` with the existing private administrator sign-in. It offers reports, recent discussions, hidden discussions and replies, suspensions, and moderation history. The owner can pin/unpin, lock/unlock, hide/restore discussions and replies, suspend/restore posting access, and resolve reports. Forum suspension does not disable candidate or employer accounts. Reports refresh every 15 seconds while the moderation page is visible.

The moderation lists are bounded: 100 open reports, 50 recent discussions, up to 100 hidden discussions/replies and suspensions, and 50 recent log entries. Public endpoints exclude hidden topics and replies, including counts and pagination. Conditional transactional writes ensure a discussion locked before a reply commits cannot receive that new reply. Moderation notes and audit records stay private.

Removal by an author erases that author's text. An opening becomes a closed tombstone and leaves other members' replies intact; reply removal leaves a placeholder. Removing an account disconnects its handle from remaining posts. Moderation hiding is reversible; author-erased text is not restored by unhiding. No file uploads, private messages, automatic employer verification badges, or email notifications are included.

## Deployment and validation

Apply `prisma/migrations/20261102120000_community_forum/migration.sql`, then deploy the generated Prisma client. It adds forum members, topics, replies, reports, a revision counter, and moderation logs. Existing job, organization, account, and scraper records remain intact. No synthetic forum members or discussions are seeded into production.

`pnpm test:forum` checks public projections, handle validation, account-bound retry keys, permitted return paths, revision delivery, abort/cancellation cleanup, and failure redaction. The isolated account integration suite also exercises the public/member/moderator routes, two-account live notification delivery, idempotent replies, ownership checks, reporting, restoration, locks, suspension, history pagination, and account deletion. The GitHub account/community workflow runs these checks using its own PostgreSQL service before building the website.
