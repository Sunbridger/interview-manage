import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { validateApiKey } from "@/lib/api-auth";

/**
 * 代理：校验写入操作（POST/PUT/DELETE）的 x-api-key
 */
export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 只拦截 /api/questions 的写操作
  const isQuestionWrite =
    pathname.startsWith("/api/questions") &&
    ["POST", "PUT", "DELETE"].includes(request.method);

  if (!isQuestionWrite) {
    return NextResponse.next();
  }

  // 检查 x-api-key
  const apiKey = request.headers.get("x-api-key");

  // 如果来自同源（浏览器内调用），referer 检查
  const referer = request.headers.get("referer") || "";
  const host = request.headers.get("host") || "";
  if (referer.includes(host)) {
    // 同源请求放行
    return NextResponse.next();
  }

  // 外部请求需要校验 API Key
  if (!apiKey) {
    return NextResponse.json(
      { error: "缺少 x-api-key 请求头" },
      { status: 401 }
    );
  }

  const isValid = await validateApiKey(apiKey);
  if (!isValid) {
    return NextResponse.json(
      { error: "无效的 API Key" },
      { status: 403 }
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/api/questions/:path*",
};
