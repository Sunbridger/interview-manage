## 第一章：Stack Reconciler 的极限——为什么 React 必须重写核心

### 1.1 React 15 的同步递归噩梦

React 15 的 Stack Reconciler 使用递归遍历 Virtual DOM 树。递归的致命问题：**一旦开始就不能中断**。React 团队在 2016 年的一个演示中展示了这个问题：一个包含 3000+ 个节点的组件树，在一次状态更新后，Stack Reconciler 花费了约 160ms 完成 diff 计算——是 60fps 预算（16.6ms）的 10 倍。结果：用户在输入框中打字时，每一帧都因为 React 的计算而严重掉帧。

这个问题不是因为 React 的 diff 算法不够快（O(n) 已经是理论最优）——而是因为 **JS 是单线程的，diff 计算独占主线程**。在 diff 完成之前，浏览器无法处理用户输入、无法渲染新帧、无法执行任何其他操作。

当时的权宜之计：
- `shouldComponentUpdate`：手动告诉 React "这个子树不需要 diff"
- `PureComponent`：对 props/state 做浅比较，跳过无变化的渲染
- `requestAnimationFrame` + 任务分片：将一个大 setState 拆成多个小 setState，每帧处理一部分（但代码极其丑陋）

但这些只是止痛药而非解药。根本矛盾是：**React 的 diff 模型本身是不可中断的**。

### 1.2 Fiber 的灵感来源

React 团队从多个来源汲取了灵感：
- **操作系统的进程调度**：CPU 时间片轮转——每个进程运行一小段时间后被抢占，切换到另一个进程
- **浏览器的 requestIdleCallback**：在浏览器空闲时执行低优先级任务（React 后来自己实现了 Scheduler 因为 rIC 有跨浏览器问题）
- **游戏引擎的帧循环**：每帧做固定量的工作，多余的延后到下一帧

Fiber 的核心思想非常简单但影响深远：**将 Virtual DOM 的递归 diff 拆成增量式的、可中断的小工作单元**。每个工作单元就是一个 Fiber Node（对应 Virtual DOM 中的一个节点）。React 处理一个 Fiber Node，检查是否还有时间，有就继续，没有就暂停并让出主线程。

## 第二章：Fiber 架构的完整数据结构

### 2.1 Fiber Node——不只"多加了几个指针"

Fiber Node 与 Virtual DOM 节点（React Element）的关系是"实例与描述"的关系：

- **React Element**：每次 render 时创建，描述 UI "长什么样"（type、props、children）。不可变的轻量对象。
- **Fiber Node**：持久化的、可变的"工作单元"。包含组件的状态、副作用、以及指向其他 Fiber Node 的三个指针。

```typescript
// Fiber Node 的核心结构（简化版）
type Fiber = {
  // 实例信息
  tag: WorkTag;          // FunctionComponent | ClassComponent | HostComponent | ...
  key: null | string;
  elementType: any;      // 组件函数或类
  type: any;             // 对于 HostComponent 是 DOM 标签名（如 'div'）
  stateNode: any;        // 对于 HostComponent 是真实 DOM 节点

  // 三个指针——Fiber 是链表而非树
  return: Fiber | null;  // 父 Fiber（处理完后回到这里）
  child: Fiber | null;   // 第一个子 Fiber
  sibling: Fiber | null; // 下一个兄弟 Fiber
  
  // 工作相关
  pendingProps: any;     // 即将应用的 props
  memoizedProps: any;    // 上次渲染的 props
  memoizedState: any;    // 上次渲染的 state（Hooks 链表存储在这里！）
  updateQueue: UpdateQueue | null; // 状态更新队列
  
  // 副作用
  flags: Flags;          // Placement | Update | Deletion | ...
  subtreeFlags: Flags;   // 子树中的副作用标记
  deletions: Fiber[] | null; // 待删除的子节点清单
  
  // 双缓冲
  alternate: Fiber | null; // 指向另一棵树中的对应 Fiber
};
```

**为什么用链表而非树？** 链表可以自然地支持单向遍历——深度优先（先 child 再 sibling，无 child 时回 return），在任意节点处暂停只需记录当前指针。树结构（如 children 数组）在遍历时需要维护递归栈，而递归栈不可序列化（无法暂停和恢复）。

### 2.2 Hooks 链表——useState 存储的真相

```typescript
// Hooks 以单向链表存储在 fiber.memoizedState 中
type Hook = {
  memoizedState: any;    // 当前 hook 的状态值
  baseState: any;        // 基础状态（用于计算新状态）
  baseQueue: Update<any> | null;
  queue: UpdateQueue<any> | null; // 更新队列
  next: Hook | null;     // 指向下一个 Hook
};

// 每次调用 useState 时：
// 1. 沿 fiber.memoizedState 链表找到对应的 Hook 节点
// 2. 处理该 Hook 的更新队列
// 3. 返回 [memoizedState, dispatch]
// 
// 这就是为什么 Hooks 不能放在条件语句中——
// React 依赖 Hook 链表的顺序来匹配 Hook 和 fiber
```

### 2.3 双缓冲（Double Buffering）——React 的渲染安全网

React 同时维护两棵 Fiber 树：
- **current**：对应当前屏幕上显示内容的 Fiber 树
- **workInProgress**：正在构建的新 Fiber 树

所有工作（diff、状态更新、副作用标记）都在 workInProgress 树上进行。完成后，通过一次原子操作（修改 `root.current` 指针）完成切换——commit 阶段。

**这解决了什么问题？**
1. **错误恢复**：如果 workInProgress 构建过程中出错，current 树仍然完好——用户可以继续使用旧 UI
2. **并发安全**：高优先级更新可以中断低优先级的 workInProgress 构建（丢弃 workInProgress，基于 current 创建新的 workInProgress）
3. **时间切片**：workInProgress 的构建可以暂停/恢复，current 树在过程中保持不变

## 第三章：Render Phase 和 Commit Phase——被严重低估的设计差异

### 3.1 Render Phase（可中断）

Render Phase 遍历 Fiber 树，执行以下操作：
- **beginWork**：进入一个 Fiber Node，处理它（调用函数组件、diff props、标记副作用）
- **completeWork**：离开一个 Fiber Node，收集子树的副作用（subtreeFlags）并创建/更新 DOM 节点

整个 Render Phase 是**纯计算**的——它不修改 DOM。这就是它可以被中断的根本原因：如果你在这棵树只构建了一半的时候暂停，用户看到的还是 current 树对应的旧 UI——一切正常。

```javascript
// React 内部的 workLoop 简化版
function workLoopConcurrent() {
  // 每次 shouldYield() 检查是否还有时间
  // React 使用 5ms 时间切片
  while (workInProgress !== null && !shouldYield()) {
    performUnitOfWork(workInProgress);
  }
}

// shouldYield 的实现
function shouldYield() {
  // 检查当前时间是否超过了 deadline
  // deadline 在每个时间切片开始时设置为 now + 5ms
  const currentTime = performance.now();
  return currentTime >= deadline;
}
```

### 3.2 Commit Phase（不可中断，必须同步执行）

Commit Phase 在 Render Phase 完成后执行（此时 workInProgress 树已完成）。它分为三个子阶段：

```
1. Before Mutation（DOM 变更前）
   - getSnapshotBeforeUpdate 生命周期
   - 调度 useEffect 的清理函数

2. Mutation（DOM 变更）
   - 添加/删除/更新 DOM 节点
   - 更新 ref
   - componentWillUnmount 生命周期

3. Layout（DOM 变更后，同步执行）
   - useLayoutEffect 回调
   - componentDidMount/componentDidUpdate 生命周期
   - 更新 ref（第二次）

→ 然后浏览器绘制

→ Effect（异步）
   - useEffect 回调
```

**Commit Phase 为什么不可中断？**
因为 DOM 已经变更了——如果中断，用户看到的就是"一半新的、一半旧的"UI，视觉上完全不可接受。

## 第四章：Lane 模型——React 优先级调度的数学基础

### 4.1 从 Expiration Time 到 Lane —— 为什么 2020 年做了这个重大重构

React 最初使用 **Expiration Time**（过期时间戳）来表示优先级——每个更新被赋予一个过期时间（如 `now + 5000ms`），越接近过期的更新优先级越高。这个模型简单但存在严重问题：

**Expiration Time 无法表达"一组更新"的概念**。如果用户点击了一个按钮，触发了 A、B、C 三个状态更新，这三个更新应该作为一个"批次"一起处理。但 Expiration Time 只给了每个更新一个独立的时间戳——如果这三个更新的过期时间略有不同（由于调度延迟），它们会被分散到不同的渲染批次中。

2020 年 React 用 **Lane 模型**替代了 Expiration Time：

```typescript
// Lane 用 31 位二进制表示（JS 的位运算限制在 32 位）
type Lanes = number;
type Lane = number;

// 不同的 lane 类型
const SyncLane: Lane =            0b0000000000000000000000000000001; // 1
const InputContinuousLane: Lane = 0b0000000000000000000000000000100; // 4
const DefaultLane: Lane =         0b0000000000000000000000000100000; // 32
const IdleLane: Lane =            0b0100000000000000000000000000000; // 2^29
const OffscreenLane: Lane =       0b1000000000000000000000000000000; // 2^30

// 位运算合并、判断、移除
function mergeLanes(a: Lanes, b: Lanes | Lane): Lanes { return a | b; }
function includesLane(lanes: Lanes, lane: Lane): boolean { return (lanes & lane) !== 0; }
function removeLanes(set: Lanes, subset: Lanes | Lane): Lanes { return set & ~subset; }
```

**Lane 模型的优势**：
1. 用位运算（极快）代替数值比较
2. 一个 Lanes 值可以包含多个优先级——完美的"批次"表达
3. 31 个不同的 lane 足以表达所有 React 需要的优先级粒度
4. 与 Fiber 树的遍历天然契合（每个节点存储自己的 lanes）

### 4.2 优先级如何影响更新——具体场景

```javascript
// 场景 1：用户输入（高优先级）
function SearchInput() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  
  function handleChange(e) {
    const value = e.target.value;
    
    // 输入框更新——SyncLane（最高优先级，立即同步处理）
    setQuery(value);
    
    // 搜索结果更新——包裹在 startTransition 中
    // 使用 TransitionLane（低优先级，可以被高优先级更新打断）
    startTransition(() => {
      setResults(searchDatabase(value));
    });
  }
  
  // 如果用户在 searchDatabase 执行期间继续输入：
  // 1. 新的输入触发 SyncLane 更新
  // 2. 旧的 TransitionLane 渲染被丢弃
  // 3. 基于新的 query 重新开始 TransitionLane 渲染
  // 用户看到的效果：输入框实时响应，搜索结果稍后出现——流畅！
}
```

## 第五章：Scheduler 包——React 的独立调度引擎

### 5.1 为什么不用 requestIdleCallback

React 团队最初确实考虑过使用 `requestIdleCallback`，但在深入评估后放弃了这个方案。原因不是"Safari 不支持"这么简单：

1. **触发频率不可控**：rIC 只有在浏览器"真正空闲"时才触发。在复杂动画或高频用户交互期间，rIC 可能被延迟数百毫秒——React 不能让低优先级更新被无限期延迟
2. **没有优先级概念**：rIC 把所有空闲任务同等对待。React 需要更精细的控制：知道哪些空闲任务比其他空闲任务更紧急
3. **无法设置超时**：React 需要"这个低优任务最多只能延迟 X ms"的保证。虽然 rIC 有 timeout 选项，但实际行为在不同浏览器中不一致

### 5.2 Scheduler 的内部实现

```javascript
// React Scheduler 的核心——基于 MessageChannel 的任务调度
const channel = new MessageChannel();
const port = channel.port2;

// 为什么用 MessageChannel 而不是 setTimeout(fn, 0)？
// setTimeout 有 4ms 的最小延迟（嵌套 >5 层后强制 4ms）
// MessageChannel 没有这个限制——可以在 ~0.1ms 内触发回调

let scheduledHostCallback = null;
let isMessageLoopRunning = false;

channel.port1.onmessage = () => {
  const currentTime = performance.now();
  
  // 依次执行任务，每次检查 shouldYield
  while (scheduledHostCallback !== null) {
    if (scheduledHostCallback(currentTime)) {
      // 返回 true = 还有更多工作要做
      port.postMessage(null); // 继续调度
    } else {
      // 返回 false = 所有工作完成
      scheduledHostCallback = null;
      isMessageLoopRunning = false;
      break;
    }
  }
};

// 任务队列——按过期时间排序
const taskQueue = []; // 已过期/即将过期的任务（高优先级）
const timerQueue = []; // 未过期的任务（低优先级）

function scheduleCallback(priorityLevel, callback, options) {
  const currentTime = performance.now();
  const timeout = priorityToTimeout(priorityLevel); // 不同优先级不同超时
  
  const task = {
    id: taskIdCounter++,
    callback,
    priorityLevel,
    startTime: currentTime + (options?.delay || 0),
    expirationTime: currentTime + timeout + (options?.delay || 0),
    sortIndex: -1,
  };
  
  if (task.startTime > currentTime) {
    // 延迟任务 → timerQueue
    task.sortIndex = task.startTime;
    push(timerQueue, task);
  } else {
    // 到期任务 → taskQueue
    task.sortIndex = task.expirationTime;
    push(taskQueue, task);
  }
  
  if (!isMessageLoopRunning) {
    isMessageLoopRunning = true;
    port.postMessage(null);
  }
  
  return task;
}
```

### 5.3 不同优先级的超时时间

```typescript
// 从 React 源码 recreation
const IMMEDIATE_PRIORITY_TIMEOUT = -1;     // 立即（同步）
const USER_BLOCKING_PRIORITY_TIMEOUT = 250; // 250ms（用户交互）
const NORMAL_PRIORITY_TIMEOUT = 5000;       // 5s（默认）
const LOW_PRIORITY_TIMEOUT = 10000;         // 10s（startTransition）
const IDLE_PRIORITY_TIMEOUT = 1073741823;   // 永不过期
```

## 第六章：跨框架对比——Fiber vs 其他 Virtual DOM 策略

### 6.1 React Fiber vs Vue 3 的响应式调度

Vue 3 没有 Fiber 这样的链表结构和时间切片——它不需要。因为 Vue 3 的响应式系统（基于 Proxy）在依赖追踪层面就做了精准的粒度控制：

- Vue 知道"哪个组件依赖了哪个数据"
- 数据变化时，Vue 只需更新依赖了该数据的那几个组件——不涉及树的遍历

React 则相反——它不追踪依赖，每次状态变化从根组件开始遍历整棵 Fiber 树。因此 React 需要 Fiber 来让"遍历整棵树"这个过程是可中断的。

**这是两种不同的哲学**：
- React：组件是"纯函数"（UI = f(state)），不追踪依赖，每次全量重算
- Vue：响应式系统追踪依赖，精准更新。代价是 Proxy 的运行时开销和依赖收集的内存开销

### 6.2 React Fiber vs Svelte 的编译时优化

Svelte 走的是第三条路——**编译时**优化：

- Svelte 编译器分析组件的模板，生成精准的 DOM 更新代码（`if (changed.name) text.data = name;`）
- 没有 Virtual DOM，没有 diff，没有调度
- 但是：Svelte 的编译产物体积随组件规模线性增长（因为每个组件生成专门的更新代码），而 React 始终只需要 ~40KB 的运行时

### 6.3 React Fiber vs SolidJS 的细粒度响应式

SolidJS 结合了 React 的 JSX 语法和 Vue/Svelte 的细粒度响应式：
- 编译时分析 JSX，将每个表达式包装为独立的 effect
- 运行时不需要 Virtual DOM 的 diff——每个 effect 直接更新对应的 DOM 节点
- 不需要调度——因为每个更新的工作量极小（一个 DOM 文本节点的更新 vs 一整棵树的遍历）

## 第七章：举一反三——Fiber 思想的跨领域影响

1. **操作系统的进程调度器**：Fiber 的"时间切片"与 Linux CFS（Completely Fair Scheduler）有直接的血缘关系。CFS 分配 CPU 时间给进程——每个进程获得一段"时间片"，超时则被抢占。React 的 Scheduler 本质上是"JavaScript 主线程的用户态调度器"

2. **游戏引擎的 ECS（Entity Component System）架构**：Bevy、Unity DOTS 等新一代游戏引擎用 ECS 替代 OOP——按组件类型批量处理（所有 Transform 组件一起更新）而非按对象处理。React Fiber 的"beginWork 按 Fiber Node 逐个处理"可以看作一种特殊的 ECS 迭代

3. **数据库的 MVCC（多版本并发控制）**：PostgreSQL 和 MySQL InnoDB 使用 MVCC 实现事务隔离——每个事务看到数据的一个快照。React 的双缓冲在概念上与 MVCC 一致：current 树是"已提交"的版本，workInProgress 树是"未提交"的工作副本

4. **Golang 的 goroutine 调度器**：Go 1.14 引入了基于信号的异步抢占式调度（之前只在函数调用点检查抢占）。React Fiber 的"可中断渲染"与 Go 的 goroutine 抢占有相同的核心挑战：如何在"中间"暂停一个正在执行的单元——Go 通过信号处理器，React 通过 shouldYield 检查点

5. **Rust 的 async/await Future**：Rust 的 async fn 编译为状态机——每个 `.await` 点是状态机的状态转换点。React Fiber 的 beginWork/completeWork 也是状态机——暂停点位于每个 Fiber Node 处理之后。两者都依赖"将大任务分解为小状态机单元"的思想

6. **Web Animations API（WAAPI）**：浏览器原生动画 API 的设计灵感部分来源于 React 的时间切片——动画帧被分解为多个 microtask，浏览器可以在帧之间插入用户输入处理

7. **Qwik 的 Resumability**：Qwik 把 React 的"可中断渲染"推到了极致——不仅是可以暂停，而是可以序列化整个应用状态到 HTML 中，在客户端"恢复"（Resume）执行而不需要重新水合（Hydration）
