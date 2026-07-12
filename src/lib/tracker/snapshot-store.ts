import { getStore } from '@netlify/blobs';
import type { TrackerAccounts, TrackerSnapshot } from './types';

const STORE_NAME = 'ojblog-tracker';
const PUBLIC_SNAPSHOT_KEY = 'public-snapshot';

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isTrackerAccounts(value: unknown): value is TrackerAccounts {
  return isObject(value) && Object.values(value).every((handle) => typeof handle === 'string');
}

export function isTrackerSnapshot(value: unknown): value is TrackerSnapshot {
  if (!isObject(value)) return false;
  return (
    typeof value.fetchedAt === 'string' &&
    isTrackerAccounts(value.accounts) &&
    Array.isArray(value.submissions) &&
    Array.isArray(value.contests) &&
    Array.isArray(value.sources) &&
    !Number.isNaN(Date.parse(value.fetchedAt))
  );
}

function getTrackerStore() {
  return getStore(STORE_NAME);
}

export async function getPublicTrackerSnapshot(): Promise<TrackerSnapshot | null> {
  const snapshot = await getTrackerStore().get(PUBLIC_SNAPSHOT_KEY, { type: 'json' });
  return isTrackerSnapshot(snapshot) ? snapshot : null;
}

export async function savePublicTrackerSnapshot(snapshot: TrackerSnapshot) {
  await getTrackerStore().setJSON(PUBLIC_SNAPSHOT_KEY, snapshot);
}
