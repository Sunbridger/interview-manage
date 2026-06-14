"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { QuestionWithRelations } from "@/lib/types";
import { MarkdownRenderer } from "@/components/common/MarkdownRenderer";
import { DifficultyBadge } from "@/components/common/DifficultyBadge";
import { TagBadge } from "@/components/common/TagBadge";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  Star,
  CheckCircle2,
  Eye,
  EyeOff,
  Pencil,
  Trash2,
  ExternalLink,
} from "lucide-react";

interface QuestionDetailPanelProps {
  id: string;
}

export function QuestionDetailPanel({ id }: QuestionDetailPanelProps) {
  const router = useRouter();
  const [question, setQuestion] = useState<QuestionWithRelations | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAnswer, setShowAnswer] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isMastered, setIsMastered] = useState(false);

  useEffect(() => {
    setLoading(true);
    setShowAnswer(false);
    fetch(`/api/questions/${id}`)
      .then((res) => res.json())
      .then((data) => {
        if (!data.error) {
          setQuestion(data);
          setIsFavorite(data.user_state?.is_favorite || false);
          setIsMastered(data.user_state?.is_mastered || false);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  const toggleFavorite = async () => {
    const newVal = !isFavorite;
    setIsFavorite(newVal);
    await fetch(`/api/questions/${id}/favorite`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_favorite: newVal }),
    });
  };

  const toggleMastered = async () => {
    const newVal = !isMastered;
    setIsMastered(newVal);
    await fetch(`/api/questions/${id}/master`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_mastered: newVal }),
    });
  };

  const handleDelete = async () => {
    if (!confirm("确定要删除这道题目吗？")) return;
    await fetch(`/api/questions/${id}`, { method: "DELETE" });
    router.push("/questions");
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-border p-6 space-y-4">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!question) {
    return (
      <div className="bg-white rounded-xl border border-border p-6 text-center">
        <p className="text-sm text-muted-foreground">题目不存在</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-border overflow-hidden">
      {/* 标题区 */}
      <div className="p-5 border-b border-border">
        <div className="flex items-start justify-between gap-2 mb-3">
          <h2 className="text-lg font-bold text-foreground leading-snug flex-1">
            {question.title}
          </h2>
          <div className="flex items-center gap-1 shrink-0">
            <Link
              href={`/questions/${id}`}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-all"
              title="全屏查看"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <DifficultyBadge difficulty={question.difficulty} />
          {question.category && (
            <span className="text-xs px-2 py-0.5 rounded-md bg-accent text-muted-foreground">
              {question.category.name}
            </span>
          )}
          {question.source && (
            <span className="text-xs text-muted-foreground">
              来源：{question.source}
            </span>
          )}
        </div>
        {question.tags && question.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {question.tags.map((tag) => (
              <TagBadge key={tag.id} name={tag.name} />
            ))}
          </div>
        )}
      </div>

      {/* 内容 */}
      <div className="p-5 max-h-[400px] overflow-y-auto">
        <h3 className="text-sm font-semibold text-foreground mb-2">📋 题目描述</h3>
        <div className="prose prose-sm max-w-none">
          <MarkdownRenderer content={question.content || "暂无题目描述"} />
        </div>

        {/* 答案 */}
        <div className="mt-4 pt-4 border-t border-border">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-foreground">✅ 参考答案</h3>
            <button
              onClick={() => setShowAnswer(!showAnswer)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all"
            >
              {showAnswer ? (
                <><EyeOff className="w-3 h-3" />隐藏</>
              ) : (
                <><Eye className="w-3 h-3" />显示</>
              )}
            </button>
          </div>
          {showAnswer ? (
            <div className="prose prose-sm max-w-none">
              <MarkdownRenderer content={question.answer || "暂无参考答案"} />
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic">
              点击「显示」查看参考答案
            </p>
          )}
        </div>
      </div>

      {/* 操作 */}
      <div className="border-t border-border px-5 py-3 flex items-center gap-2">
        <button
          onClick={toggleFavorite}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
            isFavorite
              ? "bg-amber-50 border-amber-200 text-amber-700"
              : "border-border text-muted-foreground hover:border-amber-200 hover:text-amber-600"
          }`}
        >
          <Star className={`w-3.5 h-3.5 ${isFavorite ? "fill-amber-500 text-amber-500" : ""}`} />
          {isFavorite ? "已收藏" : "收藏"}
        </button>
        <button
          onClick={toggleMastered}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
            isMastered
              ? "bg-green-50 border-green-200 text-green-700"
              : "border-border text-muted-foreground hover:border-green-200 hover:text-green-600"
          }`}
        >
          <CheckCircle2 className={`w-3.5 h-3.5 ${isMastered ? "text-green-600" : ""}`} />
          {isMastered ? "已掌握" : "标记掌握"}
        </button>
        <div className="flex-1" />
        <Link
          href={`/questions/${id}/edit`}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-all"
        >
          <Pencil className="w-3 h-3" />
          编辑
        </Link>
        <button
          onClick={handleDelete}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-red-500 hover:bg-red-50 transition-all"
        >
          <Trash2 className="w-3 h-3" />
          删除
        </button>
      </div>
    </div>
  );
}
