"use client";

import { use, useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { QuestionWithRelations } from "@/lib/types";
import { MarkdownRenderer } from "@/components/common/MarkdownRenderer";
import { DifficultyBadge } from "@/components/common/DifficultyBadge";
import { TagBadge } from "@/components/common/TagBadge";
import { Skeleton } from "@/components/ui/Skeleton";
import { AnnotationProvider } from "@/components/annotation/AnnotationProvider";
import { AnnotatableAnswer } from "@/components/annotation/AnnotatableAnswer";
import { AnnotationSidebar } from "@/components/annotation/AnnotationSidebar";
import { ArrowLeft, Star, CheckCircle2, Pencil, Trash2, MoreHorizontal, ChevronDown } from "lucide-react";

export default function QuestionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [question, setQuestion] = useState<QuestionWithRelations | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isMastered, setIsMastered] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/questions/${id}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (data.error) {
          setQuestion(null);
        } else {
          setQuestion(data);
          setIsFavorite(data.user_state?.is_favorite || false);
          setIsMastered(data.user_state?.is_mastered || false);
        }
        setLoading(false);
      })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id]);

  // 点击外部关闭下拉菜单
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

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
      <div className="max-w-4xl mx-auto space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!question) {
    return (
      <div className="text-center py-16">
        <p className="text-lg text-muted-foreground">题目不存在</p>
        <Link href="/questions" className="text-primary hover:underline mt-2 inline-block">
          返回题库
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4 lg:space-y-6">
      {/* 顶部栏：返回 + 右侧操作按钮 */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => {
            if (window.history.length > 1) router.back();
            else router.push("/questions");
          }}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          返回题库
        </button>

        {/* 右侧操作区 */}
        <div className="flex items-center gap-2">
          {/* 收藏 */}
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

          {/* 标记掌握 */}
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

          {/* 更多操作下拉 */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-all"
            >
              <MoreHorizontal className="w-3.5 h-3.5" />
              <ChevronDown className="w-3 h-3" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 bg-white border border-border rounded-lg shadow-lg py-1 z-50 min-w-[100px]">
                <Link
                  href={`/questions/${id}/edit`}
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 text-xs text-foreground hover:bg-accent transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  编辑题目
                </Link>
                <button
                  onClick={() => { setMenuOpen(false); handleDelete(); }}
                  className="flex items-center gap-2 px-3 py-2 text-xs text-red-600 hover:bg-red-50 transition-colors w-full text-left"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  删除题目
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 标题 */}
      <h1 className="text-2xl font-bold text-foreground">{question.title}</h1>

      {/* 元信息 */}
      <div className="flex flex-wrap items-center gap-3">
        <DifficultyBadge difficulty={question.difficulty} />
        {question.category && (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-600">
            {question.category.name}
          </span>
        )}
        {question.source && (
          <span className="text-xs text-muted-foreground">来源：{question.source}</span>
        )}
      </div>

      {/* 标签 */}
      {question.tags && question.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {question.tags.map((tag) => (
            <TagBadge key={tag.id} name={tag.name} />
          ))}
        </div>
      )}

      {/* 题目内容 */}
      <div className="bg-white rounded-xl border border-border p-6">
        <h2 className="font-semibold text-foreground mb-4">📋 题目描述</h2>
        <MarkdownRenderer content={question.content || "暂无题目描述"} />
      </div>

      {/* 答案区域 — 默认展开 + 批注 */}
      <AnnotationProvider questionId={id}>
        <div className="bg-white rounded-xl border border-border p-6">
          <h2 className="font-semibold text-foreground mb-4">✅ 参考答案</h2>
          <div className="pl-10">
            <AnnotatableAnswer content={question.answer || "暂无参考答案"} />
          </div>
        </div>
        <AnnotationSidebar />
      </AnnotationProvider>
    </div>
  );
}
