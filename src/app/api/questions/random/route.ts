import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const category = searchParams.get("category") || "";
  const difficulty = searchParams.get("difficulty") || "";

  let query = supabaseAdmin
    .from("questions")
    .select("id")
    .limit(100);

  if (category) {
    query = query.eq("category.slug", category);
  }
  if (difficulty) {
    query = query.eq("difficulty", difficulty);
  }

  const { data: ids, error } = await query;

  if (error || !ids || ids.length === 0) {
    return NextResponse.json({ error: "没有符合条件的题目" }, { status: 404 });
  }

  const randomIndex = Math.floor(Math.random() * ids.length);
  const randomId = ids[randomIndex].id;

  // 获取完整数据
  const { data, error: detailError } = await supabaseAdmin
    .from("questions")
    .select(`*, category:categories(*), question_tags(tag:tags(*)), user_question_state(*)`)
    .eq("id", randomId)
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
  };

  return NextResponse.json(formatted);
}
