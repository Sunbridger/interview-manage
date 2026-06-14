"use client";

import { useState, useEffect, useCallback } from "react";
import { Category, Tag, QuestionWithRelations } from "@/lib/types";
import { QuestionCard } from "@/components/questions/QuestionCard";
import { QuestionFilters } from "@/components/questions/QuestionFilters";
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

  const clearFilters = () => {
    setSearch("");
    setCategorySlug("");
    setDifficulty("");
    setTagSlug("");
    setPage(1);
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground mb-1">题库</h1>
        <p className="text-sm text-muted-foreground">
          共 {total} 道面试题
        </p>
      </div>

      <QuestionFilters
        search={search}
        categorySlug={categorySlug}
        difficulty={difficulty}
        tagSlug={tagSlug}
        categories={categories}
        tags={tags}
        onSearchChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
        onCategoryChange={(v) => {
          setCategorySlug(v);
          setPage(1);
        }}
        onDifficultyChange={(v) => {
          setDifficulty(v);
          setPage(1);
        }}
        onTagChange={(v) => {
          setTagSlug(v);
          setPage(1);
        }}
        onClear={clearFilters}
      />

      {/* 题目列表 */}
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
            <QuestionCard key={q.id} question={q} />
          ))}
        </div>
      )}

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
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
  );
}
