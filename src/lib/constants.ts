import { Difficulty } from "./types";

// ============================================
// 难度配置
// ============================================
export const DIFFICULTY_CONFIG: Record<
  Difficulty,
  { label: string; color: string; bgColor: string }
> = {
  easy: {
    label: "简单",
    color: "text-green-600",
    bgColor: "bg-green-50",
  },
  medium: {
    label: "中等",
    color: "text-amber-600",
    bgColor: "bg-amber-50",
  },
  hard: {
    label: "困难",
    color: "text-red-600",
    bgColor: "bg-red-50",
  },
};

export const DIFFICULTY_OPTIONS = Object.entries(DIFFICULTY_CONFIG).map(
  ([value, { label }]) => ({
    value: value as Difficulty,
    label,
  })
);

// ============================================
// 分页配置
// ============================================
export const PAGE_SIZE = 12;

// ============================================
// 侧边栏导航
// ============================================
export const NAV_ITEMS = [
  { href: "/", label: "仪表盘", icon: "LayoutDashboard" },
  { href: "/questions", label: "题库", icon: "Library" },
  { href: "/questions/new", label: "新增题目", icon: "PlusCircle" },
  { href: "/review", label: "复习模式", icon: "Brain" },
];

// ============================================
// 分类预设
// ============================================
export const PRESET_CATEGORIES = [
  "React",
  "LLM",
  "Prompt Engineering",
  "RAG",
  "Agent",
  "工程化",
];
