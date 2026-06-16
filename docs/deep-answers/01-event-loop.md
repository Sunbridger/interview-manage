## 第一章：事件循环的诞生——为什么 JavaScript 选择了单线程+异步

### 1.1 1995年5月：Brendan Eich 的10天

JavaScript 诞生于 Netscape Navigator 2.0 的浏览器环境中。Brendan Eich 在10天内设计这门语言时面临的核心约束是：**浏览器的主要工作是渲染页面和响应用户交互，而不是做计算**。在当时的硬件条件下（1995年的典型PC是 Intel Pentium 75MHz + 8MB RAM），多线程编程不仅复杂而且容易出错——线程安全问题、死锁、竞态条件对一门"给网页设计师用的脚本语言"来说门槛太高了。

因此 Brendan 做了一个在当时看来理所当然但后来影响深远的设计决策：**JavaScript 是单线程的**。只有一个调用栈（Call Stack），一次只能做一件事。

这个决策的直接后果是：如果一个操作耗时较长（如网络请求、文件读取、定时器），它不能阻塞主线程——否则页面会完全卡死，用户无法滚动、点击、输入。于是有了**异步回调**：把耗时的操作交给浏览器（或Node.js）的底层线程处理，主线程继续执行后续代码，等操作完成后通过回调函数通知主线程。

### 1.2 异步回调的演化：从 Callback Hell 到 Promise 到 async/await

第一代方案是回调函数：

```javascript
// 2005年的典型 AJAX 代码
var xhr = new XMLHttpRequest();
xhr.open('GET', '/api/data');
xhr.onreadystatechange = function() {
  if (xhr.readyState === 4 && xhr.status === 200) {
    doSomething(xhr.responseText);
    // 如果需要链式调用...
    var xhr2 = new XMLHttpRequest();
    xhr2.open('GET', '/api/data2');
    xhr2.onreadystatechange = function() {
      // 回调地狱开始...
    };
  }
};
```

到2010年左右，复杂的前端应用（特别是Node.js服务端程序）中出现了臭名昭著的**回调地狱**（Callback Hell / Pyramid of Doom）——嵌套超过5层时，代码可读性急剧下降，错误处理变得极其困难。

2015年 ES6 引入了 **Promise**：将"未来某个时刻会完成的值"抽象为一等公民。Promise 的状态机（Pending → Fulfilled/Rejected）是不可逆的，这保证了异步操作的确定性：

```javascript
fetch('/api/data')
  .then(res => res.json())
  .then(data => processData(data))
  .catch(err => handleError(err));
```

但 Promise 的 .then() 链仍然是一种"半同步"的写法——开发者仍然需要在回调思维和同步思维之间切换。

2017年 ES2017 引入 **async/await**：基于 Promise 和 Generator 的语法糖，但将异步代码"同步化"到了极致：

```javascript
async function loadData() {
  try {
    const res = await fetch('/api/data');
    const data = await res.json();
    return processData(data);
  } catch (err) {
    handleError(err);
  }
}
```

这个演化的每一步都对应着开发体验的一次革命性提升。但所有这一切的底层基础，都是**事件循环（Event Loop）**——一个从1995年就存在但至今仍然是 JavaScript 运行时最核心的机制。

## 第二章：浏览器事件循环的精确模型

### 2.1 HTML 规范中的事件循环定义

HTML Living Standard 的 [8.1.7.3 Event loops](https://html.spec.whatwg.org/multipage/webappapis.html#event-loops) 章节精确定义了事件循环的工作流程。它与大多数面试题中的简化描述有显著差异。

规范定义的事件循环模型包含以下关键组件：

1. **调用栈（Call Stack）**：同步代码的执行位置，只有一个栈帧
2. **宏任务队列（Task Queue / Macrotask Queue）**：规范中称为 "task queue"，但实际上不是单个队列——浏览器内部有多个任务源（task sources），每个任务源维护自己的队列
3. **微任务队列（Microtask Queue）**：规范中称为 "microtask queue"，比 task queue 更简单——就是单个 FIFO 队列
4. **渲染管线（Rendering Pipeline）**：这是浏览器事件循环独有的阶段——Node.js 没有

### 2.2 事件循环的完整迭代（比面试题中详细得多）

规范规定每轮事件循环执行以下步骤：

```
1. 从 task queue 中取出一个 task（最老的 task），执行它
2. 执行完该 task 后，清空 microtask queue（包括执行过程中新添加的 microtask）
3. 判断是否需要渲染（rendering opportunity）：
   a. 距离上次渲染是否已过去约 16.6ms（60Hz）
   b. 是否有待处理的渲染任务（如 DOM 变更、CSS 动画）
   c. 浏览器是否在后台标签页（切换到后台后渲染频率降低到约 1fps）
4. 如果需要渲染：
   a. 执行 requestAnimationFrame 回调
   b. 执行 IntersectionObserver 回调
   c. 重新计算样式（Style）
   d. 布局（Layout / Reflow）
   e. 绘制（Paint）
   f. 合成（Composite）
5. 如果 task queue 为空，进入空闲状态：
   a. 执行 requestIdleCallback 回调（如果有）
   b. 执行 GC（垃圾回收）
6. 回到步骤 1
```

**关键点（大多数面试题都忽略了这些）**：

- **每个宏任务执行完后，微任务队列必须完全清空**。包括在处理微任务过程中新产生的微任务——这是一个递归过程。如果微任务中又添加了微任务（如 `Promise.then` 中又调用 `Promise.then`），会形成无限循环，阻塞下一个宏任务的执行。
- **requestAnimationFrame 只在渲染帧之前执行**，而不是在每轮事件循环中都执行。如果你在后台标签页中调用 rAF，它会被暂停（或降低到约 1fps）。
- **requestIdleCallback 的触发时机完全不可控**。如果浏览器一直有任务，rIC 可能永远不触发。React 没有使用 rIC 而是自己实现了 Scheduler（基于 MessageChannel），正是因为这个原因。

### 2.3 宏任务和微任务的精确分类

**属于宏任务（Task）的操作**（规范中称为 "task source"）：

| task source | 触发场景 | 优先级（Chrome 内部） |
|---|---|---|
| DOM manipulation | click, keydown, touchstart 等事件 | 高 |
| Timer | setTimeout, setInterval | 中 |
| I/O | fetch 完成, XHR 完成 | 中（取决于资源类型） |
| MessageChannel | postMessage | 中（但比 setTimeout 快） |
| UI rendering | 渲染帧触发 | 高 |
| History traversal | popstate, hashchange | 中 |

**属于微任务（Microtask）的操作**：

| 操作 | API | 备注 |
|---|---|---|
| Promise 回调 | .then(), .catch(), .finally() | 最常见的微任务来源 |
| async/await 后续代码 | await 后面的代码 | 本质上是 Promise.then 的语法糖 |
| queueMicrotask | queueMicrotask(fn) | 显式添加微任务的 API（2019年引入） |
| MutationObserver | new MutationObserver(callback) | DOM 变化检测 |
| process.nextTick | process.nextTick(fn) | **仅 Node.js**，优先级比 Promise 更高 |

### 2.4 浏览器内部的不同任务队列

Chromium 源码中，Blink 渲染引擎实际上维护了多个不同优先级的 task queue：

```
// Chromium 中的 task queue 类型（简化版）
enum class TaskType {
  kNetworking,          // 网络请求
  kTimer,               // 定时器
  kPostedMessage,       // postMessage
  kUserInteraction,     // 用户输入（最高优先级）
  kDOMManipulation,     // DOM 操作
  kIdleTask,            // rIC 回调
  kInternal,            // 浏览器内部任务
};
```

事件循环从这些队列中选择 task 时并不是简单的 FIFO。浏览器内部使用一个**优先级评分系统**来决定先取哪个队列中的任务。例如：用户点击事件的优先级远高于 setTimeout 回调，即使 setTimeout 先被添加到队列中——用户的点击事件仍然会被优先处理。这是浏览器"响应性"（Responsiveness）的底层保障。

## 第三章：Node.js 事件循环——libuv 的六阶段模型

### 3.1 Node.js 和浏览器事件循环的根本差异

Node.js 使用的是 libuv 库提供的事件循环。与浏览器相比，关键差异：

1. **没有渲染阶段**。Node.js 不需要处理 UI 渲染，所以不存在 rAF、Layout、Paint 等阶段
2. **六个不同的阶段**。每个阶段处理特定类型的回调
3. **process.nextTick 的微任务队列在 Promise 队列之前**。Node.js 中微任务有两个队列：nextTickQueue（更高优先级）和 PromiseQueue
4. **I/O 回调的优先顺序不同**。Node.js 的 I/O 阶段专门处理网络和文件系统回调

### 3.2 libuv 六阶段详解

```
   ┌───────────────────────────┐
┌─>│       1. timers           │  setTimeout(fn, delay) / setInterval(fn, delay)
│  └─────────────┬─────────────┘
│  ┌─────────────┴─────────────┐
│  │    2. pending callbacks   │  上轮延迟的系统操作回调（TCP 错误等）
│  └─────────────┬─────────────┘
│  ┌─────────────┴─────────────┐
│  │      3. idle, prepare     │  Node.js 内部使用（开发者不可见）
│  └─────────────┬─────────────┘
│  ┌─────────────┴─────────────┐
│  │        4. poll            │  ** 最重要的阶段 **：接收 I/O 事件
│  └─────────────┬─────────────┘  如果 poll 队列为空：
│  ┌─────────────┴─────────────┐     - 有 setImmediate → 进入 check
│  │        5. check           │     - 有 timer 到期 → 回到 timers
│  └─────────────┬─────────────┘     - 都没有 → 阻塞等待（等待新的 I/O 事件）
│  ┌─────────────┴─────────────┐
└──┤    6. close callbacks     │  socket.on('close', ...)
   └───────────────────────────┘
```

### 3.3 process.nextTick 的优先级陷阱

**process.nextTick 不是事件循环的阶段之一**。它会在每个阶段转换时（从一个阶段进入下一个阶段的间隙）立即清空 nextTickQueue 和 PromiseQueue。这意味着：

```javascript
const fs = require('fs');

fs.readFile('file.txt', () => {
  // 这个回调在 poll 阶段执行
  setTimeout(() => console.log('timeout'), 0);
  setImmediate(() => console.log('immediate'));
  process.nextTick(() => console.log('nextTick'));
  Promise.resolve().then(() => console.log('promise'));
});

// 在 I/O 回调（poll 阶段）中的输出：
// nextTick → promise → immediate → timeout
// （注意：I/O 回调中 setImmediate 一定先于 setTimeout）
```

但如果这段代码不在 I/O 回调中（在模块顶层执行），`setTimeout` 和 `setImmediate` 的顺序是不确定的——因为 setTimeout(fn, 0) 实际上经过了一个 clamp 处理（Node.js 中最小为 1ms），而 setImmediate 在 check 阶段始终会执行。

**递归调用 process.nextTick 的危险**：
```javascript
// 这会永远卡住事件循环！永远不会进入下一阶段
function dangerous() {
  process.nextTick(dangerous);
}
dangerous();
```
由于 nextTickQueue 在每个阶段转换时必须完全清空，递归 nextTick 会让事件循环永远卡在"清空 nextTickQueue"这一步。

### 3.4 Node.js 11+ 的微任务行为对齐

Node.js 11 之前，微任务在每个阶段结束时才清空。Node.js 11+ 改为与浏览器对齐：**每个宏任务完成后立即清空微任务**。这个改动使得在 Node.js 中写的 async/await 代码的行为与浏览器中更加一致，但也可能导致一些依赖于旧行为的代码出现问题。

## 第四章：async/await 在事件循环中的精确行为

### 4.1 await 是 Promise.then 的语法糖——但比你想的更精确

```javascript
async function foo() {
  console.log(2);
  await null;          // ← 等价于 return Promise.resolve(null).then(() => {
  console.log(4);      //        console.log(4);
}                      //    });
console.log(1);
foo().then(() => console.log(5));
console.log(3);

// 输出：1 → 2 → 3 → 4 → 5
```

详细执行流程：
1. `console.log(1)` 执行 → **1**
2. 调用 `foo()`：
   - `console.log(2)` 执行 → **2**
   - `await null` → `Promise.resolve(null).then(resume)`
   - resume（即 `console.log(4)` 和 `.then(() => console.log(5))` 的返回）作为微任务入队 [m1]
3. `console.log(3)` 执行 → **3**
4. 宏任务完成，清空微任务队列：
   - m1 执行：`console.log(4)` → **4**
   - 返回 `undefined` → `.then(() => console.log(5))` 作为微任务入队 [m2]
   - m2 执行：**5**

**核心理解**：`await` 后面的所有代码都被包装成了微任务。这意味着：
- 同步代码全部执行完毕后，才会执行 await 后面的代码
- await 后面的代码比 .then() 中注册的回调更早入队

### 4.2 forEach 中的 async/await 陷阱

```javascript
// ❌ 错误：forEach 不会等待 async 回调
[1, 2, 3].forEach(async (item) => {
  await fetch(`/api/${item}`);
});
console.log('done'); // 立即打印，不等待 fetch 完成

// ✅ 正确：for...of 会等待每次迭代的 await
for (const item of [1, 2, 3]) {
  await fetch(`/api/${item}`); // 串行执行
}
console.log('done'); // 所有 fetch 完成后才打印

// ✅ 并行执行
await Promise.all([1, 2, 3].map(item => fetch(`/api/${item}`)));
```

`Array.prototype.forEach` 的设计不支持 async 回调——它忽略回调的返回值（包括 Promise）。而 `for...of` 会正确等待每次迭代中的 `await`。

## 第五章：requestAnimationFrame 和 requestIdleCallback——浏览器渲染帧内的特殊任务

### 5.1 rAF 的生命周期与渲染帧绑定

rAF 不是一个"高优先级的 setTimeout"——它在事件循环中有专门的位置：**渲染帧之前**。

```javascript
// 理解 rAF 的执行时机
setTimeout(() => console.log('timeout'), 0);
requestAnimationFrame(() => console.log('rAF'));
Promise.resolve().then(() => console.log('promise'));
console.log('sync');

// 典型输出（Chrome）：sync → promise → rAF → timeout
// 但如果浏览器判断不需要渲染，rAF 可能被跳过
```

**关键行为**：
- 页面在后台标签页时，rAF 回调完全暂停（节省CPU和GPU资源）
- 多个 rAF 回调在同一帧内执行
- rAF 的回调参数是一个高精度时间戳（DOMHighResTimeStamp），与 performance.now() 使用同一时间基准——这比 Date.now() 更适合做动画计算

### 5.2 requestIdleCallback 的生产限制

```javascript
// deadline 有两个关键属性
requestIdleCallback((deadline) => {
  console.log('剩余时间:', deadline.timeRemaining()); // 通常只有 5-15ms
  console.log('是否超时:', deadline.didTimeout);       // true 表示这个回调是迫不得已才执行的
  
  // 在 deadline.timeRemaining() > 0 期间处理任务
  while (deadline.timeRemaining() > 0 && tasks.length > 0) {
    processTask(tasks.shift());
  }
  
  // 如果还有剩余任务，再次注册
  if (tasks.length > 0) {
    requestIdleCallback(arguments.callee);
  }
}, { timeout: 1000 }); // 最多等待 1s，超时后即使没有空闲也必须执行
```

**为什么 React 不用 rIC**：
1. **Safari 不支持**（这是最重要的原因之一）。虽然 Safari 在近期的版本中开始实现，但 React 需要跨浏览器兼容
2. **触发时机不可控**。如果页面正在做复杂动画（如滚动），浏览器可能持续繁忙，rIC 可能被延迟数百毫秒
3. **不够精细**。React 需要更精细的控制——知道哪些更新是紧急的（用户输入响应），哪些可以延迟（离屏内容的渲染）

React 自己实现了 **Scheduler** 包，使用 **MessageChannel** 作为宏任务调度器：

```javascript
// React Scheduler 简化版原理
const channel = new MessageChannel();
const port = channel.port2;

channel.port1.onmessage = () => {
  // 执行优先级最高的任务
  const task = taskQueue.pop();
  const didTimeout = performTask(task);
  if (!didTimeout && taskQueue.length > 0) {
    port.postMessage(null); // 继续调度
  }
};

// 比 setTimeout(fn, 0) 更好：MessageChannel 没有 4ms 的最小延迟限制
function scheduleTask(task) {
  taskQueue.push(task);
  port.postMessage(null);
}
```

## 第六章：Web Worker——JavaScript 的"真正的多线程"

### 6.1 Worker 类型全览

JavaScript 有三种 Worker，每种有不同用途：

| 类型 | API | 共享内存 | DOM 访问 | 适用场景 |
|------|-----|---------|---------|---------|
| Dedicated Worker | `new Worker(url)` | SharedArrayBuffer | ❌ | 通用计算 |
| Shared Worker | `new SharedWorker(url)` | SharedArrayBuffer | ❌ | 多标签页共享 |
| Service Worker | `navigator.serviceWorker.register(url)` | ❌ | ❌ | 缓存/推送/离线 |

### 6.2 Worker 中的事件循环

**Worker 有自己独立的事件循环**——与主线程的事件循环完全隔离。这意味着：
- Worker 中的 `setTimeout`/`Promise` 不阻塞主线程
- Worker 和主线程通过 `postMessage` 通信——这是一个异步操作（消息会作为主线程的一个 task 排队）
- 如果 Worker 中进行 CPU 密集计算，不会影响主线程的渲染——这就是 Worker 的最大价值

```javascript
// 主线程
const worker = new Worker('heavy-task.js');
worker.postMessage({ data: largeArray });
worker.onmessage = (e) => {
  console.log('计算结果:', e.data);
  // 此时主线程的 UI 仍然流畅
};

// heavy-task.js (Worker 线程)
self.onmessage = (e) => {
  const result = performHeavyComputation(e.data);
  self.postMessage(result);
};
```

### 6.3 SharedArrayBuffer + Atomics——Web 的多线程同步原语

2017年引入的 SharedArrayBuffer 和 Atomics 让 JavaScript 拥有了类似操作系统级别的线程同步能力：

```javascript
// 主线程
const sab = new SharedArrayBuffer(1024);
const view = new Int32Array(sab);
const worker = new Worker('worker.js');
worker.postMessage({ buffer: sab });

// worker.js
self.onmessage = (e) => {
  const view = new Int32Array(e.data.buffer);
  
  // Atomics.wait：阻塞 Worker 线程直到值发生变化
  Atomics.wait(view, 0, 0); // 等待 index 0 的值不再是 0
  
  // 现在可以安全地读取和修改共享内存
  const value = Atomics.load(view, 0);
  Atomics.store(view, 0, value + 1);
  
  // Atomics.notify：唤醒等待的线程
  Atomics.notify(view, 0, 1);
};
```

**重要安全限制**：由于 Spectre/Meltdown 漏洞，SharedArrayBuffer 在 2018年1月被所有浏览器默认禁用。2020年后，浏览器要求页面必须启用 **cross-origin isolation**（设置 `Cross-Origin-Opener-Policy` 和 `Cross-Origin-Embedder-Policy` HTTP 头）才能使用 SharedArrayBuffer。

## 第七章：生产实践——事件循环相关的性能陷阱

### 7.1 微任务炸弹（Microtask Bomb）

```javascript
// 这会让你的页面完全卡死
function microtaskBomb() {
  Promise.resolve().then(() => {
    console.count('microtask');
    microtaskBomb(); // 每次执行都添加新的微任务
  });
}
microtaskBomb();
// setTimeout 永远不会执行，页面永远不渲染！
```

**真实案例**：2021年，React Router v6 的一个早期版本中，`useNavigation` Hook 在状态更新时期触发了 Promise 链，在某些边缘情况下产生了"微任务风暴"——数千个微任务在主线程上排队，导致用户交互延迟超过 500ms。修复方案是将部分非关键的更新移到 `requestAnimationFrame` 中。

### 7.2 定时器的精度陷阱

```javascript
// setTimeout(fn, 0) 不是真正的 0ms
// 嵌套超过 5 层后，最小延迟强制为 4ms（HTML 规范要求）
for (let i = 0; i < 10; i++) {
  setTimeout(() => {
    console.log(i, performance.now());
  }, 0);
}
// 前 5 个可能在 ~1ms 左右执行（取决于浏览器）
// 后 5 个的间隔至少 4ms

// setInterval 也有同样的限制
// 而且 setInterval 不会等待回调执行完——如果回调执行时间 > 间隔时间，会堆积！
```

### 7.3 React 18 的 Automatic Batching——减少不必要的事件循环开销

```javascript
// React 17：只在 React 事件处理器中批处理
setTimeout(() => {
  setCount(c => c + 1); // 触发一次重渲染
  setFlag(f => !f);     // 再触发一次重渲染！
}, 1000);

// React 18：所有更新都自动批处理
setTimeout(() => {
  setCount(c => c + 1);
  setFlag(f => !f);     // 两次更新合并为一次重渲染
}, 1000);
// 原理：React 18 使用微任务（queueMicrotask）来批处理状态更新
// 多个 setState 在同一次微任务中合并，只产生一次重渲染
```

## 第八章：关联知识网络

事件循环不是一个孤立的概念。它与以下领域深度关联：

1. **V8 引擎的优化去优化**：当函数中的代码触发大量微任务时，V8 可能判断该函数"不再简单"而触发去优化（deoptimization），从 TurboFan 编译的优化代码回退到解释器。大量微任务 = 更多函数调用 = 更频繁的栈帧切换 = V8 更难做内联优化。

2. **Web Vitals 中的 INP（Interaction to Next Paint）**：INP 替代 FID 后，衡量的是"整个页面生命周期中最慢的交互延迟"。一个 >50ms 的长任务（可能包含大量微任务）会直接推高 INP。排查 INP 问题往往需要追踪事件循环中的长任务来源。

3. **浏览器渲染管线的帧预算**：一帧 16.6ms 中，JS 执行、样式计算、布局、绘制、合成各占一部分。如果 JS（宏任务 + 微任务）执行时间过长（如 >10ms），留给渲染的时间就不够了——导致掉帧（jank）。

4. **Node.js 的 cluster 模块和 Worker Threads**：Cluster 通过 fork 多个进程（每个有自己的事件循环）来利用多核。Worker Threads 则共享同一个进程但拥有独立的 V8 实例和独立的事件循环。

5. **Rust 的 async/await 和 Future trait**：Rust 的 async fn 编译为实现了 Future trait 的状态机。与 JS 不同，Rust 的 Future 是"零成本抽象"——没有堆分配、没有引用计数、编译时完全单态化。但 Rust 的 async 生态也面临自己的"事件循环"问题——需要 tokio 或 async-std 这样的运行时来驱动 Future 的执行（类似 JS 的浏览器事件循环或 Node.js 的 libuv）。

6. **Go 的 goroutine 和调度器**：Go 的 goroutine 是用户态协程，由 Go 运行时（而非操作系统）调度。多个 goroutine 复用少量 OS 线程——当某个 goroutine 阻塞时，运行时自动将其他 goroutine 切换到可用线程。这与 JS 的单线程事件循环形成鲜明对比：Go 用"多对多"的调度模型（M个goroutine 对 N个OS线程），JS 用"事件循环+异步回调"。

7. **Python 的 asyncio 事件循环**：Python 的 asyncio 也是单线程事件循环（与 JS 极为相似）。`async/await` 语法几乎一致，`asyncio.create_task` 类似 JS 的 `Promise` 但不是"立即入微任务队列"——Python 的协程在显式 `await` 时才切换。`asyncio.gather` 对应 `Promise.all`。

8. **浏览器扩展（Web Extension）的事件循环独立性**：Content Script、Background Script（Service Worker）、Popup Page 各自有独立的事件循环。它们通过 `runtime.sendMessage` 通信——消息跨事件循环传递，由浏览器内部的 IPC 机制处理。
