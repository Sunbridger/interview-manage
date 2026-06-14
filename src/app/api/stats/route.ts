import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export async function GET() {
  // 并行查询：总数 + 状态统计 + 分组统计
  const [totalRes, masteredRes, favRes, catRes, diffRes] = await Promise.all([
    supabaseAdmin.from("questions").select("*", { count: "exact", head: true }),
    supabaseAdmin
      .from("user_question_state")
      .select("*", { count: "exact", head: true })
      .eq("is_mastered", true),
    supabaseAdmin
      .from("user_question_state")
      .select("*", { count: "exact", head: true })
      .eq("is_favorite", true),
    // 用 GROUP BY 替代全表扫描 + JS 聚合
    supabaseAdmin.rpc("get_category_stats") as unknown as Promise<{
      data: { category_id: string; category_name: string; count: number }[] | null;
      error: Error | null;
    }>,
    supabaseAdmin.rpc("get_difficulty_stats") as unknown as Promise<{
      data: { difficulty: string; count: number }[] | null;
      error: Error | null;
    }>,
  ]);

  if (totalRes.error || masteredRes.error || favRes.error) {
    return NextResponse.json({ error: "统计查询失败" }, { status: 500 });
  }

  // 降级：如果 RPC 不可用，使用原始查询 + JS 聚合
  let byCategory: { category_id: string; category_name: string; count: number }[];
  let byDifficulty: { difficulty: string; count: number }[];

  if (catRes.error || !catRes.data) {
    // Fallback: 原始查询 + JS 聚合
    const { data: rawCat } = await supabaseAdmin
      .from("questions")
      .select(`category_id, category:categories(name)`)
      .not("category_id", "is", null);
    const catMap = new Map<string, { category_id: string; category_name: string; count: number }>();
    (rawCat || []).forEach((q: Record<string, unknown>) => {
      const cid = q.category_id as string;
      const cname = (q.category as { name: string })?.name || "未分类";
      if (!catMap.has(cid)) {
        catMap.set(cid, { category_id: cid, category_name: cname, count: 0 });
      }
      catMap.get(cid)!.count++;
    });
    byCategory = Array.from(catMap.values()).sort((a, b) => b.count - a.count);
  } else {
    byCategory = catRes.data;
  }

  if (diffRes.error || !diffRes.data) {
    const { data: rawDiff } = await supabaseAdmin.from("questions").select("difficulty");
    const diffMap = new Map<string, number>();
    (rawDiff || []).forEach((q: { difficulty: string }) => {
      diffMap.set(q.difficulty, (diffMap.get(q.difficulty) || 0) + 1);
    });
    byDifficulty = Array.from(diffMap.entries()).map(([difficulty, count]) => ({
      difficulty,
      count,
    }));
  } else {
    byDifficulty = diffRes.data;
  }

  const response = NextResponse.json({
    total_questions: totalRes.count || 0,
    mastered_count: masteredRes.count || 0,
    favorite_count: favRes.count || 0,
    by_category: byCategory,
    by_difficulty: byDifficulty,
  });

  // CDN 缓存 30s，stale 状态下最多 5 分钟
  response.headers.set(
    "Cache-Control",
    "public, s-maxage=30, stale-while-revalidate=300"
  );

  return response;
}
