/**
 * 基于 2026 年 Git 活跃 Top 10 项目提炼的 10 道资深前端面试题
 * 运行: npx tsx scripts/seed-senior-fe.ts
 */
import fs from "fs";
import path from "path";

const BASE = "http://localhost:3000";

async function post(p: string, body: unknown) {
  const res = await fetch(`${BASE}${p}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Referer: BASE },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function ensureResource(type: "categories" | "tags", name: string, slug: string): Promise<string> {
  const list = await fetch(`http://localhost:3000/api/${type}`).then((r) => r.json());
  const existing = (list as { id: string; slug: string }[]).find((item) => item.slug === slug);
  if (existing) return existing.id;
  const created = await post(`/api/${type}`, { name, slug });
  return created.id;
}

async function main() {
  // 读取 JSON 数据
  const dataPath = path.join(__dirname, "senior-fe-questions.json");
  const questions: Array<{
    title: string;
    difficulty: string;
    content: string;
    answer: string;
    categoryName: string;
    categorySlug: string;
    tagNames: string[];
  }> = JSON.parse(fs.readFileSync(dataPath, "utf-8"));

  // 建立分类缓存
  const catCache: Record<string, string> = {};
  const getCatId = async (name: string, slug: string) => {
    if (!catCache[name]) catCache[name] = await ensureResource("categories", name, slug);
    return catCache[name];
  };

  // 建立标签缓存
  const tagCache: Record<string, string> = {};
  const getTagId = async (name: string) => {
    if (!tagCache[name]) {
      const slug = name.toLowerCase().replace(/[^a-z0-9一-龥]+/g, "-").replace(/^-|-$/g, "");
      tagCache[name] = await ensureResource("tags", name, slug);
    }
    return tagCache[name];
  };

  for (const q of questions) {
    const categoryId = await getCatId(q.categoryName, q.categorySlug);
    const tagIds = await Promise.all(q.tagNames.map(getTagId));

    console.log(`Creating: ${q.title.slice(0, 55)}...`);
    const result = await post("/api/questions", {
      title: q.title,
      content: q.content,
      answer: q.answer,
      difficulty: q.difficulty,
      category_id: categoryId,
      tag_ids: tagIds,
    });
    if (result.id) {
      console.log(`  OK: ${result.id}`);
    } else {
      console.log(`  FAIL: ${JSON.stringify(result)}`);
    }
  }
  console.log("\nDone. 10 senior frontend questions created.");
}

main().catch(console.error);
