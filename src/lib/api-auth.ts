import { supabaseAdmin } from "./supabase-admin";

/**
 * 校验 x-api-key 请求头
 * @param apiKey 请求头中的 x-api-key 值
 * @returns 是否有效
 */
export async function validateApiKey(apiKey: string | null): Promise<boolean> {
  if (!apiKey) return false;

  const { data, error } = await supabaseAdmin
    .from("api_keys")
    .select("id")
    .eq("key", apiKey)
    .eq("is_active", true)
    .maybeSingle();

  if (error || !data) return false;
  return true;
}

/**
 * 从 Request 中提取并校验 API Key
 */
export async function authenticateRequest(request: Request): Promise<boolean> {
  const apiKey = request.headers.get("x-api-key");
  return validateApiKey(apiKey);
}
