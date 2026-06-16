import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

// GET /api/annotations?questionId=xxx
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const questionId = searchParams.get("questionId");

  if (!questionId) {
    return NextResponse.json({ error: "questionId 必填" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("annotations")
    .select("*")
    .eq("question_id", questionId)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data || []);
}

// POST /api/annotations
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { question_id, block_id, content } = body;

  if (!question_id || !block_id || !content?.trim()) {
    return NextResponse.json({ error: "question_id, block_id, content 必填" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("annotations")
    .insert({ question_id, block_id, content: content.trim() })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}

// PUT /api/annotations?id=xxx
export async function PUT(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const id = searchParams.get("id");
  const body = await request.json();
  const { content } = body;

  if (!id || !content?.trim()) {
    return NextResponse.json({ error: "id 和 content 必填" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("annotations")
    .update({ content: content.trim(), updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// DELETE /api/annotations?id=xxx
export async function DELETE(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "id 必填" }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("annotations")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
