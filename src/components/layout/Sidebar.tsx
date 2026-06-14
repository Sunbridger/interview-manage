"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "@/lib/constants";
import {
  LayoutDashboard,
  Library,
  PlusCircle,
  Brain,
} from "lucide-react";

const iconMap: Record<string, React.ReactNode> = {
  LayoutDashboard: <LayoutDashboard className="w-5 h-5" />,
  Library: <Library className="w-5 h-5" />,
  PlusCircle: <PlusCircle className="w-5 h-5" />,
  Brain: <Brain className="w-5 h-5" />,
};

export function Sidebar() {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      {/* 移动端遮罩 */}
      {expanded && (
        <div
          className="fixed inset-0 bg-black/20 z-40 lg:hidden"
          onClick={() => setExpanded(false)}
        />
      )}

      <aside
        className={`
          fixed lg:relative z-50 h-full shrink-0 border-r border-border bg-white flex flex-col
          transition-all duration-200 ease-in-out
          ${expanded ? "w-56" : "w-14"}
          max-lg:hidden
        `}
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => setExpanded(false)}
      >
        {/* Logo */}
        <div className="h-14 flex items-center px-3 border-b border-border overflow-hidden">
          <Brain className="w-5 h-5 text-primary shrink-0" />
          <span
            className={`font-semibold text-sm text-foreground ml-2 whitespace-nowrap transition-opacity duration-150 ${
              expanded ? "opacity-100" : "opacity-0 w-0"
            }`}
          >
            AI 面试题库
          </span>
        </div>

        {/* 导航 */}
        <nav className="flex-1 p-2 space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-2.5 py-2.5 rounded-lg text-sm font-medium transition-colors overflow-hidden
                  ${
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  }`}
                title={expanded ? undefined : item.label}
              >
                <span className="shrink-0">{iconMap[item.icon]}</span>
                <span
                  className={`whitespace-nowrap transition-opacity duration-150 ${
                    expanded ? "opacity-100" : "opacity-0 w-0"
                  }`}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* 底部 */}
        <div className="p-2 border-t border-border">
          <p
            className={`text-xs text-muted-foreground whitespace-nowrap text-center transition-opacity duration-150 ${
              expanded ? "opacity-100" : "opacity-0"
            }`}
          >
            AI Agent Interview
          </p>
        </div>
      </aside>
    </>
  );
}
