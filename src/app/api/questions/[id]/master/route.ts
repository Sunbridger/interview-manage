import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

/**
 * 切换已掌握状态
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const isMastered = body.is_mastered;

  const { data: existing } = await supabaseAdmin
    .from("user_question_state")
    .select("*")
    .eq("question_id", id)
    .maybeSingle();

  if (existing) {
    const { data, error } = await supabaseAdmin
      .from("user_question_state")
      .update({
        is_mastered: isMastered !== undefined ? isMastered : !existing.is_mastered,
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
        is_favorite: false,
        is_mastered: isMastered !== undefined ? isMastered : true,
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
