"use client";

import { use } from "react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { QuestionForm } from "@/components/questions/QuestionForm";
import { QuestionWithRelations, QuestionFormData } from "@/lib/types";
import { Skeleton } from "@/components/ui/Skeleton";

export default function EditQuestionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [question, setQuestion] = useState<QuestionWithRelations | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/questions/${id}`)
      .then((res) => res.json())
      .then((data) => {
        setQuestion(data.error ? null : data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  const handleSubmit = async (data: QuestionFormData) => {
    const res = await fetch(`/api/questions/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      router.push(`/questions/${id}`);
    } else {
      const err = await res.json();
      alert(err.error || "更新失败");
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!question) {
    return (
      <div className="text-center py-16">
        <p className="text-lg text-muted-foreground">题目不存在</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 lg:space-y-6 max-w-full">
      <div>
        <h1 className="text-xl lg:text-2xl font-bold text-foreground mb-1">编辑面试题</h1>
        <p className="text-xs lg:text-sm text-muted-foreground">
          修改题目和答案内容
        </p>
      </div>
      <div className="bg-white rounded-xl border border-border p-4 lg:p-6">
        <QuestionForm
          initialData={question}
          onSubmit={handleSubmit}
          submitLabel="保存修改"
        />
      </div>
    </div>
  );
}
