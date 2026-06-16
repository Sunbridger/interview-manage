"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useAnnotations, type Annotation } from "./AnnotationProvider";
import { Pencil, Trash2, ChevronLeft, ChevronRight, MessageSquare } from "lucide-react";

export function AnnotationSidebar() {
  const { state, updateAnnotation, deleteAnnotation, setActiveAnnotation } =
    useAnnotations();
  const { annotations, activeAnnotationId } = state;
  const [collapsed, setCollapsed] = useState(false);

  const handleClick = useCallback(
    (annotation: Annotation) => {
      setActiveAnnotation(annotation.id);
      const el = document.querySelector(`[data-block-id="${annotation.block_id}"]`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    },
    [setActiveAnnotation]
  );

  const grouped = groupByBlock(annotations);

  // 折叠态 — 一个小标签贴在右侧
  if (collapsed) {
    return (
      <div className="fixed right-0 top-1/3 z-40">
        <button
          onClick={() => setCollapsed(false)}
          className="flex items-center gap-1 px-2 py-3 rounded-l-lg border border-r-0 border-border bg-white hover:bg-accent shadow-sm transition-colors"
          title="展开批注面板"
        >
          <ChevronLeft className="w-4 h-4 text-muted-foreground" />
          {annotations.length > 0 && (
            <span className="text-xs font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">
              {annotations.length}
            </span>
          )}
        </button>
      </div>
    );
  }

  // 展开态 — 固定在右侧的面板
  return (
    <div className="fixed right-0 top-0 bottom-0 z-40 w-72 border-l border-border bg-white shadow-lg flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-amber-50/50 shrink-0">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-amber-600" />
          <span className="font-semibold text-sm text-foreground">批注</span>
          {annotations.length > 0 && (
            <span className="text-xs text-muted-foreground">({annotations.length})</span>
          )}
        </div>
        <button
          onClick={() => setCollapsed(true)}
          className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          title="折叠面板"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {annotations.length === 0 ? (
          <div className="px-4 py-12 text-center text-sm text-muted-foreground">
            <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-20" />
            <p className="font-medium">暂无批注</p>
            <p className="text-xs mt-1.5 leading-relaxed">
              鼠标悬停答案段落
              <br />
              点击左侧
              <span className="inline-block mx-0.5 px-1 rounded bg-amber-50 text-amber-600 text-xs">
                💬
              </span>
              按钮添加
            </p>
          </div>
        ) : (
          <div className="py-2">
            {Object.entries(grouped).map(([, anns]) =>
              anns.map((ann) => (
                <AnnotationCard
                  key={ann.id}
                  annotation={ann}
                  isActive={ann.id === activeAnnotationId}
                  onClick={() => handleClick(ann)}
                  onUpdate={(content) => updateAnnotation(ann.id, content)}
                  onDelete={() => deleteAnnotation(ann.id)}
                />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// 单条批注卡片
// ============================================
function AnnotationCard({
  annotation,
  isActive,
  onClick,
  onUpdate,
  onDelete,
}: {
  annotation: Annotation;
  isActive: boolean;
  onClick: () => void;
  onUpdate: (content: string) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(annotation.content);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const handleSave = useCallback(() => {
    if (draft.trim()) onUpdate(draft.trim());
    setEditing(false);
  }, [draft, onUpdate]);

  return (
    <div
      onClick={onClick}
      className={`mx-2 mb-1 rounded-lg transition-colors cursor-pointer group ${
        isActive
          ? "bg-amber-100 ring-1 ring-amber-300"
          : "hover:bg-accent"
      }`}
    >
      <div className="px-3 py-2.5">
        {/* 时间 + 操作 */}
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-muted-foreground">
            {formatTime(new Date(annotation.created_at).getTime())}
          </span>
          <div
            className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => { setEditing(true); setDraft(annotation.content); }}
              className="p-0.5 rounded text-muted-foreground hover:text-foreground transition-colors"
              title="编辑"
            >
              <Pencil className="w-3 h-3" />
            </button>
            <button
              onClick={() => { if (confirm("删除这条批注？")) onDelete(); }}
              className="p-0.5 rounded text-muted-foreground hover:text-red-500 transition-colors"
              title="删除"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* 内容 */}
        {editing ? (
          <div onClick={(e) => e.stopPropagation()}>
            <textarea
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSave();
                if (e.key === "Escape") { setDraft(annotation.content); setEditing(false); }
              }}
              rows={2}
              className="w-full text-xs border border-border rounded p-1.5 resize-none focus:outline-none focus:ring-1 focus:ring-amber-300"
            />
            <div className="flex items-center gap-1.5 mt-1">
              <button onClick={handleSave} disabled={!draft.trim()}
                className="px-2 py-0.5 text-[10px] font-medium bg-amber-500 text-white rounded hover:bg-amber-600 disabled:opacity-50 transition-colors">
                保存
              </button>
              <button onClick={() => { setDraft(annotation.content); setEditing(false); }}
                className="px-1.5 py-0.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors">
                取消
              </button>
            </div>
          </div>
        ) : (
          <p className="text-xs text-foreground/80 leading-relaxed whitespace-pre-wrap">
            {annotation.content}
          </p>
        )}
      </div>
    </div>
  );
}

// ============================================
// Helpers
// ============================================
function groupByBlock(annotations: Annotation[]): Record<string, Annotation[]> {
  const result: Record<string, Annotation[]> = {};
  for (const ann of annotations) {
    if (!result[ann.block_id]) result[ann.block_id] = [];
    result[ann.block_id].push(ann);
  }
  return result;
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "刚刚";
  if (diffMin < 60) return `${diffMin} 分钟前`;
  if (diffHour < 24) return `${diffHour} 小时前`;
  if (diffDay < 7) return `${diffDay} 天前`;
  return d.toLocaleDateString("zh-CN");
}
