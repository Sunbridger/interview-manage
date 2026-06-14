import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

/**
 * 每日一题：基于日期 seed 伪随机选取
 * 使用 count + offset 替代全表 ID 扫描
 */
export async function GET() {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  // 用日期字符串生成稳定的种子
  let seed = 0;
  for (let i = 0; i < today.length; i++) {
    seed = (seed * 31 + today.charCodeAt(i)) & 0x7fffffff;
  }

  // 获取总数（而非所有 ID）
  const { count, error: countError } = await supabaseAdmin
    .from("questions")
    .select("*", { count: "exact", head: true });

  if (countError || !count) {
    return NextResponse.json({ error: "没有题目" }, { status: 404 });
  }

  const offset = seed % count;

  // 直接用 offset 取一条
  const { data, error: detailError } = await supabaseAdmin
    .from("questions")
    .select(
      `*, category:categories(*), question_tags(tag:tags(*)), user_question_state(*)`
    )
    .order("created_at", { ascending: false })
    .range(offset, offset)
    .single();

  if (detailError || !data) {
    return NextResponse.json({ error: detailError?.message || "获取失败" }, { status: 500 });
  }

  const item = data as Record<string, unknown>;
  const formatted = {
    ...item,
    tags: (item.question_tags as Record<string, unknown>[])?.map(
      (qt: Record<string, unknown>) => qt.tag
    ),
    user_state: (item.user_question_state as unknown[])?.[0] || null,
    question_tags: undefined,
    daily_date: today,
  };

  const response = NextResponse.json(formatted);

  // 每天一换，CDN 缓存 1 小时
  response.headers.set(
    "Cache-Control",
    "public, s-maxage=3600, stale-while-revalidate=60"
  );

  return response;
}
