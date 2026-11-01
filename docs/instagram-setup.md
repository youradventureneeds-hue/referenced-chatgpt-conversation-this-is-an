# Instagram recruitment collection

## Current state

The collector and protected review workflow are implemented. No Instagram account
is connected yet. The cloud workflow is manual-only until Meta account setup,
authorization, public contact details, and a successful preview/write test are
complete. Do not describe this as live Instagram scraping before those steps pass.

Organization handles are derived from links on their official websites, with the
evidence URLs in `data/instagram-sources.json`. Hosting/designer/template handles
are excluded. A shared parent account is not assigned automatically to one camp.
Actual API eligibility remains subject to Meta's response and granted access.
The managed account username is an environment variable, not a public config value.

## What is supported

* Connected authorized professional account: recent posts, reels, and active stories.
* Eligible public organization professional accounts: posts and reels through
  Facebook Login Business Discovery. Other organizations' stories are not requested.
  Adding more authorized story sources would require their account authorization.
* Caption-based recruitment filtering, stable media-ID deduplication, source links,
  review-only intake, and explicit story expiry after 24 hours.
* No Instagram passwords, DMs, private-profile access, browser-login scraping,
  CAPTCHA solving, proxy rotation, video downloading, or media republication.
* Visual text and spoken audio are not OCR/transcribed. Stories and image/video
  details need human review; missing story permalinks link to the profile instead
  of inventing a URL from an API identifier.

## Account setup

1. Open https://developers.facebook.com/ and choose **Login**, then **Continue with
   Facebook**. The direct Apps link may show a broken page before signing in.
   Complete developer registration and any phone/identity steps yourself.
2. The Instagram account must be Business or Creator. Professional accounts are
   public. Keep a personal account private by using a separate professional account
   if that is preferable. Link the professional account to a Facebook Page for the
   Facebook Login API used here.
3. Create a Meta app for the website's Instagram integration. Use its current
   Instagram API with Facebook Login setup and the read access required for owned
   media, stories, and Business Discovery. Do not request publishing or messaging
   access for this collector. Meta determines the exact current permissions,
   Business Verification, and App Review requirements for external-account access.
4. Use the app's authorized token flow/API Explorer to obtain a read token and the
   numeric Instagram professional account ID. A username or Facebook Page ID is
   not a substitute for that ID. Check the supported API version in the dashboard.
5. Publish a real public support contact and configure the privacy URL
   `https://indiabeyondbounds-india-beyond-bounds.vercel.app/privacy` and deletion
   instructions URL ending `/data-deletion` in the app where required.

## Configuration

Set these encrypted Actions secrets: `INSTAGRAM_ACCESS_TOKEN`,
`INSTAGRAM_ACCOUNT_ID`, `INSTAGRAM_USERNAME`, `INSTAGRAM_API_VERSION`,
`ADMIN_REVIEW_KEY`, and the existing `DATABASE_URL`. Set `PUBLIC_SUPPORT_EMAIL` as
a repository variable. Configure the identical `ADMIN_REVIEW_KEY` and
`PUBLIC_SUPPORT_EMAIL` in Vercel. The administrator key must be random, at least
32 characters, and must never be committed or printed in reports.

Tokens are server-side bearer headers and are not placed in URLs or persisted in
intake records. The collector never follows `paging.next` URLs, which can contain
tokens. Preview reports contain counts and source health, not captions, tokens,
or media URLs. Authorization expiry is a failure, not proof that jobs closed.

## First run

Run `pnpm test:instagram` and `pnpm test:admin`. Run `pnpm instagram:sync` to preview.
Use `--username example` for one configured external source or `--limit 25` for a
bounded batch. `--write` saves only review leads and first checks that anonymous
review API access is refused, the administrator key works, and the privacy contact
has actually been published. No lead is automatically published as a job.

The cloud workflow is **Instagram recruitment collection**. Start with its preview
input, then a write run. It rotates a maximum of 25 external sources per write run
using a non-sensitive cursor cache and requests the latest 25 media per edge.
Once authorization is tested, enable a roughly six-hour cloud schedule to sample
active stories before they expire. A weekly-only schedule cannot cover stories.
Higher-volume accounts may need more pagination and quota planning; this is not
an unlimited historical archive.

Sign in at `/admin` using the private administrator key. Verify and edit the title,
existing employer, job country, work type, summary, and application URL before
approval. Expired stories require a current verified official application URL.
Unknown work types/countries remain unspecified. No employer, seasonality, or
visa sponsorship is invented from a social-media caption.

## Removal requests

Verify the requester's authority. Add the username to the deployed
`INSTAGRAM_EXCLUDED_USERNAMES` secret first; revoke connected access if applicable.
Then preview `node scripts/deleteInstagramData.mjs --username example`. Use
`--write` only for the verified requested removal. This removes matching review
records and withdraws/redacts associated Instagram listings while preserving
unrelated candidate application records and manually managed jobs. It refuses
to delete unless the account is explicitly excluded from future collection.

## Primary references

* https://developers.facebook.com/docs/instagram-platform/
* https://developers.facebook.com/docs/instagram-platform/instagram-api-with-facebook-login/business-discovery/
* https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-user/stories/
* https://www.postman.com/meta/instagram/documentation/6yqw8pt/instagram-api
