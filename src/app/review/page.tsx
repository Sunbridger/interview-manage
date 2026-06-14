"use client";

import { useState, useEffect, useCallback } from "react";
import { QuestionWithRelations } from "@/lib/types";
import { MarkdownRenderer } from "@/components/common/MarkdownRenderer";
import { DifficultyBadge } from "@/components/common/DifficultyBadge";
import { Skeleton } from "@/components/ui/Skeleton";
import { Shuffle, Calendar, Star, Eye, EyeOff, CheckCircle2, ArrowRight } from "lucide-react";

type ReviewMode = "random" | "daily" | "favorite";

export default function ReviewPage() {
  const [mode, setMode] = useState<ReviewMode>("random");
  const [question, setQuestion] = useState<QuestionWithRelations | null>(null);
  const [loading, setLoading] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);

  const loadQuestion = useCallback(async () => {
    setLoading(true);
    setShowAnswer(false);
    try {
      let url = "";
      switch (mode) {
        case "random":
          url = "/api/questions/random";
          break;
        case "daily":
          url = "/api/questions/daily";
          break;
        case "favorite": {
          const params = new URLSearchParams({ page: "1", limit: "100" });
          const res = await fetch(`/api/questions?${params}`);
          const json = await res.json();
          const favorites = (json.data || []).filter(
            (q: QuestionWithRelations) => q.user_state?.is_favorite
          );
          if (favorites.length > 0) {
            setQuestion(favorites[Math.floor(Math.random() * favorites.length)]);
          } else {
            setQuestion(null);
          }
          setLoading(false);
          return;
        }
      }
      const res = await fetch(url);
      const data = await res.json();
      setQuestion(data.error ? null : data);
    } catch {
      setQuestion(null);
    } finally {
      setLoading(false);
    }
  }, [mode]);

  useEffect(() => {
    loadQuestion();
  }, [loadQuestion]);

  const tabs: { mode: ReviewMode; label: string; icon: React.ReactNode }[] = [
    { mode: "random", label: "随机一题", icon: <Shuffle className="w-4 h-4" /> },
    { mode: "daily", label: "每日一题", icon: <Calendar className="w-4 h-4" /> },
    { mode: "favorite", label: "收藏回顾", icon: <Star className="w-4 h-4" /> },
  ];

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground mb-1">复习模式</h1>
        <p className="text-sm text-muted-foreground">
          选择一种模式开始复习
        </p>
      </div>

      {/* 模式切换 */}
      <div className="flex gap-2 bg-accent/50 rounded-xl p-1.5 w-fit">
        {tabs.map(({ mode: m, label, icon }) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              mode === m
                ? "bg-white text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {icon}
            {label}
          </button>
        ))}
      </div>

      {/* 题目卡片 */}
      {loading ? (
        <div className="bg-white rounded-xl border border-border p-8 space-y-4">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : !question ? (
        <div className="bg-white rounded-xl border border-border p-8 text-center">
          <p className="text-lg text-muted-foreground mb-2">
            {mode === "favorite" ? "暂无收藏的题目" : "暂无可用题目"}
          </p>
          <p className="text-sm text-muted-foreground">
            {mode === "favorite"
              ? "去题库收藏一些题目吧"
              : "请先在题库中添加题目"}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-border overflow-hidden">
          {/* 题目头 */}
          <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-border">
            <h2 className="text-xl font-semibold text-foreground mb-3">
              {question.title}
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              <DifficultyBadge difficulty={question.difficulty} />
              {question.category && (
                <span className="text-xs text-muted-foreground">
                  {question.category.name}
                </span>
              )}
            </div>
          </div>

          {/* 题目内容 */}
          <div className="p-6">
            <MarkdownRenderer content={question.content || "暂无题目描述"} />
          </div>

          {/* 答案区域 */}
          <div className="border-t border-border p-6">
            <button
              onClick={() => setShowAnswer(!showAnswer)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-white text-sm font-medium text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all mb-4"
            >
              {showAnswer ? (
                <>
                  <EyeOff className="w-4 h-4" />
                  隐藏答案
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4" />
                  显示答案
                </>
              )}
            </button>
            {showAnswer && (
              <div className="pt-4 border-t border-border">
                <MarkdownRenderer content={question.answer || "暂无参考答案"} />
              </div>
            )}
          </div>

          {/* 底部操作 */}
          <div className="border-t border-border px-6 py-4 flex items-center justify-between bg-accent/20">
            <button
              onClick={() => {
                fetch(`/api/questions/${question.id}/master`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ is_mastered: !question.user_state?.is_mastered }),
                });
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-muted-foreground hover:text-green-600 transition-colors"
            >
              <CheckCircle2 className="w-4 h-4" />
              {question.user_state?.is_mastered ? "已掌握" : "标记掌握"}
            </button>
            <button
              onClick={loadQuestion}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              下一题
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
