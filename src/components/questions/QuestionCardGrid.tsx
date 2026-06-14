"use client";

import Link from "next/link";
import { QuestionWithRelations } from "@/lib/types";
import { DifficultyBadge } from "@/components/common/DifficultyBadge";
import { Star } from "lucide-react";

const categoryGradients: Record<string, string> = {
  React: "from-blue-50 to-blue-100",
  LLM: "from-purple-50 to-purple-100",
  "Prompt Engineering": "from-pink-50 to-pink-100",
  RAG: "from-green-50 to-green-100",
  Agent: "from-amber-50 to-amber-100",
  工程化: "from-slate-50 to-slate-100",
};

const categoryEmojis: Record<string, string> = {
  React: "⚛️",
  LLM: "🤖",
  "Prompt Engineering": "📝",
  RAG: "🔍",
  Agent: "🧠",
  工程化: "🔧",
};

function getCardStyle(categoryName?: string) {
  const name = categoryName || "";
  return {
    gradient: categoryGradients[name] || "from-slate-50 to-slate-100",
    emoji: categoryEmojis[name] || "📌",
  };
}

interface QuestionCardGridProps {
  questions: QuestionWithRelations[];
}

export function QuestionCardGrid({ questions }: QuestionCardGridProps) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {questions.map((q) => {
        const { gradient, emoji } = getCardStyle(q.category?.name);
        return (
          <Link
            key={q.id}
            href={`/questions/${q.id}`}
            className="bg-white rounded-xl border border-border overflow-hidden hover:shadow-sm hover:border-primary/20 transition-all active:scale-[0.98]"
          >
            {/* 色块 */}
            <div
              className={`h-14 bg-gradient-to-br ${gradient} flex items-center justify-center text-2xl`}
            >
              {emoji}
            </div>
            {/* 信息 */}
            <div className="p-2.5">
              <h3 className="text-xs font-semibold text-foreground leading-snug line-clamp-2 mb-1.5">
                {q.title}
              </h3>
              <div className="flex flex-wrap items-center gap-1">
                <DifficultyBadge
                  difficulty={q.difficulty}
                  className="!text-[10px] !px-1.5 !py-0"
                />
                {q.category && (
                  <span className="text-[10px] px-1.5 py-0 rounded bg-accent text-muted-foreground">
                    {q.category.name}
                  </span>
                )}
                {q.user_state?.is_favorite && (
                  <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                )}
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
