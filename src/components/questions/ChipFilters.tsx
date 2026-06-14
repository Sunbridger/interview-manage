"use client";

import { Tag, Category } from "@/lib/types";
import { DIFFICULTY_OPTIONS } from "@/lib/constants";
import { Search, X } from "lucide-react";

interface ChipFiltersProps {
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
  /** 桌面端用下拉模式，移动端用 Chip 模式 */
  variant?: "chips" | "dropdowns";
}

export function ChipFilters({
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
  variant = "chips",
}: ChipFiltersProps) {
  const hasFilter = search || categorySlug || difficulty || tagSlug;

  // 下拉模式（桌面端）
  if (variant === "dropdowns") {
    return (
      <div className="space-y-4">
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
        <div className="flex flex-wrap gap-3">
          <SelectFilter
            value={categorySlug}
            onChange={onCategoryChange}
            placeholder="全部分类"
            options={categories.map((c) => ({ value: c.slug, label: c.name }))}
          />
          <SelectFilter
            value={difficulty}
            onChange={onDifficultyChange}
            placeholder="全部难度"
            options={DIFFICULTY_OPTIONS.map((d) => ({
              value: d.value,
              label: d.label,
            }))}
          />
          <SelectFilter
            value={tagSlug}
            onChange={onTagChange}
            placeholder="全部标签"
            options={tags.map((t) => ({ value: t.slug, label: t.name }))}
          />
        </div>
      </div>
    );
  }

  // Chip 模式（移动端）
  return (
    <div className="space-y-2">
      {/* 搜索 */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="搜索题目..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-white text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
        />
        {hasFilter && (
          <button
            onClick={onClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-primary font-medium"
          >
            清除
          </button>
        )}
      </div>

      {/* 分类 Chip */}
      <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
        {[
          { value: "", label: "全部" },
          ...categories.map((c) => ({ value: c.slug, label: c.name })),
        ].map(({ value, label }) => (
          <button
            key={value}
            onClick={() => onCategoryChange(value)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              categorySlug === value
                ? "bg-primary text-white"
                : "bg-accent text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* 难度 Chip */}
      <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
        {[
          { value: "", label: "全部难度" },
          ...DIFFICULTY_OPTIONS,
        ].map(({ value, label }) => (
          <button
            key={value}
            onClick={() => onDifficultyChange(value)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              difficulty === value
                ? "bg-primary text-white"
                : "bg-accent text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* 标签 Chip */}
      {tags.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
          {tags.map((t) => (
            <button
              key={t.id}
              onClick={() => onTagChange(tagSlug === t.slug ? "" : t.slug)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                tagSlug === t.slug
                  ? "bg-primary text-white"
                  : "bg-accent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function SelectFilter({
  value,
  onChange,
  placeholder,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="px-3 py-2 rounded-lg border border-border bg-white text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
    >
      <option value="">{placeholder}</option>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
