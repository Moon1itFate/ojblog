import type { APIRoute } from 'astro';
import { normalizeLuoguUserId } from '@/lib/tracker/luogu';
import { fetchLuoguPracticeFromPublicPage } from '@/lib/tracker/providers';

export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
  const userId = normalizeLuoguUserId(params.userId ?? '');
  if (!userId || !/^\d+$/.test(userId)) {
    return Response.json({ error: '洛谷 UID 必须是个人主页中的数字 ID' }, { status: 400 });
  }

  try {
    const payload = await fetchLuoguPracticeFromPublicPage(userId);
    return Response.json({
      platform: 'luogu',
      userId,
      ...payload,
    });
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : '洛谷数据同步失败',
      },
      { status: 502 },
    );
  }
};
