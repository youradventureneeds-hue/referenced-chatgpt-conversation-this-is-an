# Instagram recruitment administration

Open `/admin/instagram` and sign in using the private administrator key. `/admin` contains the queue where you verify, edit, approve, or reject leads. New leads never publish automatically. Approved jobs link to their selected organization.

The Instagram panel supports manual scans, India or worldwide sources, automatic collection every 6, 12, or 24 hours, employer handles and official website evidence, organization mapping, new organization pages, connection updates, source failures, and scan history.

The GitHub workflow checks for due work every 15 minutes while your laptop is off. GitHub can delay scheduled runs. Each scan reads the latest 25 items per account. Account progress is persisted and a database lease prevents overlapping execution. Queued scans continue in the cloud after you close the page. Duplicate fingerprints and previously reviewed post URLs are skipped.

Meta permits discovery of accessible public professional-account posts and reels. Only your connected account's stories are available. Private accounts, other employers' stories, and text only inside images or videos are not read. Coverage cannot include every outdoor vacancy.

## Replace expired access yourself

Open the panel's Meta Graph API Explorer link for app 1430683145936095. Generate a read token for the Facebook Page linked to @youradventureneeds, with instagram_basic, instagram_manage_insights, pages_show_list, and pages_read_engagement. Use Meta’s Access Token Debugger to check expiry and, when available, Extend Access Token. Save the extended token and the expiry shown by Meta. Save it in Connection settings, including expiry when known. The server verifies the account identity and encrypts the token. Re-enable the schedule if authorization failure paused it. Tokens may expire or be revoked; the site cannot bypass Meta authorization. Do not send tokens through support messages or commits.

## Deployment and recovery

Vercel requires DATABASE_URL, DIRECT_URL, ADMIN_REVIEW_KEY (32 or more random characters), and INSTAGRAM_ENCRYPTION_KEY (32 random bytes encoded as base64url). Actions needs the same database and encryption key. Do not rotate encryption without reconnecting or re-encrypting the saved token. Changing the admin key invalidates old sessions.

Apply the additive Prisma migration before deployment. Run the workflow once with initialize=true to seed sources and initial INSTAGRAM_* secrets. Initialization preserves later website edits. Future scans use the encrypted database token.

Keep the admin key in a password manager. If lost, replace ADMIN_REVIEW_KEY in Vercel's environment settings and redeploy. Check GitHub Actions if the heartbeat stops. GitHub may disable scheduled workflows on inactive public repositories; re-enable the workflow in Actions.

Privacy and deletion contact: youradventureneeds@gmail.com, also published at /privacy and /data-deletion.
