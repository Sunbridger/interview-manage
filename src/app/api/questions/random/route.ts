import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

/**
 * 随机一题：使用 count + offset 替代获取 ID 列表
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const category = searchParams.get("category") || "";
  const difficulty = searchParams.get("difficulty") || "";

  // 构建筛选条件获取总数
  let countQuery = supabaseAdmin
    .from("questions")
    .select("*", { count: "exact", head: true });

  if (category) {
    countQuery = countQuery.eq("category.slug", category);
  }
  if (difficulty) {
    countQuery = countQuery.eq("difficulty", difficulty);
  }

  const { count, error: countError } = await countQuery;

  if (countError || !count) {
    return NextResponse.json({ error: "没有符合条件的题目" }, { status: 404 });
  }

  const randomOffset = Math.floor(Math.random() * count);

  // 直接 offset 取一条
  let dataQuery = supabaseAdmin
    .from("questions")
    .select(
      `*, category:categories(*), question_tags(tag:tags(*)), user_question_state(*)`
    );

  if (category) {
    dataQuery = dataQuery.eq("category.slug", category);
  }
  if (difficulty) {
    dataQuery = dataQuery.eq("difficulty", difficulty);
  }

  const { data, error: detailError } = await dataQuery
    .order("created_at", { ascending: false })
    .range(randomOffset, randomOffset)
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
  };

  const response = NextResponse.json(formatted);

  // 每次随机，短缓存
  response.headers.set(
    "Cache-Control",
    "public, s-maxage=5, stale-while-revalidate=30"
  );

  return response;
}
