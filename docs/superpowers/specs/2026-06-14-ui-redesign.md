# UI 重新设计 — 大屏适配 + 移动端响应式

## 目标

1. 大屏（1440px+）充分利用横向空间，消除右侧空白
2. 移动端完整适配，参考小红书双列卡片流 + 底部 Tab 交互模式
3. 保持现有功能完整，渐进式改造

## 设计原则

- **大屏分栏，小屏堆叠** — 同一页面在不同尺寸有不同的布局策略
- **紧凑优先** — 移动端全局减小 padding/gap，信息密度更高
- **响应式 Sidebar** — 桌面端折叠为图标模式（hover 展开），移动端隐藏改为底部 Tab Bar

## 布局方案

### 1. Sidebar 行为

| 断点 | 行为 |
|------|------|
| ≥1024px (lg) | 默认折叠为图标模式（56px 宽），hover 展开为完整菜单（224px），带过渡动画 |
| <1024px | 完全隐藏，改用底部 Tab Bar 导航 |

**折叠态（56px）**: 仅显示图标，当前路由图标高亮，顶部 Logo 缩小为图标
**展开态（224px）**: 图标 + 文字标签，与当前 Sidebar 一致
**过渡**: CSS transition on width，展开时使用 overlay 模式（浮在内容上方），不挤压内容区

### 2. 移动端底部 Tab Bar

- 4 个等宽 Tab：仪表盘 / 题库 / 新增 / 复习
- icon + 文字标签，当前页蓝色高亮
- 固定在底部，高度 56px
- 显示条件：`< 1024px`

### 3. 各页面布局策略

#### 仪表盘 (`/`)
- 统计卡片：`grid-cols-1 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5`，移除容器 max-w
- 快捷入口：同上自适应 grid
- 每日一题：大屏下与分类分布左右分栏（`xl:grid-cols-2`）

#### 题库列表 (`/questions`)
- 移动端：双列卡片瀑布流，搜索 + 横向 Chip 筛选（替代下拉 select），底部 Tab Bar
- 桌面端 <1280px：单列列表 + 筛选栏（保持现有模式）
- 桌面端 ≥1280px：左侧题目列表 + 右侧题目详情面板（分栏模式，点击题目右侧展示，无需跳转）

#### 复习模式 (`/review`)
- 所有尺寸保持居中单栏，`max-w-3xl` 限制阅读宽度
- 移动端全宽，减小 padding

#### 新增/编辑题目 (`/questions/new`, `/questions/[id]/edit`)
- 桌面端 ≥1280px：Markdown 编辑器 + 实时预览左右分栏（`grid-cols-2`）
- 移动端：编辑器全宽，上下排列，工具栏简化

### 4. 移动端公共组件

#### 横向滚动 Chip 筛选器
- 替代现有 `<select>` 下拉
- 圆角胶囊样式，选中态蓝色填充
- `overflow-x: auto` 横向滚动
- 显示条件：`< 1024px`

#### 双列卡片（题库列表用）
- 2 列 grid，gap 6px
- 每张卡片：顶部色块（按分类/难度配色）+ 标题（2行截断）+ 难度标签 + 分类标签 + 收藏星标
- 卡片高度随标题长度自然变化（不使用固定高度）

## 实现范围

### 必须改动
1. `src/components/layout/Sidebar.tsx` — 折叠/展开/隐藏逻辑
2. `src/components/layout/Header.tsx` — 面包屑保留，移动端简化
3. `src/app/layout.tsx` — 根布局适配（Sidebar + 底部 Tab + 响应式）
4. `src/app/globals.css` — 新增响应式 breakpoint 相关样式
5. `src/app/page.tsx` (仪表盘) — 移除 max-w，grid 自适应
6. `src/app/questions/page.tsx` — 移动端双列卡片 + Chip 筛选 + 桌面分栏
7. `src/app/questions/new/page.tsx` — 桌面端编辑/预览分栏
8. `src/app/review/page.tsx` — 调整 padding

### 新增组件
1. `src/components/layout/MobileTabBar.tsx` — 底部 Tab Bar
2. `src/components/questions/ChipFilters.tsx` — 横向 Chip 筛选器
3. `src/components/questions/QuestionCardGrid.tsx` — 双列卡片网格

### 不需要改动
- 所有 API 路由
- 数据库 / Supabase 相关
- Markdown 编辑器核心逻辑
- 类型定义和常量

## 技术约束

- 不引入新依赖，仅使用 Tailwind CSS v4 响应式工具类
- 保持现有 `@theme` 颜色变量系统
- Sidebar 折叠状态使用 React state + CSS transition，不引入动画库
- 底部 Tab Bar 使用 `next/link`，保持 SPA 导航
