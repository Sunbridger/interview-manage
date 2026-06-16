/**
 * 批量导入 JavaScript 事件循环面试题（5 道）
 * 运行: npx tsx scripts/seed-eventloop.ts
 */

const BASE = "http://localhost:3000";

async function post(path: string, body: unknown) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Referer: BASE },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function main() {
  // 1. 创建分类
  console.log("Creating JavaScript category...");
  const category = await post("/api/categories", { name: "JavaScript", slug: "javascript" });
  const categoryId = category.id;

  // 2. 创建标签
  const tagMap: Record<string, string> = {};
  for (const name of ["事件循环", "宏任务", "微任务", "async/await", "Node.js", "Promise"]) {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const tag = await post("/api/tags", { name, slug });
    if (tag.id) tagMap[name] = tag.id;
  }

  // 3. 五道题目
  const questions = [
    {
      title: "什么是事件循环？简述宏任务和微任务的区别",
      difficulty: "medium",
      tagNames: ["事件循环", "宏任务", "微任务"],
      content: "请解释 JavaScript 的事件循环（Event Loop）机制，并说明宏任务（MacroTask）和微任务（MicroTask）的区别。",
      answer: `## 事件循环

JavaScript 是单线程语言，事件循环是其实现异步编程的核心。

### 执行流程

1. 同步代码进入调用栈执行
2. 异步任务交给浏览器/Node.js 线程处理
3. 异步任务完成后，回调进入任务队列
4. 调用栈清空后，事件循环从队列取回调执行

### 宏任务 vs 微任务

| 特性 | 宏任务 | 微任务 |
|------|--------|--------|
| 来源 | setTimeout, setInterval, I/O, UI渲染 | Promise.then, MutationObserver, queueMicrotask |
| 执行时机 | 每轮取一个执行 | 宏任务后立即清空全部 |
| 优先级 | 低 | 高 |

### 关键规则

**每个宏任务执行完毕后，立即清空微任务队列，然后进入下一轮。**

\`\`\`javascript
console.log('1');
setTimeout(() => console.log('2'), 0);
Promise.resolve().then(() => console.log('3'));
console.log('4');
// 输出: 1 -> 4 -> 3 -> 2
\`\`\`

同步代码(1,4) -> 清空微任务(3) -> 下一轮宏任务(2)`,
    },
    {
      title: "分析代码输出顺序（setTimeout + Promise 混合）",
      difficulty: "hard",
      tagNames: ["事件循环", "宏任务", "微任务", "Promise"],
      content: `写出以下代码的输出顺序并解释：

\`\`\`javascript
console.log('1');

setTimeout(() => {
  console.log('2');
  Promise.resolve().then(() => console.log('3'));
}, 0);

new Promise((resolve) => {
  console.log('4');
  resolve();
}).then(() => {
  console.log('5');
  setTimeout(() => console.log('6'), 0);
});

setTimeout(() => console.log('7'), 0);

console.log('8');
\`\`\``,
      answer: `### 输出: 1 -> 4 -> 8 -> 5 -> 2 -> 3 -> 7 -> 6

### 逐步分析

**同步代码执行:**
- console.log('1') -> 打印 1
- setTimeout(2+3) -> 宏任务队列 [T1]
- new Promise executor 同步 -> 打印 4, .then(5+6) -> 微任务 [M1]
- setTimeout(7) -> 宏任务 [T1, T2]
- console.log('8') -> 打印 8

**清空微任务:**
- 执行 M1: 打印 5, setTimeout(6) -> 宏任务 [T1, T2, T3]

**第二轮 (T1):**
- 打印 2, Promise.then(3) -> 微任务
- 清空微任务: 打印 3

**第三轮 (T2):**
- 打印 7

**第四轮 (T3):**
- 打印 6

### 关键点
1. new Promise 的 executor 是同步执行的
2. 微任务中产生新宏任务 -> 排到队列末尾
3. 每轮: 一个宏任务 -> 全部微任务 -> 下一个宏任务`,
    },
    {
      title: "async/await 在事件循环中的执行顺序",
      difficulty: "medium",
      tagNames: ["事件循环", "async/await", "微任务", "Promise"],
      content: `分析下列代码的输出顺序，说明 async/await 在事件循环中的执行机制：

\`\`\`javascript
async function async1() {
  console.log('a1 start');
  await async2();
  console.log('a1 end');
}

async function async2() {
  console.log('a2');
}

console.log('script start');
setTimeout(() => console.log('setTimeout'), 0);
async1();

new Promise((resolve) => {
  console.log('p1');
  resolve();
}).then(() => {
  console.log('p2');
});

console.log('script end');
\`\`\``,
      answer: `### 输出: script start -> a1 start -> a2 -> p1 -> script end -> a1 end -> p2 -> setTimeout

### 逐步分析

**同步执行:**
1. 'script start'
2. setTimeout -> 宏任务 [M1]
3. async1(): 'a1 start', await async2(): 'a2', await 后代码 -> 微任务 [m1]
4. new Promise executor: 'p1', .then -> 微任务 [m1, m2]
5. 'script end'

**清空微任务:**
6. m1: 'a1 end'
7. m2: 'p2'

**下一轮宏任务:**
8. M1: 'setTimeout'

### 核心理解

await 本质是 Promise.then 的语法糖:
\`\`\`javascript
await async2();
console.log('a1 end');
// 等价于:
async2().then(() => { console.log('a1 end'); });
\`\`\`

await 后的代码进入微任务队列，与 .then 回调同轮执行，按注册顺序。`,
    },
    {
      title: "requestAnimationFrame 在事件循环中的执行时机",
      difficulty: "hard",
      tagNames: ["事件循环", "宏任务", "微任务"],
      content: `requestAnimationFrame (rAF) 和 setTimeout 的执行时机有什么本质区别？它们在浏览器事件循环中分别属于哪个阶段？分析以下代码的输出：

\`\`\`javascript
setTimeout(() => console.log('timeout'), 0);
requestAnimationFrame(() => console.log('rAF'));
Promise.resolve().then(() => console.log('promise'));
console.log('sync');
\`\`\``,
      answer: `### 典型输出: sync -> promise -> rAF -> timeout

(rAF 和 timeout 顺序取决于浏览器刷新率，通常 rAF 先于 timeout)

### 浏览器事件循环完整模型

1. 执行一个宏任务
2. 清空微任务队列
3. 判断是否需要渲染 (约 16.6ms, 60fps)
4. 执行 rAF 回调 (渲染前)
5. 渲染: Style -> Layout -> Paint -> Composite
6. 下一轮循环

### setTimeout vs rAF

| | setTimeout(fn, 0) | requestAnimationFrame |
|---|---|---|
| 队列 | 宏任务队列 | 渲染阶段回调队列 |
| 执行时机 | 每轮都可能执行 | 仅在渲染帧前批量执行 |
| 最小间隔 | ~4ms (嵌套5层后) | ~16.6ms (60fps) |
| 页面不可见 | 继续执行(降频至1s) | 暂停执行 |
| 用途 | 延迟执行、分片 | 动画、批量DOM更新 |

### 逐步分析
1. sync: 同步打印
2. Promise.then: 微任务, 打印 promise
3. 浏览器判断需要渲染: 执行 rAF 回调, 打印 rAF
4. 渲染完成, 下一轮: setTimeout 回调, 打印 timeout

### 面试加分点
- rAF 在渲染前执行, 适合批量 DOM 操作避免多次回流
- 页面切后台时 rAF 自动暂停, setTimeout 仍会执行
- 动画应使用 rAF 与刷新率同步, 避免掉帧`,
    },
    {
      title: "Node.js 事件循环与浏览器事件循环的区别",
      difficulty: "medium",
      tagNames: ["事件循环", "Node.js", "宏任务", "微任务"],
      content: `Node.js 的事件循环和浏览器的事件循环有哪些核心区别？请说明 process.nextTick 和 setImmediate 的执行阶段和优先级差异。`,
      answer: `### 核心区别

| 维度 | 浏览器 | Node.js |
|------|--------|---------|
| 设计目标 | 用户交互、UI渲染 | I/O处理、服务端高并发 |
| 渲染阶段 | 有 (rAF -> Style -> Layout -> Paint) | 无 |
| 特有机制 | rAF, requestIdleCallback | process.nextTick, setImmediate |
| setImmediate | 无 | check 阶段执行 |
| process.nextTick | 无 | 每个阶段切换前执行 |

### Node.js 事件循环的 6 个阶段

按照优先级从高到低：

1. **timers** — setTimeout / setInterval 回调
2. **pending callbacks** — 系统操作的回调（如 TCP 错误）
3. **idle, prepare** — 内部使用
4. **poll** — 获取新的 I/O 事件（最重要）
5. **check** — setImmediate 回调
6. **close callbacks** — 关闭事件回调

事件循环按顺序执行各阶段，每个阶段清空当前队列后进入下一阶段。

### process.nextTick vs setImmediate

| 特性 | process.nextTick | setImmediate |
|------|-------------------|--------------|
| 执行时机 | 每个阶段切换前立即执行 | check 阶段 |
| 优先级 | 高于所有微任务 | 宏任务级别 |
| 嵌套风险 | 递归调用会卡住事件循环 | 安全 |

### 代码示例

\`\`\`javascript
// Node.js 环境
setTimeout(() => console.log('timeout'), 0);
setImmediate(() => console.log('immediate'));
process.nextTick(() => console.log('nextTick'));
Promise.resolve().then(() => console.log('promise'));

// 输出: nextTick -> promise -> timeout -> immediate
// 或: nextTick -> promise -> immediate -> timeout
// (非I/O回调中 setTimeout 和 setImmediate 顺序不保证)
\`\`\`

### 关键面试要点
1. 微任务在 Node 中有两个队列: nextTickQueue(更高优先级) 和 PromiseQueue
2. process.nextTick 递归调用可能导致堆栈溢出
3. 在 I/O 回调中, setImmediate 一定先于 setTimeout(fn, 0) 执行
4. Node 11+ 微任务行为与浏览器对齐: 每个宏任务后清空微任务`,
    },
  ];

  for (const q of questions) {
    const tagIds = q.tagNames.map((n) => tagMap[n]).filter(Boolean);
    console.log(`Creating: ${q.title.slice(0, 50)}...`);
    const result = await post("/api/questions", {
      title: q.title,
      content: q.content,
      answer: q.answer,
      difficulty: q.difficulty,
      category_id: categoryId,
      tag_ids: tagIds,
    });
    if (result.id) {
      console.log(`  OK: ${result.id}`);
    } else {
      console.log(`  FAIL: ${JSON.stringify(result)}`);
    }
  }

  console.log("\nDone. 5 event loop questions created.");
}

main().catch(console.error);
