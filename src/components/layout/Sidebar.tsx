"use client";

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

  return (
    <aside className="w-56 shrink-0 border-r border-border bg-white flex flex-col">
      <div className="h-14 flex items-center px-4 border-b border-border">
        <Brain className="w-6 h-6 text-primary mr-2" />
        <span className="font-semibold text-sm text-foreground">
          AI 面试题库
        </span>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                ${
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
            >
              {iconMap[item.icon]}
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-3 border-t border-border">
        <p className="text-xs text-muted-foreground px-3">
          AI Agent Interview
        </p>
      </div>
    </aside>
  );
}
