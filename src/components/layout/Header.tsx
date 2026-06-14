"use client";

import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";

const pathLabels: Record<string, string> = {
  "/": "仪表盘",
  "/questions": "题库",
  "/questions/new": "新增题目",
  "/review": "复习模式",
};

export function Header() {
  const pathname = usePathname();

  // 动态面包屑
  const segments = pathname.split("/").filter(Boolean);
  const breadcrumbs = segments.map((seg, i) => {
    const href = "/" + segments.slice(0, i + 1).join("/");
    const label = pathLabels[href] || decodeURIComponent(seg);
    return { href, label };
  });

  return (
    <header className="h-14 border-b border-border bg-white flex items-center px-6 shrink-0">
      <nav className="flex items-center gap-1.5 text-sm">
        {breadcrumbs.length === 0 ? (
          <span className="font-medium text-foreground">仪表盘</span>
        ) : (
          breadcrumbs.map((crumb, i) => (
            <span key={crumb.href} className="flex items-center gap-1.5">
              {i > 0 && (
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50" />
              )}
              {i === breadcrumbs.length - 1 ? (
                <span className="font-medium text-foreground">
                  {crumb.label}
                </span>
              ) : (
                <span className="text-muted-foreground">{crumb.label}</span>
              )}
            </span>
          ))
        )}
      </nav>
    </header>
  );
}
