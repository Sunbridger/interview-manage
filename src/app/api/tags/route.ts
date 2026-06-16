import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("tags")
    .select("*")
    .order("name");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const response = NextResponse.json(data);

  // 标签数据极少变动，CDN 缓存 1 小时，stale 24 小时
  response.headers.set(
    "Cache-Control",
    "public, s-maxage=3600, stale-while-revalidate=86400"
  );

  return response;
}

export async function POST(request: Request) {
  const body = await request.json();
  const { name, slug } = body;

  if (!name || !slug) {
    return NextResponse.json({ error: "name 和 slug 必填" }, { status: 400 });
  }

  // 检查是否已存在
  const { data: existing } = await supabaseAdmin
    .from("tags")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (existing) {
    return NextResponse.json(existing);
  }

  const { data, error } = await supabaseAdmin
    .from("tags")
    .insert({ name, slug })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
