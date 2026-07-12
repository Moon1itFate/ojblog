# OJ Tracker Cloud Sync

The tracker now has a production persistence layer designed for this single-author blog:

- The public `/tracker` page reads one shared snapshot from Netlify Blobs.
- The browser keeps a local copy as an offline fallback.
- Only a request carrying `TRACKER_ADMIN_TOKEN` may replace the public snapshot.
- `refresh-tracker` refreshes the configured accounts every six hours after deployment.

## Configure Netlify

In Netlify, open `Project configuration` -> `Environment variables` and create these variables with the `Functions` scope:

```text
TRACKER_ADMIN_TOKEN=<a long random value>
TRACKER_ACCOUNTS_JSON={"codeforces":"your-handle","atcoder":"your-id","nowcoder":"your-user-id","luogu":"your-uid"}
```

Generate the token with a password manager. Never prefix either variable with `PUBLIC_`, and never commit their real values.

Deploy after saving the variables. Netlify Blobs is provisioned for the site automatically; no separate database account or connection string is required.

## First Cloud Snapshot

1. Visit `/tracker` on the production domain.
2. Confirm the OJ account IDs.
3. Enter `TRACKER_ADMIN_TOKEN` into the `管理员同步密钥` field.
4. Select sync. The secret is used for that request only and is not saved in the browser.

You can also wait for the scheduled function. On the Netlify `Functions` page, find `refresh-tracker` and use `Run now` to test it after deployment. Its normal schedule is every six hours at minute 17 (UTC).

## Operational Notes

- The snapshot is intentionally one shared public profile, not a multi-user account system.
- A failed source does not erase a successful source's result from the same refresh; check the source chips and Netlify function logs for details.
- Netlify scheduled functions have a short execution limit. Keep the number of OJ accounts small, and move unusually slow or authenticated integrations to a background worker or dedicated database later.
