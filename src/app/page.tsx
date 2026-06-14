"use client";

import { useState, useEffect } from "react";
import { StatsCards } from "@/components/stats/StatsCards";
import Link from "next/link";
import { QuestionWithRelations } from "@/lib/types";
import { DifficultyBadge } from "@/components/common/DifficultyBadge";
import { Skeleton } from "@/components/ui/Skeleton";

export default function DashboardPage() {
  return (
    <div className="space-y-8 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground mb-1">仪表盘</h1>
        <p className="text-sm text-muted-foreground">
          前端 AI Agent 面试知识库概览
        </p>
      </div>

      <StatsCards />

      {/* 快捷入口 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <QuickLink
          href="/questions"
          title="📚 浏览题库"
          desc="按分类、标签、难度筛选面试题"
        />
        <QuickLink
          href="/review"
          title="🧠 开始复习"
          desc="随机一题 / 每日一题 / 收藏回顾"
        />
        <QuickLink
          href="/questions/new"
          title="➕ 新增题目"
          desc="用 Markdown 编辑器录入新面试题"
        />
      </div>

      {/* 每日一题 */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100 p-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-lg">📅</span>
          <h2 className="font-semibold text-foreground">每日一题</h2>
        </div>
        <DailyQuestionContent />
      </div>
    </div>
  );
}

function QuickLink({
  href,
  title,
  desc,
}: {
  href: string;
  title: string;
  desc: string;
}) {
  return (
    <Link
      href={href}
      className="bg-white rounded-xl border border-border p-5 hover:shadow-md hover:border-primary/30 transition-all group"
    >
      <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors mb-1">
        {title}
      </h3>
      <p className="text-sm text-muted-foreground">{desc}</p>
    </Link>
  );
}

function DailyQuestionContent() {
  const [question, setQuestion] = useState<QuestionWithRelations | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/questions/daily")
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setQuestion(null);
        } else {
          setQuestion(data);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-4 w-32" />
      </div>
    );
  }

  if (!question) {
    return (
      <p className="text-sm text-muted-foreground">
        暂无题目，快去
        <Link
          href="/questions/new"
          className="text-primary hover:underline mx-1"
        >
          添加
        </Link>
        一些面试题吧！
      </p>
    );
  }

  return (
    <div>
      <Link
        href={`/questions/${question.id}`}
        className="text-lg font-medium text-foreground hover:text-primary transition-colors"
      >
        {question.title}
      </Link>
      <div className="flex items-center gap-2 mt-2">
        <DifficultyBadge difficulty={question.difficulty} />
        {question.category && (
          <span className="text-xs text-muted-foreground">
            {question.category.name}
          </span>
        )}
      </div>
    </div>
  );
}

