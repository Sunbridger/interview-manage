"use client";

import { useRouter } from "next/navigation";
import { QuestionForm } from "@/components/questions/QuestionForm";
import { QuestionFormData } from "@/lib/types";

export default function NewQuestionPage() {
  const router = useRouter();

  const handleSubmit = async (data: QuestionFormData) => {
    const res = await fetch("/api/questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      const created = await res.json();
      router.push(`/questions/${created.id}`);
    } else {
      const err = await res.json();
      alert(err.error || "创建失败");
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground mb-1">新增面试题</h1>
        <p className="text-sm text-muted-foreground">
          使用 Markdown 格式编写题目和答案
        </p>
      </div>
      <div className="bg-white rounded-xl border border-border p-6">
        <QuestionForm onSubmit={handleSubmit} submitLabel="创建题目" />
      </div>
    </div>
  );
}
