"use client";

import { useState, useEffect, useCallback } from "react";
import { Category, Tag, QuestionWithRelations } from "@/lib/types";
import { QuestionCard } from "@/components/questions/QuestionCard";
import { QuestionCardGrid } from "@/components/questions/QuestionCardGrid";
import { ChipFilters } from "@/components/questions/ChipFilters";
import { QuestionDetailPanel } from "@/components/questions/QuestionDetailPanel";
import { Skeleton } from "@/components/ui/Skeleton";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { PAGE_SIZE } from "@/lib/constants";

export default function QuestionsPage() {
  const [search, setSearch] = useState("");
  const [categorySlug, setCategorySlug] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [tagSlug, setTagSlug] = useState("");
  const [page, setPage] = useState(1);

  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [questions, setQuestions] = useState<QuestionWithRelations[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);

  // 桌面端分栏：选中的题目，在右侧面板展示
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // 加载分类和标签
  useEffect(() => {
    Promise.all([
      fetch("/api/categories").then((r) => r.json()),
      fetch("/api/tags").then((r) => r.json()),
    ]).then(([cats, ts]) => {
      if (Array.isArray(cats)) setCategories(cats);
      if (Array.isArray(ts)) setTags(ts);
    });
  }, []);

  // 加载题目
  const fetchQuestions = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (categorySlug) params.set("category", categorySlug);
    if (difficulty) params.set("difficulty", difficulty);
    if (tagSlug) params.set("tag", tagSlug);
    params.set("page", String(page));
    params.set("limit", String(PAGE_SIZE));

    try {
      const res = await fetch(`/api/questions?${params.toString()}`);
      const json = await res.json();
      if (res.ok) {
        setQuestions(json.data || []);
        setTotal(json.total || 0);
        setTotalPages(json.totalPages || 0);
      }
    } finally {
      setLoading(false);
    }
  }, [search, categorySlug, difficulty, tagSlug, page]);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  // 切换筛选时清除选中
  useEffect(() => {
    setSelectedId(null);
  }, [search, categorySlug, difficulty, tagSlug, page]);

  const clearFilters = () => {
    setSearch("");
    setCategorySlug("");
    setDifficulty("");
    setTagSlug("");
    setPage(1);
  };

  const filtersProps = {
    search,
    categorySlug,
    difficulty,
    tagSlug,
    categories,
    tags,
    onSearchChange: (v: string) => {
      setSearch(v);
      setPage(1);
    },
    onCategoryChange: (v: string) => {
      setCategorySlug(v);
      setPage(1);
    },
    onDifficultyChange: (v: string) => {
      setDifficulty(v);
      setPage(1);
    },
    onTagChange: (v: string) => {
      setTagSlug(v);
      setPage(1);
    },
    onClear: clearFilters,
  };

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* 标题行 — 桌面分栏模式时紧凑 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-foreground mb-0.5">题库</h1>
          <p className="text-xs lg:text-sm text-muted-foreground">
            共 {total} 道面试题
          </p>
        </div>
        {/* 分栏模式下的关闭按钮 */}
        {selectedId && (
          <button
            onClick={() => setSelectedId(null)}
            className="hidden xl:inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            ✕ 关闭详情
          </button>
        )}
      </div>

      {/* 筛选 — 移动端 Chip，桌面端下拉 */}
      <div className="lg:hidden">
        <ChipFilters {...filtersProps} variant="chips" />
      </div>
      <div className="hidden lg:block">
        <ChipFilters {...filtersProps} variant="dropdowns" />
      </div>

      {/* 内容区 */}
      <div className="xl:flex xl:gap-6">
        {/* 左侧：列表 */}
        <div className={`${selectedId ? "xl:w-[45%] xl:shrink-0" : "flex-1"}`}>
          {/* 移动端：卡片网格 */}
          <div className="lg:hidden">
            {loading ? (
              <div className="grid grid-cols-2 gap-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="bg-white rounded-xl border border-border overflow-hidden">
                    <div className="h-14 bg-accent animate-pulse" />
                    <div className="p-2.5 space-y-2">
                      <Skeleton className="h-3 w-full" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  </div>
                ))}
              </div>
            ) : questions.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-sm text-muted-foreground mb-2">暂无匹配的题目</p>
                <a href="/questions/new" className="text-primary hover:underline text-sm">
                  添加新题目
                </a>
              </div>
            ) : (
              <QuestionCardGrid questions={questions} />
            )}
          </div>

          {/* 桌面端：单列列表 */}
          <div className="hidden lg:block">
            {loading ? (
              <div className="grid grid-cols-1 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="bg-white rounded-xl border border-border p-5">
                    <Skeleton className="h-5 w-3/4 mb-3" />
                    <Skeleton className="h-4 w-24 mb-2" />
                    <Skeleton className="h-4 w-48" />
                  </div>
                ))}
              </div>
            ) : questions.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-lg text-muted-foreground mb-2">暂无匹配的题目</p>
                <p className="text-sm text-muted-foreground">
                  试试调整筛选条件，或者
                  <a href="/questions/new" className="text-primary hover:underline ml-1">
                    添加新题目
                  </a>
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {questions.map((q) => (
                  <div
                    key={q.id}
                    onClick={() => setSelectedId(q.id)}
                    className={selectedId === q.id ? "ring-2 ring-primary/30 rounded-xl" : ""}
                  >
                    <QuestionCard question={q} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 分页 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-2 rounded-lg border border-border bg-white text-muted-foreground hover:text-foreground hover:border-primary/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-muted-foreground px-3">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-2 rounded-lg border border-border bg-white text-muted-foreground hover:text-foreground hover:border-primary/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* 右侧：详情面板（≥1280px） */}
        {selectedId && (
          <div className="hidden xl:block flex-1 min-w-0">
            <div className="sticky top-4">
              <QuestionDetailPanel id={selectedId} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
