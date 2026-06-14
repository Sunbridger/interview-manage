-- ============================================
-- 前端 AI Agent 面试知识库 - 数据库 Schema
-- ============================================

-- 启用 UUID 扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 难度枚举类型
DO $$ BEGIN
  CREATE TYPE difficulty_level AS ENUM ('easy', 'medium', 'hard');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================
-- 1. 分类表
-- ============================================
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 预置分类
INSERT INTO categories (name, slug) VALUES
  ('React', 'react'),
  ('LLM', 'llm'),
  ('Prompt Engineering', 'prompt-engineering'),
  ('RAG', 'rag'),
  ('Agent', 'agent'),
  ('工程化', 'engineering')
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- 2. 标签表
-- ============================================
CREATE TABLE IF NOT EXISTS tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE
);

-- ============================================
-- 3. 面试题表
-- ============================================
CREATE TABLE IF NOT EXISTS questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  answer TEXT NOT NULL DEFAULT '',
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  difficulty difficulty_level NOT NULL DEFAULT 'medium',
  source TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- 4. 题目-标签关联表
-- ============================================
CREATE TABLE IF NOT EXISTS question_tags (
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (question_id, tag_id)
);

-- ============================================
-- 5. 用户题目状态表 (单用户场景)
-- ============================================
CREATE TABLE IF NOT EXISTS user_question_state (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question_id UUID NOT NULL UNIQUE REFERENCES questions(id) ON DELETE CASCADE,
  is_favorite BOOLEAN NOT NULL DEFAULT false,
  is_mastered BOOLEAN NOT NULL DEFAULT false,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- 6. API 密钥表 (外部 API 鉴权)
-- ============================================
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- 索引
-- ============================================
CREATE INDEX IF NOT EXISTS idx_questions_category ON questions(category_id);
CREATE INDEX IF NOT EXISTS idx_questions_difficulty ON questions(difficulty);
CREATE INDEX IF NOT EXISTS idx_questions_created_at ON questions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_question_tags_tag ON question_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_user_state_question ON user_question_state(question_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key ON api_keys(key);

-- ============================================
-- 更新时间自动触发器
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER set_updated_at BEFORE UPDATE ON questions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TRIGGER set_updated_at BEFORE UPDATE ON user_question_state
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================
-- 初始种子数据
-- ============================================
INSERT INTO questions (title, content, answer, category_id, difficulty)
SELECT
  'React 中 Virtual DOM 的工作原理是什么？',
  '## 问题\n\n请详细解释 React 中 Virtual DOM 的概念及其工作原理，包括 diff 算法的基本思路。',
  '## 参考答案\n\n### Virtual DOM 概念\n\nVirtual DOM 是真实 DOM 的轻量级 JavaScript 对象表示。React 通过维护一棵虚拟 DOM 树来减少对真实 DOM 的直接操作。\n\n### 工作流程\n\n1. **初始渲染**: 根据组件状态创建一棵 Virtual DOM 树，然后通过 ReactDOM 渲染为真实 DOM\n2. **状态更新**: 当 state 或 props 变化时，创建一棵新的 Virtual DOM 树\n3. **Diff 算法**: 比较新旧两棵 Virtual DOM 树的差异\n4. **Patch**: 只将差异部分更新到真实 DOM\n\n### Diff 算法要点\n\n- **同层比较**: 只比较同一层级的节点，时间复杂度 O(n)\n- **Key 属性**: 通过 key 来标识列表中的每个元素，优化列表比对\n- **类型不同则重建**: 元素类型不同时，直接销毁旧节点并创建新节点',
  (SELECT id FROM categories WHERE slug = 'react'),
  'medium'
WHERE NOT EXISTS (SELECT 1 FROM questions LIMIT 1);

INSERT INTO questions (title, content, answer, category_id, difficulty)
SELECT
  '什么是 LLM 的 Temperature 参数？',
  '## 问题\n\n请解释 LLM（大语言模型）中 Temperature 参数的作用，以及不同取值对生成结果的影响。',
  '## 参考答案\n\n### Temperature 定义\n\nTemperature 是控制 LLM 输出随机性的超参数，通常取值范围在 0 到 2 之间。\n\n### 影响\n\n- **Temperature → 0**: 输出几乎确定性，模型倾向于选择概率最高的 token，适合事实性问答\n- **Temperature = 0.5~0.8**: 平衡创造性和准确性，适合一般对话\n- **Temperature → 1.0+**: 输出更随机、更有创造性，适合创意写作和头脑风暴\n\n### 原理\n\n在 softmax 之前，将 logits 除以 temperature 值：\n```\nP(i) = exp(logit_i / T) / Σ exp(logit_j / T)\n```\nT 越小，概率分布越尖锐（高概率 token 被放大）；T 越大，概率分布越平滑（各 token 概率趋近）。',
  (SELECT id FROM categories WHERE slug = 'llm'),
  'easy'
WHERE NOT EXISTS (SELECT 1 FROM questions WHERE title = '什么是 LLM 的 Temperature 参数？');

INSERT INTO questions (title, content, answer, category_id, difficulty)
SELECT
  'RAG（检索增强生成）的核心流程是什么？',
  '## 问题\n\n请描述 RAG（Retrieval-Augmented Generation）的完整工作流程，以及它解决了 LLM 的哪些问题。',
  '## 参考答案\n\n### RAG 核心流程\n\n1. **文档加载**: 从各种数据源（PDF、网页、数据库）加载文档\n2. **文档分割**: 将长文档切分为合适大小的 chunk（通常 500-1000 tokens）\n3. **向量化（Embedding）**: 使用 embedding 模型将每个 chunk 转换为向量\n4. **存储**: 将向量存入向量数据库（如 Pinecone、Milvus、pgvector）\n5. **检索**: 用户提问时，将问题向量化，在向量数据库中检索最相似的 top-k 个 chunk\n6. **增强提示**: 将检索到的文档片段拼接到 prompt 中\n7. **生成**: LLM 基于增强后的 prompt 生成答案\n\n### 解决的问题\n\n- **知识时效性**: LLM 训练数据有截止日期，RAG 可以注入最新信息\n- **幻觉问题**: 通过提供事实依据减少模型编造\n- **领域知识**: 无需微调即可访问特定领域知识\n- **可追溯性**: 可以引用来源文档',
  (SELECT id FROM categories WHERE slug = 'rag'),
  'medium'
WHERE NOT EXISTS (SELECT 1 FROM questions WHERE title = 'RAG（检索增强生成）的核心流程是什么？');
