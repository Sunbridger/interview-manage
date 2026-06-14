"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({ content, className = "" }: MarkdownRendererProps) {
  return (
    <div className={`prose prose-slate max-w-none prose-headings:text-foreground prose-p:text-foreground/80 prose-code:text-primary prose-code:bg-accent prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-pre:bg-slate-900 prose-pre:text-slate-50 ${className}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
