import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

/**
 * 切换收藏状态
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const isFavorite = body.is_favorite;

  // 查找现有状态
  const { data: existing } = await supabaseAdmin
    .from("user_question_state")
    .select("*")
    .eq("question_id", id)
    .maybeSingle();

  if (existing) {
    const { data, error } = await supabaseAdmin
      .from("user_question_state")
      .update({
        is_favorite: isFavorite !== undefined ? isFavorite : !existing.is_favorite,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data);
  } else {
    const { data, error } = await supabaseAdmin
      .from("user_question_state")
      .insert({
        question_id: id,
        is_favorite: isFavorite !== undefined ? isFavorite : true,
        is_mastered: false,
        reviewed_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data, { status: 201 });
  }
}
