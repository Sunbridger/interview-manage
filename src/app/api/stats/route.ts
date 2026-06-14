import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  // 总数
  const { count: total, error: totalError } = await supabaseAdmin
    .from("questions")
    .select("*", { count: "exact", head: true });

  // 掌握数
  const { count: mastered, error: masteredError } = await supabaseAdmin
    .from("user_question_state")
    .select("*", { count: "exact", head: true })
    .eq("is_mastered", true);

  // 收藏数
  const { count: favorite, error: favoriteError } = await supabaseAdmin
    .from("user_question_state")
    .select("*", { count: "exact", head: true })
    .eq("is_favorite", true);

  // 按分类统计
  const { data: byCategory, error: catError } = await supabaseAdmin
    .from("questions")
    .select(`category_id, category:categories(name)`)
    .not("category_id", "is", null);

  // 按难度统计
  const { data: byDifficulty, error: diffError } = await supabaseAdmin
    .from("questions")
    .select("difficulty");

  if (totalError || masteredError || favoriteError) {
    return NextResponse.json({ error: "统计查询失败" }, { status: 500 });
  }

  // 聚合分类统计
  const catMap = new Map<string, { category_id: string; category_name: string; count: number }>();
  (byCategory || []).forEach((q: Record<string, unknown>) => {
    const cid = q.category_id as string;
    const cname = (q.category as { name: string })?.name || "未分类";
    if (!catMap.has(cid)) {
      catMap.set(cid, { category_id: cid, category_name: cname, count: 0 });
    }
    catMap.get(cid)!.count++;
  });

  // 聚合难度统计
  const diffMap = new Map<string, number>();
  (byDifficulty || []).forEach((q: { difficulty: string }) => {
    diffMap.set(q.difficulty, (diffMap.get(q.difficulty) || 0) + 1);
  });

  return NextResponse.json({
    total_questions: total || 0,
    mastered_count: mastered || 0,
    favorite_count: favorite || 0,
    by_category: Array.from(catMap.values()).sort((a, b) => b.count - a.count),
    by_difficulty: Array.from(diffMap.entries()).map(([difficulty, count]) => ({
      difficulty,
      count,
    })),
  });
}
