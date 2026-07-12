import type { APIRoute } from 'astro';
import { normalizeTrackerAccounts, syncTrackerData } from '@/lib/tracker/providers';
import { getPublicTrackerSnapshot, isTrackerSnapshot, savePublicTrackerSnapshot } from '@/lib/tracker/snapshot-store';
import type { TrackerAccounts } from '@/lib/tracker/types';

export const prerender = false;

function hasValidAdminToken(request: Request) {
  const configuredToken = process.env.TRACKER_ADMIN_TOKEN;
  const providedToken = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  return Boolean(configuredToken && providedToken && configuredToken === providedToken);
}

function parseAccounts(value: unknown): TrackerAccounts | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  if (!Object.values(value).every((handle) => typeof handle === 'string')) return null;
  return normalizeTrackerAccounts(value as TrackerAccounts);
}

function unavailableResponse(error: unknown) {
  return Response.json(
    {
      error: error instanceof Error ? `云端刷题存储暂不可用：${error.message}` : '云端刷题存储暂不可用，请稍后重试。',
    },
    { status: 503 },
  );
}

export const GET: APIRoute = async () => {
  try {
    const snapshot = await getPublicTrackerSnapshot();
    return Response.json({ snapshot }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return unavailableResponse(error);
  }
};

export const POST: APIRoute = async ({ request }) => {
  if (!hasValidAdminToken(request)) {
    return Response.json({ error: '管理员同步密钥无效。' }, { status: 401 });
  }

  try {
    const body = (await request.json()) as { accounts?: unknown; snapshot?: unknown };
    const accounts = parseAccounts(body.accounts);
    if (!accounts || Object.keys(accounts).length === 0) {
      return Response.json({ error: '请至少提供一个有效的 OJ 账号。' }, { status: 400 });
    }

    const snapshot = isTrackerSnapshot(body.snapshot) ? body.snapshot : await syncTrackerData(accounts, { server: true });
    if (JSON.stringify(snapshot.accounts) !== JSON.stringify(accounts)) {
      return Response.json({ error: '快照账号与本次同步账号不一致。' }, { status: 400 });
    }

    await savePublicTrackerSnapshot(snapshot);
    return Response.json({ snapshot }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return unavailableResponse(error);
  }
};
