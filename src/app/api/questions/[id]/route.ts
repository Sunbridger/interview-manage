import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { data, error } = await supabaseAdmin
    .from("questions")
    .select(
      `*, category:categories(*), question_tags(tag:tags(*)), user_question_state(*)`
    )
    .eq("id", id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 });
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

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { title, content, answer, category_id, difficulty, source, tag_ids } =
    body;

  const { data, error } = await supabaseAdmin
    .from("questions")
    .update({
      title,
      content,
      answer,
      category_id: category_id || null,
      difficulty,
      source: source || null,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 更新标签关联：先删后插
  if (tag_ids !== undefined) {
    await supabaseAdmin.from("question_tags").delete().eq("question_id", id);
    if (tag_ids.length > 0) {
      const tagLinks = tag_ids.map((tagId: string) => ({
        question_id: id,
        tag_id: tagId,
      }));
      await supabaseAdmin.from("question_tags").insert(tagLinks);
    }
  }

  return NextResponse.json(data);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { error } = await supabaseAdmin
    .from("questions")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
