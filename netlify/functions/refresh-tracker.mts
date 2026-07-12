import type { Config } from '@netlify/functions';

function getAccounts() {
  const raw = process.env.TRACKER_ACCOUNTS_JSON;
  if (!raw) throw new Error('TRACKER_ACCOUNTS_JSON is not configured.');
  const accounts = JSON.parse(raw) as unknown;
  if (!accounts || typeof accounts !== 'object' || Array.isArray(accounts)) {
    throw new Error('TRACKER_ACCOUNTS_JSON must be a JSON object.');
  }
  return accounts;
}

export default async () => {
  const siteUrl = process.env.URL || process.env.DEPLOY_PRIME_URL;
  const adminToken = process.env.TRACKER_ADMIN_TOKEN;
  if (!siteUrl || !adminToken) {
    throw new Error('URL and TRACKER_ADMIN_TOKEN must be configured for scheduled tracker refreshes.');
  }

  const response = await fetch(new URL('/api/tracker/snapshot', siteUrl), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${adminToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ accounts: getAccounts() }),
  });

  if (!response.ok) {
    throw new Error(`Tracker refresh failed with HTTP ${response.status}: ${await response.text()}`);
  }
};

export const config: Config = {
  schedule: '17 */6 * * *',
};
