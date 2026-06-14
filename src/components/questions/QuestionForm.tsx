"use client";

import { useState, useEffect } from "react";
import { Category, Tag, QuestionFormData, QuestionWithRelations } from "@/lib/types";
import { DIFFICULTY_OPTIONS } from "@/lib/constants";
import MDEditor from "@uiw/react-md-editor";
import { X } from "lucide-react";

interface QuestionFormProps {
  initialData?: QuestionWithRelations | null;
  onSubmit: (data: QuestionFormData) => Promise<void>;
  submitLabel?: string;
}

export function QuestionForm({
  initialData,
  onSubmit,
  submitLabel = "保存",
}: QuestionFormProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(false);

  const [title, setTitle] = useState(initialData?.title || "");
  const [categoryId, setCategoryId] = useState(initialData?.category_id || "");
  const [difficulty, setDifficulty] = useState(initialData?.difficulty || "medium");
  const [source, setSource] = useState(initialData?.source || "");
  const [content, setContent] = useState(initialData?.content || "");
  const [answer, setAnswer] = useState(initialData?.answer || "");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(
    initialData?.tags?.map((t) => t.id) || []
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

  const toggleTag = (tagId: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setLoading(true);
    await onSubmit({
      title: title.trim(),
      content,
      answer,
      category_id: categoryId || null,
      difficulty: difficulty as "easy" | "medium" | "hard",
      source: source.trim() || "",
      tag_ids: selectedTagIds,
    });
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 标题 */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">
          题目标题 *
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          placeholder="输入面试题标题..."
          className="w-full px-4 py-2.5 rounded-lg border border-border bg-white text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
        />
      </div>

      {/* 分类 / 难度 / 来源 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            分类
          </label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg border border-border bg-white text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
          >
            <option value="">未分类</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            难度
          </label>
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg border border-border bg-white text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
          >
            {DIFFICULTY_OPTIONS.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            来源
          </label>
          <input
            type="text"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            placeholder="如：面试真题、LeetCode..."
            className="w-full px-4 py-2.5 rounded-lg border border-border bg-white text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
          />
        </div>
      </div>

      {/* 标签选择 */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          标签
        </label>
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => {
            const selected = selectedTagIds.includes(tag.id);
            return (
              <button
                key={tag.id}
                type="button"
                onClick={() => toggleTag(tag.id)}
                className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  selected
                    ? "bg-primary text-white border-primary"
                    : "bg-white text-muted-foreground border-border hover:border-primary/50 hover:text-foreground"
                }`}
              >
                {tag.name}
                {selected && <X className="w-3 h-3" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* 题目描述 - Markdown 编辑器 */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          题目描述
        </label>
        <div data-color-mode="light">
          <MDEditor
            value={content}
            onChange={(val) => setContent(val || "")}
            height={300}
            preview="live"
          />
        </div>
      </div>

      {/* 参考答案 - Markdown 编辑器 */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          参考答案
        </label>
        <div data-color-mode="light">
          <MDEditor
            value={answer}
            onChange={(val) => setAnswer(val || "")}
            height={300}
            preview="live"
          />
        </div>
      </div>

      {/* 提交 */}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={loading || !title.trim()}
          className="px-6 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "保存中..." : submitLabel}
        </button>
      </div>
    </form>
  );
}
