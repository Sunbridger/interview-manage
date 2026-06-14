"use client";

import { Tag, Category } from "@/lib/types";
import { DIFFICULTY_OPTIONS } from "@/lib/constants";
import { Search, X } from "lucide-react";

interface QuestionFiltersProps {
  search: string;
  categorySlug: string;
  difficulty: string;
  tagSlug: string;
  categories: Category[];
  tags: Tag[];
  onSearchChange: (v: string) => void;
  onCategoryChange: (v: string) => void;
  onDifficultyChange: (v: string) => void;
  onTagChange: (v: string) => void;
  onClear: () => void;
}

export function QuestionFilters({
  search,
  categorySlug,
  difficulty,
  tagSlug,
  categories,
  tags,
  onSearchChange,
  onCategoryChange,
  onDifficultyChange,
  onTagChange,
  onClear,
}: QuestionFiltersProps) {
  const hasFilter = search || categorySlug || difficulty || tagSlug;

  return (
    <div className="space-y-4">
      {/* 搜索框 */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="搜索题目关键词..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-white text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
        />
        {hasFilter && (
          <button
            onClick={onClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
          >
            <X className="w-3.5 h-3.5" />
            清除
          </button>
        )}
      </div>

      {/* 筛选 */}
      <div className="flex flex-wrap gap-3">
        <select
          value={categorySlug}
          onChange={(e) => onCategoryChange(e.target.value)}
          className="px-3 py-2 rounded-lg border border-border bg-white text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
        >
          <option value="">全部分类</option>
          {categories.map((c) => (
            <option key={c.id} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>

        <select
          value={difficulty}
          onChange={(e) => onDifficultyChange(e.target.value)}
          className="px-3 py-2 rounded-lg border border-border bg-white text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
        >
          <option value="">全部难度</option>
          {DIFFICULTY_OPTIONS.map((d) => (
            <option key={d.value} value={d.value}>
              {d.label}
            </option>
          ))}
        </select>

        <select
          value={tagSlug}
          onChange={(e) => onTagChange(e.target.value)}
          className="px-3 py-2 rounded-lg border border-border bg-white text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
        >
          <option value="">全部标签</option>
          {tags.map((t) => (
            <option key={t.id} value={t.slug}>
              {t.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
