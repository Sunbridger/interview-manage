"use client";

import Link from "next/link";
import { QuestionWithRelations } from "@/lib/types";
import { DifficultyBadge } from "@/components/common/DifficultyBadge";
import { TagBadge } from "@/components/common/TagBadge";
import { Star } from "lucide-react";

interface QuestionCardProps {
  question: QuestionWithRelations;
}

export function QuestionCard({ question }: QuestionCardProps) {
  return (
    <Link
      href={`/questions/${question.id}`}
      className="block bg-white rounded-xl border border-border p-5 hover:shadow-md hover:border-primary/30 transition-all group"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2 flex-1">
          {question.title}
        </h3>
        {question.user_state?.is_favorite && (
          <Star className="w-4 h-4 text-amber-500 fill-amber-500 shrink-0 mt-0.5" />
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-3">
        <DifficultyBadge difficulty={question.difficulty} />
        {question.category && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-600">
            {question.category.name}
          </span>
        )}
        {question.user_state?.is_mastered && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-green-50 text-green-600">
            已掌握
          </span>
        )}
      </div>

      {question.tags && question.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {question.tags.map((tag) => (
            <TagBadge key={tag.id} name={tag.name} />
          ))}
        </div>
      )}
    </Link>
  );
}
