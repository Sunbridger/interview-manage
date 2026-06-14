import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { PAGE_SIZE } from "@/lib/constants";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const search = searchParams.get("search") || "";
  const category = searchParams.get("category") || "";
  const difficulty = searchParams.get("difficulty") || "";
  const tag = searchParams.get("tag") || "";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || String(PAGE_SIZE));
  const offset = (page - 1) * limit;

  let query = supabaseAdmin
    .from("questions")
    .select(
      `*, category:categories(*), question_tags(tag:tags(*)), user_question_state(*)`,
      { count: "exact" }
    );

  // 关键词搜索
  if (search) {
    query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%`);
  }

  // 分类筛选
  if (category) {
    query = query.eq("category.slug", category);
  }

  // 难度筛选
  if (difficulty) {
    query = query.eq("difficulty", difficulty);
  }

  // 标签筛选
  if (tag) {
    query = query.eq("question_tags.tag.slug", tag);
  }

  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 整理格式
  const formatted = (data || []).map((item: Record<string, unknown>) => ({
    ...item,
    tags: (item.question_tags as Record<string, unknown>[])?.map(
      (qt: Record<string, unknown>) => qt.tag
    ),
    user_state: (item.user_question_state as unknown[])?.[0] || null,
    question_tags: undefined,
  }));

  return NextResponse.json({
    data: formatted,
    total: count || 0,
    page,
    limit,
    totalPages: Math.ceil((count || 0) / limit),
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { title, content, answer, category_id, difficulty, source, tag_ids } =
    body;

  if (!title) {
    return NextResponse.json({ error: "标题不能为空" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("questions")
    .insert({
      title,
      content: content || "",
      answer: answer || "",
      category_id: category_id || null,
      difficulty: difficulty || "medium",
      source: source || null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 处理标签关联
  if (tag_ids && tag_ids.length > 0) {
    const tagLinks = tag_ids.map((tagId: string) => ({
      question_id: data.id,
      tag_id: tagId,
    }));
    await supabaseAdmin.from("question_tags").insert(tagLinks);
  }

  return NextResponse.json(data, { status: 201 });
}
