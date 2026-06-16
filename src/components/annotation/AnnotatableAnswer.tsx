"use client";

import { useState, useRef, useCallback, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useAnnotations } from "./AnnotationProvider";
import { MessageSquarePlus, MessageSquare } from "lucide-react";

// ============================================
// AnnotatableBlock — 每个段落的批注容器
// ============================================
function AnnotatableBlock({
  blockId,
  children,
  asFragment = false,
}: {
  blockId: string;
  children: ReactNode;
  asFragment?: boolean; // 表格元素不能用 div 包裹，用 Fragment
}) {
  const { getAnnotationsForBlock, setActiveAnnotation, addAnnotation, state } =
    useAnnotations();
  const [showInput, setShowInput] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const annotations = getAnnotationsForBlock(blockId);
  const hasAnnotations = annotations.length > 0;
  const isActive = hasAnnotations && state.activeAnnotationId === annotations[0]?.id;

  const handleAdd = useCallback(() => {
    if (draft.trim()) {
      addAnnotation(blockId, draft.trim());
      setDraft("");
      setShowInput(false);
    }
  }, [blockId, draft, addAnnotation]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        handleAdd();
      }
      if (e.key === "Escape") {
        setShowInput(false);
        setDraft("");
      }
    },
    [handleAdd]
  );

  // 批注按钮（hover 显示）
  const annotationButton = (
    <div className="absolute -left-10 top-0 bottom-0 flex items-start pt-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto">
      {hasAnnotations ? (
        <button
          onClick={() =>
            setActiveAnnotation(
              annotations[0]?.id === state.activeAnnotationId
                ? null
                : annotations[0]?.id
            )
          }
          className="p-1 rounded-md text-amber-600 hover:bg-amber-100 transition-colors pointer-events-auto"
          title={`${annotations.length} 条批注 — 点击查看`}
        >
          <MessageSquare className="w-4 h-4" />
        </button>
      ) : (
        <button
          onClick={() => {
            setShowInput(true);
            setTimeout(() => inputRef.current?.focus(), 0);
          }}
          className="p-1 rounded-md text-muted-foreground hover:text-amber-600 hover:bg-amber-50 transition-colors pointer-events-auto"
          title="添加批注"
        >
          <MessageSquarePlus className="w-4 h-4" />
        </button>
      )}
    </div>
  );

  // 批注数量标识
  const badge = hasAnnotations && !isActive ? (
    <span className="absolute -right-3 -top-1 text-[10px] bg-amber-100 text-amber-700 rounded-full w-4 h-4 flex items-center justify-center font-medium">
      {annotations.length}
    </span>
  ) : null;

  // 批注输入框
  const inputBox = showInput ? (
    <div className="mt-2 mb-1 ml-2 border-l-2 border-amber-300 pl-3">
      <textarea
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="输入批注内容..."
        rows={2}
        className="w-full text-sm border border-border rounded-lg p-2 resize-none focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-300 transition-all"
      />
      <div className="flex items-center gap-2 mt-1.5">
        <button
          onClick={handleAdd}
          disabled={!draft.trim()}
          className="px-3 py-1 text-xs font-medium bg-amber-500 text-white rounded-md hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          添加批注
        </button>
        <button
          onClick={() => { setShowInput(false); setDraft(""); }}
          className="px-2 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          取消
        </button>
        <span className="text-[10px] text-muted-foreground ml-auto">
          ⌘+Enter 提交 · Esc 取消
        </span>
      </div>
    </div>
  ) : null;

  // 表格行不能包裹 div —— 使用 Fragment + 内联样式
  if (asFragment) {
    return (
      <>
        <tr
          data-block-id={blockId}
          className={`group relative transition-colors ${
            isActive ? "bg-amber-50" : hasAnnotations ? "bg-amber-50/30" : ""
          }`}
        >
          {children}
        </tr>
      </>
    );
  }

  // 普通块级元素：div 包裹
  return (
    <div
      className={`relative group -mx-2 px-2 rounded-lg transition-colors ${
        isActive
          ? "bg-amber-50 ring-1 ring-amber-200"
          : hasAnnotations
            ? "bg-amber-50/30"
            : "hover:bg-accent/50"
      }`}
      data-block-id={blockId}
    >
      {annotationButton}
      <div>{children}</div>
      {badge}
      {inputBox}
    </div>
  );
}

// ============================================
// 主组件
// ============================================
interface AnnotatableAnswerProps {
  content: string;
}

export function AnnotatableAnswer({ content }: AnnotatableAnswerProps) {
  const normalized = content.replace(/\\n/g, "\n");

  return (
    <div className="prose prose-slate max-w-none prose-headings:text-foreground prose-p:text-foreground/80 prose-table:!my-3">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h2: ({ children, ...props }) => (
            <AnnotatableBlock blockId={`h2-${extractTextId(children)}`}>
              <h2 className="text-lg font-semibold text-foreground mt-8 mb-3" {...props}>
                {children}
              </h2>
            </AnnotatableBlock>
          ),
          h3: ({ children, ...props }) => (
            <AnnotatableBlock blockId={`h3-${extractTextId(children)}`}>
              <h3 className="text-base font-semibold text-foreground mt-6 mb-2" {...props}>
                {children}
              </h3>
            </AnnotatableBlock>
          ),
          p: ({ children }) => (
            <AnnotatableBlock blockId={`p-${hashText(extractTextFromNode(children))}`}>
              <p className="my-2 leading-relaxed">{children}</p>
            </AnnotatableBlock>
          ),
          li: ({ children, ...props }) => (
            <AnnotatableBlock blockId={`li-${hashText(extractTextFromNode(children))}`}>
              <li className="my-0.5" {...props}>{children}</li>
            </AnnotatableBlock>
          ),
          pre: ({ children }) => (
            <AnnotatableBlock blockId={`code-${hashText(extractTextFromNode(children))}`}>
              <pre className="!my-3">{children}</pre>
            </AnnotatableBlock>
          ),
          blockquote: ({ children }) => (
            <AnnotatableBlock blockId={`quote-${hashText(extractTextFromNode(children))}`}>
              <blockquote className="!my-3">{children}</blockquote>
            </AnnotatableBlock>
          ),
          // 表格行：使用 asFragment 避免 <div> 包裹 <tr>
          tr: ({ children }) => (
            <AnnotatableBlock
              blockId={`tr-${hashText(extractTextFromNode(children))}`}
              asFragment
            >
              {children}
            </AnnotatableBlock>
          ),
        }}
      >
        {normalized}
      </ReactMarkdown>
    </div>
  );
}

// ============================================
// Helpers
// ============================================
function extractTextId(node: ReactNode): string {
  const text = extractTextFromNode(node);
  return text.slice(0, 40).replace(/\s+/g, "-").toLowerCase() || "empty";
}

function extractTextFromNode(node: ReactNode): string {
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractTextFromNode).join("");
  if (node && typeof node === "object" && "props" in node) {
    const props = (node as { props?: { children?: ReactNode } }).props;
    return props?.children ? extractTextFromNode(props.children) : "";
  }
  return "";
}

function hashText(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36).slice(0, 8);
}
