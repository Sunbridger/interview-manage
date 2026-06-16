/**
 * 深度改写所有面试题答案
 * 运行: npx tsx scripts/deepen-answers.ts
 */
import { supabaseAdmin } from "../src/lib/supabase-admin";

type DeepAnswerMap = Record<string, string>;

async function main() {
  // 获取所有题目
  const { data: questions } = await supabaseAdmin
    .from("questions")
    .select("id, title")
    .limit(100);

  if (!questions) { console.log("No questions found"); return; }

  const titleMap = new Map(questions.map(q => [q.title, q.id]));
  console.log(`Found ${questions.length} questions`);

  const deepAnswers: DeepAnswerMap = {
  };

  let updated = 0;
  for (const [title, answer] of Object.entries(deepAnswers)) {
    const id = titleMap.get(title);
    if (id) {
      const { error } = await supabaseAdmin
        .from("questions")
        .update({ answer: answer.trim() })
        .eq("id", id);
      if (!error) {
        updated++;
        console.log(`  OK: ${title.slice(0, 50)}`);
      } else {
        console.log(`  ERR: ${title.slice(0, 50)} - ${error.message}`);
      }
    }
  }

  console.log(`\nUpdated ${updated}/${Object.keys(deepAnswers).length}`);
}

main().catch(console.error);
