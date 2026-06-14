# 前端 AI Agent 面试知识库

基于 Next.js 构建的个人面试题目管理与练习平台，专注于前端开发和 AI Agent 领域。

**官网地址**: [https://interview-manage-taupe.vercel.app/questions](https://interview-manage-taupe.vercel.app/questions)

## 功能特性

- **题目管理** — 支持题目和答案的 Markdown 编辑，按分类/难度/标签筛选，关键词搜索与排序
- **仪表盘** — 总览题目数量、已掌握数、收藏数，按分类和难度分布统计，每日一题推荐
- **复习模式** — 三种练习方式：
  - **随机模式** — 随机抽取题目
  - **每日一题** — 每天一道精选题目
  - **收藏模式** — 仅复习已收藏的题目
  - 支持显示/隐藏答案，标记"已掌握"
- **题目收藏与掌握追踪** — 每道题支持收藏和掌握状态标记，按用户维度持久化

## 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | Next.js 16 (App Router) |
| 语言 | TypeScript |
| UI | React 19 + Tailwind CSS v4 |
| 数据库 | Supabase (PostgreSQL) |
| 认证 | Supabase Auth |
| Markdown 编辑 | @uiw/react-md-editor |
| Markdown 渲染 | react-markdown + remark-gfm |
| 图标 | lucide-react |

## 快速开始

### 环境要求

- Node.js 18+
- 一个 [Supabase](https://supabase.com) 项目

### 本地运行

```bash
# 安装依赖
npm install

# 复制环境变量配置
cp .env.local.example .env.local
```

编辑 `.env.local`，填入你的 Supabase 项目信息：

```
NEXT_PUBLIC_SUPABASE_URL=你的_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=你的_anon_key
SUPABASE_SERVICE_ROLE_KEY=你的_service_role_key
```

在 Supabase SQL Editor 中执行 `supabase/schema.sql` 初始化数据库表结构和种子数据。

```bash
# 启动开发服务器
npm run dev
```

浏览器打开 [http://localhost:3000](http://localhost:3000) 即可使用。

### 生产构建

```bash
npm run build
npm run start
```

## 项目结构

```
src/
├── app/
│   ├── api/          # API 路由 (CRUD、统计、标签、分类)
│   ├── questions/    # 题目列表、详情、新建/编辑页面
│   ├── review/       # 复习练习页面
│   └── layout.tsx    # 根布局
├── components/       # UI 组件
├── hooks/            # 自定义 Hooks
└── lib/              # 类型定义、常量、工具函数
supabase/
└── schema.sql        # 数据库建表语句与种子数据
```

## 部署

本项目可直接部署到 [Vercel](https://vercel.com)，在 Vercel 项目设置中配置相同的环境变量即可。
