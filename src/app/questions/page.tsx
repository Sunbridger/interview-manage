"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Category, Tag, QuestionWithRelations } from "@/lib/types";
import { QuestionCard } from "@/components/questions/QuestionCard";
import { QuestionCardGrid } from "@/components/questions/QuestionCardGrid";
import { ChipFilters } from "@/components/questions/ChipFilters";
import { Skeleton } from "@/components/ui/Skeleton";
import { ChevronLeft, ChevronRight, Star, CheckCircle2, Library } from "lucide-react";
import { PAGE_SIZE } from "@/lib/constants";

type FilterMode = "all" | "favorite" | "mastered";

const PAGE_SIZE_OPTIONS = [12, 24, 48];

function QuestionsPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const getParam = (key: string, fallback = "") => searchParams.get(key) || fallback;
  const getIntParam = (key: string, fallback = 1) => parseInt(searchParams.get(key) || String(fallback));

  const [search, setSearch] = useState(() => getParam("search"));
  const [categorySlug, setCategorySlug] = useState(() => getParam("category"));
  const [difficulty, setDifficulty] = useState(() => getParam("difficulty"));
  const [tagSlug, setTagSlug] = useState(() => getParam("tag"));
  const [page, setPage] = useState(() => getIntParam("page"));
  const [pageSize, setPageSize] = useState(() => getIntParam("pageSize", PAGE_SIZE));
  const [filterMode, setFilterMode] = useState<FilterMode>(
    () => (getParam("mode") as FilterMode) || "all"
  );

  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [questions, setQuestions] = useState<QuestionWithRelations[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);

  // 页码输入框
  const [pageInput, setPageInput] = useState(String(page));
  const [pageInputFocused, setPageInputFocused] = useState(false);

  // 竞态：用 ref 存 AbortController，新请求前 abort 旧请求
  const abortRef = useRef<AbortController | null>(null);

  const syncURL = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(updates)) {
        if (v && v !== "0" && v !== "all" && v !== String(PAGE_SIZE)) {
          params.set(k, v);
        } else {
          params.delete(k);
        }
      }
      router.replace(`/questions?${params.toString()}`, { scroll: false });
    },
    [searchParams, router]
  );

  useEffect(() => {
    Promise.all([
      fetch("/api/categories").then((r) => r.json()),
      fetch("/api/tags").then((r) => r.json()),
    ]).then(([cats, ts]) => {
      if (Array.isArray(cats)) setCategories(cats);
      if (Array.isArray(ts)) setTags(ts);
    });
  }, []);

  // 加载题目（带 AbortController 防竞态）
  const fetchQuestions = useCallback(async () => {
    // 取消上次请求
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (categorySlug) params.set("category", categorySlug);
    if (difficulty) params.set("difficulty", difficulty);
    if (tagSlug) params.set("tag", tagSlug);
    if (filterMode === "favorite") params.set("favorite", "1");
    if (filterMode === "mastered") params.set("mastered", "1");
    params.set("page", String(page));
    params.set("limit", String(pageSize));

    try {
      const res = await fetch(`/api/questions?${params.toString()}`, { signal: controller.signal });
      const json = await res.json();
      // 检查是否已被取消
      if (controller.signal.aborted) return;
      if (res.ok) {
        setQuestions(json.data || []);
        setTotal(json.total || 0);
        setTotalPages(json.totalPages || 0);
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") return; // 预期的取消
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [search, categorySlug, difficulty, tagSlug, filterMode, page, pageSize]);

  useEffect(() => {
    fetchQuestions();
    return () => { abortRef.current?.abort(); };
  }, [fetchQuestions]);

  // 页码同步到输入框
  useEffect(() => {
    if (!pageInputFocused) setPageInput(String(page));
  }, [page, pageInputFocused]);

  const clearFilters = () => {
    setSearch(""); setCategorySlug(""); setDifficulty(""); setTagSlug("");
    setFilterMode("all"); setPage(1); setPageSize(PAGE_SIZE);
    router.replace("/questions", { scroll: false });
  };

  const updateFilter = (key: string, value: string) => {
    setPage(1);
    switch (key) {
      case "search": setSearch(value); break;
      case "category": setCategorySlug(value); break;
      case "difficulty": setDifficulty(value); break;
      case "tag": setTagSlug(value); break;
    }
    syncURL({ [key]: value, page: "", mode: filterMode === "all" ? "" : filterMode });
  };

  const changeMode = (mode: FilterMode) => {
    setFilterMode(mode); setPage(1);
    syncURL({ mode: mode === "all" ? "" : mode, page: "" });
  };

  const changePage = (p: number) => {
    setPage(p);
    syncURL({ page: String(p), pageSize: pageSize === PAGE_SIZE ? "" : String(pageSize) });
  };

  const changePageSize = (size: number) => {
    setPageSize(size); setPage(1);
    syncURL({ pageSize: size === PAGE_SIZE ? "" : String(size), page: "" });
  };

  const handlePageInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      const num = parseInt((e.target as HTMLInputElement).value);
      if (num >= 1 && num <= totalPages) {
        changePage(num);
      } else {
        setPageInput(String(page)); // 无效输入回退
      }
      (e.target as HTMLInputElement).blur();
    }
  };

  const tabs: { mode: FilterMode; label: string; icon: React.ReactNode }[] = [
    { mode: "all", label: "全部", icon: <Library className="w-4 h-4" /> },
    { mode: "favorite", label: "收藏", icon: <Star className="w-4 h-4" /> },
    { mode: "mastered", label: "已掌握", icon: <CheckCircle2 className="w-4 h-4" /> },
  ];

  const filtersProps = {
    search, categorySlug, difficulty, tagSlug, categories, tags,
    onSearchChange: (v: string) => updateFilter("search", v),
    onCategoryChange: (v: string) => updateFilter("category", v),
    onDifficultyChange: (v: string) => updateFilter("difficulty", v),
    onTagChange: (v: string) => updateFilter("tag", v),
    onClear: clearFilters,
  };

  return (
    <div className="space-y-4 lg:space-y-6">
      <div>
        <h1 className="text-xl lg:text-2xl font-bold text-foreground mb-0.5">题库</h1>
        <p className="text-xs lg:text-sm text-muted-foreground">共 {total} 道面试题</p>
      </div>

      {/* 快速过滤 Tab */}
      <div className="flex gap-2 bg-accent/50 rounded-xl p-1.5 w-fit">
        {tabs.map(({ mode, label, icon }) => (
          <button
            key={mode}
            onClick={() => changeMode(mode)}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              filterMode === mode ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {icon}{label}
          </button>
        ))}
      </div>

      {/* 筛选 */}
      <div className="lg:hidden"><ChipFilters {...filtersProps} variant="chips" /></div>
      <div className="hidden lg:block"><ChipFilters {...filtersProps} variant="dropdowns" /></div>

      {/* 移动端：卡片网格 */}
      <div className="lg:hidden">
        {loading ? (
          <div className="grid grid-cols-2 gap-2">
            {[1,2,3,4].map((i) => (
              <div key={i} className="bg-white rounded-xl border border-border overflow-hidden">
                <div className="h-14 bg-accent animate-pulse" />
                <div className="p-2.5 space-y-2"><Skeleton className="h-3 w-full" /><Skeleton className="h-3 w-16" /></div>
              </div>
            ))}
          </div>
        ) : questions.length === 0 ? (
          <EmptyState filterMode={filterMode} onViewAll={() => changeMode("all")} />
        ) : (
          <QuestionCardGrid questions={questions} />
        )}
      </div>

      {/* 桌面端：单列列表 */}
      <div className="hidden lg:block">
        {loading ? (
          <div className="grid grid-cols-1 gap-4">
            {[1,2,3,4].map((i) => (
              <div key={i} className="bg-white rounded-xl border border-border p-5">
                <Skeleton className="h-5 w-3/4 mb-3" /><Skeleton className="h-4 w-24 mb-2" /><Skeleton className="h-4 w-48" />
              </div>
            ))}
          </div>
        ) : questions.length === 0 ? (
          <EmptyState filterMode={filterMode} onViewAll={() => changeMode("all")} />
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {questions.map((q) => (<QuestionCard key={q.id} question={q} />))}
          </div>
        )}
      </div>

      {/* 分页器 */}
      {totalPages > 0 && (
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => changePage(Math.max(1, page - 1))}
            disabled={page <= 1}
            className="p-2 rounded-lg border border-border bg-white text-muted-foreground hover:text-foreground hover:border-primary/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* 页码 */}
          <div className="flex items-center gap-1 text-sm">
            <input
              value={pageInputFocused ? pageInput : String(page)}
              onChange={(e) => setPageInput(e.target.value)}
              onFocus={() => setPageInputFocused(true)}
              onBlur={() => { setPageInputFocused(false); setPageInput(String(page)); }}
              onKeyDown={handlePageInput}
              className="w-12 text-center border border-border rounded-lg py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
            <span className="text-muted-foreground">/ {totalPages}</span>
          </div>

          <button
            onClick={() => changePage(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
            className="p-2 rounded-lg border border-border bg-white text-muted-foreground hover:text-foreground hover:border-primary/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* 每页数量选择 */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground ml-3">
            <span>每页</span>
            <select
              value={pageSize}
              onChange={(e) => changePageSize(Number(e.target.value))}
              className="border border-border rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              {PAGE_SIZE_OPTIONS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <span>条</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
export default function QuestionsPage() {
  return (
    <Suspense fallback={<div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-96 w-full" /></div>}>
      <QuestionsPageInner />
    </Suspense>
  );
}

function EmptyState({ filterMode, onViewAll }: { filterMode: FilterMode; onViewAll: () => void }) {
  return (
    <div className="text-center py-16">
      <p className="text-lg text-muted-foreground mb-2">
        {filterMode === "favorite" ? "暂无收藏的题目" : filterMode === "mastered" ? "暂无已掌握的题目" : "暂无匹配的题目"}
      </p>
      {filterMode !== "all" ? (
        <button onClick={onViewAll} className="text-primary hover:underline text-sm">查看全部题目</button>
      ) : (
        <p className="text-sm text-muted-foreground">
          试试调整筛选条件，或者 <a href="/questions/new" className="text-primary hover:underline">添加新题目</a>
        </p>
      )}
    </div>
  );
}
