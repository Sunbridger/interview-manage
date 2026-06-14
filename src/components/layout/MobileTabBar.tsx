"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Library, PlusCircle, Brain } from "lucide-react";

const tabs = [
  { href: "/", label: "仪表盘", icon: LayoutDashboard },
  { href: "/questions", label: "题库", icon: Library },
  { href: "/questions/new", label: "新增", icon: PlusCircle },
  { href: "/review", label: "复习", icon: Brain },
];

export function MobileTabBar() {
  const pathname = usePathname();

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-white safe-area-bottom">
      <div className="flex items-center justify-around h-14">
        {tabs.map(({ href, label, icon: Icon }) => {
          const isActive =
            href === "/"
              ? pathname === "/"
              : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-0.5 py-1 px-3 transition-colors ${
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
