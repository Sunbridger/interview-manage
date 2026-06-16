## 第一章：TypeScript 类型系统——不只是"JS加类型"

### 1.1 结构类型系统 vs 名义类型系统

TypeScript 使用结构类型（Structural Typing）而非名义类型（Nominal Typing）。两个类型如果形状相同就是兼容的——即使它们的名字完全不同。这与 Java/C# 的名义类型（必须显式 implements 或 extends）有根本差异。

```typescript
interface Point2D { x: number; y: number; }
interface Vector2D { x: number; y: number; }

const p: Point2D = { x: 1, y: 2 };
const v: Vector2D = p; // ✅ 没问题！形状相同所以兼容
```

这个设计决策是为了兼容 JavaScript 的"鸭子类型"传统——在 JS 中，对象的类型由"它能做什么"决定，而非"它叫什么"。但这也意味着 TypeScript 的类型安全在结构层面而非语义层面——两个结构相同但语义不同的类型（如 Point 和 Vector）在 TS 中互相兼容。

如何实现"名义类型"？使用**品牌类型（Branded Types）**：
```typescript
type Point2D = { x: number; y: number; __brand: 'Point2D' };
type Vector2D = { x: number; y: number; __brand: 'Vector2D' };
// 现在 Point2D 和 Vector2D 不兼容——__brand 字段不同
```

### 1.2 类型收窄（Type Narrowing）——TypeScript 的类型流分析

TypeScript 编译器执行控制流分析（Control Flow Analysis），追踪变量在代码不同分支中的可能类型：

```typescript
function process(value: string | number) {
  if (typeof value === 'string') {
    // 这个分支内 value 被收窄为 string
    return value.toUpperCase();
  }
  // 这个分支内 value 被收窄为 number
  return value.toFixed(2);
}
```

TypeScript 支持以下收窄方式：typeof、instanceof、in、===/!==（字面量比较）、if/switch、自定义 type guard（`arg is Type` 返回类型谓词）、assertion function（`asserts arg is Type`）。

### 1.3 never——类型系统中的"不可能"

never 表示"永远不可能发生的类型"。它不是 void（void 表示"没有返回值"，函数正常执行结束）。never 表示"这个函数永远不会正常结束"——要么抛异常，要么无限循环。在类型层面，never 是任何类型的子类型——意味着任何类型都可以赋值给 never？不——是任何类型都不能赋值给 never（因为 never 是空集）。never 是联合类型中的"吸收元"：`never | T = T`。

never 的核心应用：**穷尽性检查**——在 switch/default 分支中使用，确保所有可能类型都被处理。如果将来有人添加了新类型，TS 编译报错——"这个分支现在可达了"。

## 第二章：泛型和高级类型——TypeScript 的类型级编程

### 2.1 泛型约束和条件类型的深度组合

泛型不只是"让类型参数化"——它是类型的函数。条件类型是类型的 if/else。模板字面量类型是类型的字符串处理。将这些组合起来，TypeScript 可以做到编译时的"类型演算"——在不需要运行时校验的情况下保证类型安全。

实际应用：Prisma 的类型生成（自动从数据库 schema 推导 CRUD 操作的参数和返回类型）、Zod 的 z.infer（从运行时校验 schema 反推 TypeScript 类型）、tRPC 的端到端类型安全（前后端共享类型定义）。

### 2.2 infer 关键字——类型的模式匹配引擎

```typescript
// ReturnType——从函数类型中提取返回值
type ReturnType<T> = T extends (...args: any[]) => infer R ? R : never;

// Awaited——递归解包 Promise
type Awaited<T> = T extends Promise<infer U> ? Awaited<U> : T;

// 递归类型的典型应用：将嵌套对象的所有属性变为可选
type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] };
```

infer 的能力边界：只能在条件类型的 extends 子句中使用、推断的是"结构位置"（函数返回类型、Promise 内类型、数组元素类型等）、递归推断受 TypeScript 尾递归优化限制（TS 4.5+ 最大递归深度约 1000 层）。

### 2.3 TypeScript 5.x 的新增能力

- const 类型参数：`function fn<const T>(x: T)`——T 被推断为字面量类型（非 string 而是 'hello'）
- satisfies 操作符：确保表达式满足某个类型但不改变其推断类型——解决了 as const 和类型注解之间的空白
- using 声明（Stage 3）：显式资源管理——类似 RAII 模式，块作用域结束时自动释放资源

## 第三章：工程化 TypeScript——从个人项目到大型团队

### 3.1 项目结构中的类型管理

Monorepo 中的类型共享策略：
1. 共享 types 包（@myorg/types）——所有子包的公共类型定义，单一真相来源
2. 类型导出约定——只导出公共 API 需要的类型，内部类型不导出（减少类型膨胀）
3. 声明文件（.d.ts）的管理——自动生成的（tsc --declaration）和手写的（给无类型的第三方库打补丁）分开管理

### 3.2 渐进式迁移的实际经验

Airbnb 的 TS 迁移（2018-2020，数百万行 JS）的核心教训：
- "先写类型定义再迁移代码"——类型是契约，先明确边界再实现
- allowJs + checkJs:false 作为中间步骤——允许 JS 和 TS 共存但不检查 JS
- 用脚本追踪迁移进度——统计"TS 文件占比"和"strict 模式覆盖率"作为团队 KPI
- 最大的障碍不是技术而是文化——"加类型好麻烦"的心态需要用"类型帮你找到的 bug"来教育

### 3.3 strict 模式每项的含义和开启顺序

1. noImplicitAny（最优先）：禁止隐式 any——第一道防线，所有参数必须有类型
2. strictNullChecks（最困难但价值最大）：null/undefined 不是任何类型的子类型——这意味着每个可能为 null 的值必须显式检查。消除"undefined is not a function"运行时错误的根源
3. strictFunctionTypes：函数参数类型双向协变改为逆变——更安全的回调类型检查
4. strictPropertyInitialization：类属性必须在构造函数中初始化——不依赖 undefined 的默认行为
5. noUncheckedIndexedAccess：访问数组索引/对象属性的结果自动包含 undefined——强制检查

## 第四章：举一反三

1. **Rust 的 trait 和 typeclass**：Haskell 的 typeclass 和 Rust 的 trait 影响了许多语言的设计，包括 TS 的结构类型和 Go 的 interface。核心差异：TS 无需声明实现关系（结构兼容即可），Haskell 和 Rust 需要显式实现（以此获得更好的类型安全性）。

2. **Zod/Valibot 的"反向类型推导"**：传统思维是"先定义 TS 类型再写运行时代码"——Zod 将其翻转：先定义运行时 schema，然后 z.infer 推导出 TS 类型。彻底消除了"类型定义和运行时校验不一致"的问题。

3. **Effect/TS——类型安全的代数效应**：Effect 是一个 TypeScript 库，实现了代数效应（Algebraic Effects）——让错误处理、依赖注入、日志等"副作用"成为类型系统的一部分。`Effect<Requirements, Error, Value>` 三个类型参数精确描述了函数的所有可能结果。

4. **Drizzle ORM 的类型安全 SQL**：用 TS 类型系统构建类型安全的 SQL 查询——`db.select().from(users).where(eq(users.id, 1))` 的类型自动包含了 users 表的所有列，且 WHERE 条件类型受参数值类型的约束。

5. **Template Literal Types 对类型级路由的实现**：TanStack Router 用模板字面量类型实现了编译时路由参数类型检查——`/users/${string}/posts/${number}` 这样的路由路径在 TS 层面就能保证参数类型的安全。
