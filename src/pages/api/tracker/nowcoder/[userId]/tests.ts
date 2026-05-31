import type { APIRoute } from 'astro';
import { normalizeNowCoderUserId } from '@/lib/tracker/nowcoder';
import { fetchNowCoderSubmissionsFromPublicPage } from '@/lib/tracker/providers';

export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
  const userId = normalizeNowCoderUserId(params.userId ?? '');
  if (!userId || !/^\d+$/.test(userId)) {
    return Response.json({ error: '牛客 User ID 必须是个人主页或 ACM 竞赛主页中的数字 ID' }, { status: 400 });
  }

  try {
    const submissions = await fetchNowCoderSubmissionsFromPublicPage(userId);
    return Response.json({
      platform: 'nowcoder',
      userId,
      submissions,
    });
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : '牛客数据同步失败',
      },
      { status: 502 },
    );
  }
};
