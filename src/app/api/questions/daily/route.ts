import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

/**
 * 每日一题：基于日期 seed 伪随机选取
 */
export async function GET() {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  // 用日期字符串生成稳定的种子
  let seed = 0;
  for (let i = 0; i < today.length; i++) {
    seed = (seed * 31 + today.charCodeAt(i)) & 0x7fffffff;
  }

  // 获取所有题目 ID
  const { data: ids, error } = await supabaseAdmin
    .from("questions")
    .select("id");

  if (error || !ids || ids.length === 0) {
    return NextResponse.json({ error: "没有题目" }, { status: 404 });
  }

  const index = seed % ids.length;
  const dailyId = ids[index].id;

  const { data, error: detailError } = await supabaseAdmin
    .from("questions")
    .select(`*, category:categories(*), question_tags(tag:tags(*)), user_question_state(*)`)
    .eq("id", dailyId)
    .single();

  if (detailError) {
    return NextResponse.json({ error: detailError.message }, { status: 500 });
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

  return NextResponse.json(formatted);
}
