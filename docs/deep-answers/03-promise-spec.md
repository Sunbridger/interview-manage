## 第一章：Promise/A+ 规范——一份改变 JavaScript 生态的社区协议

### 1.1 Promise 之前的异步荒野

2012 年之前，JavaScript 的异步编程是一盘散沙。jQuery 的 Deferred、Dojo 的 Promise、Q 库、when.js 各自有不同的 API 和行为——同样的 "then" 方法在不同库中可能以不同的顺序执行回调。Node.js 的 error-first callback 约定（`function(err, result){}`）是最接近"标准"的东西，但它只是约定而非规范。

2012年，一群 JavaScript 库的维护者聚集在 GitHub 上，起草了一份 **Promise/A+ 规范**——这不是 ECMAScript 标准，而是社区驱动的**互操作性规范**。它的核心目标很简单：**任何符合规范的 Promise 实现，都可以互相 `.then()`**。

这个规范的 API 设计极为克制——只定义了 `then` 方法的行为（`catch`、`finally`、`all`、`race` 都不是 A+ 规范的一部分——它们是后来 ES6 添加的便利方法）。

### 1.2 Promise/A+ 的完整执行语义

规范定义的核心规则（远不止面试题中的"三种状态"）：

**1. then 必须返回一个新的 Promise**（这保证了链式调用）：
```javascript
promise2 = promise1.then(onFulfilled, onRejected);
// 规则：如果 onFulfilled 或 onRejected 返回一个值 x
// → 运行 Promise Resolution Procedure [[Resolve]](promise2, x)
```

**2. Promise Resolution Procedure**（规范中称为 `[[Resolve]](promise, x)`）是最复杂也是最重要的部分。它的目的是处理 `onFulfilled` 返回值的各种可能情况：

```
如果 x 是一个 thenable（有 .then 方法的对象）：
  - 尝试调用 x.then
  - 如果 x.then 抛出异常 → reject promise
  - 如果 x.then 是函数 → 调用它（传入 resolve/reject 回调）
  - 如果 x.then 不是函数 → fulfill promise with x
如果 x 是 promise：
  - promise 的状态传递给 promise2（fulfilled → fulfill, rejected → reject）
如果 x 是普通值：
  - fulfill promise with x
```

**3. onFulfilled 和 onRejected 必须异步调用**（规范原文："onFulfilled or onRejected must not be called until the execution context stack contains only platform code"）。这条规则保证了 Promise 的回调**永远**在当前宏任务的微任务队列中执行，而非在当前调用栈中同步执行。

**4. 同一个 Promise 可以多次调用 .then()**。每个 .then() 返回独立的 Promise2，它们之间互不影响：
```javascript
const p = Promise.resolve(42);
p.then(v => v + 1); // → Promise(43)
p.then(v => v * 2); // → Promise(84)
```

### 1.3 手写 Promise/A+ 实现——通过测试套件

Promise/A+ 社区维护了一个测试套件（`promises-aplus-tests`），包含 872 个测试用例。实现通过这 872 个测试后即可声称是 "Promises/A+ compliant"。

核心实现的关键难点：

**难点 1：then 中的递归解析**。如果 `onFulfilled` 返回的 Promise 最终 resolve 的是它自己，必须抛出 TypeError（防止无限循环）：
```javascript
const p = Promise.resolve(1).then(() => p); // TypeError: Chaining cycle detected
```

**难点 2：多次调用 then 的时序**。如果同一个 Promise 上注册了多个 then，每个回调必须独立异步调用：
```javascript
const p = Promise.resolve();
p.then(() => console.log(1));
p.then(() => console.log(2));
// 输出：1 → 2（按注册顺序，都是微任务）
```

**难点 3：thenable 的"鸭子类型"检测**。规范要求通过检查 `typeof x.then === 'function'` 来判断——这意味着任何有这个方法的对象都会被视为 Promise——包括不小心定义了这个方法的普通对象。

## 第二章：微任务队列的精确调度机制

### 2.1 Promise 回调为什么不是 setTimeout(fn, 0)

很多早期 Promise polyfill 使用 `setTimeout(fn, 0)` 来模拟异步执行——这是**完全错误**的。setTimeout 创建的是宏任务（task），而 Promise 回调必须是微任务（microtask）。差异在于：

- 微任务在**当前宏任务完成后立即执行**，在下一轮事件循环之前
- 宏任务在**下一轮事件循环**中执行

```javascript
setTimeout(() => console.log('timeout'), 0);
Promise.resolve().then(() => console.log('promise'));

// 输出：promise → timeout
// 如果用 setTimeout 来模拟 Promise：timeout → promise（行为错误！）
```

正确的 polyfill 应该使用微任务 API：
- 浏览器：`queueMicrotask(fn)` 或 `MutationObserver`（作为 polyfill）
- Node.js：`process.nextTick(fn)`（但 process.nextTick 的优先级比 Promise 更高——这也是为什么 Node.js 的 polyfill 行为可能与浏览器不同）

### 2.2 V8 的微任务实现

在 V8 引擎内部，微任务通过 `MicrotaskQueue` 类实现。当 Promise 状态改变时：
1. 所有注册的 `.then()` 回调被包装为 `PromiseReaction` 对象
2. 这些 reaction 被添加到当前 `MicrotaskQueue`
3. 宏任务执行完成后，V8 检查 MicrotaskQueue
4. 逐个取出并执行——执行过程中新产生的微任务追加到队列末尾
5. 重复步骤 4 直到 MicrotaskQueue 为空

**关键性能优化**：V8 对"普通 Promise 链"（没有复杂的 thenable 嵌套）有快速路径——不经过完整的 Promise Resolution Procedure，而是直接将值传递给下一个 `.then()`。

## 第三章：async/await —— 从 Generator 到语言级协程

### 3.1 Generator 作为 async/await 的原型

2013年 TJ Holowaychuk 发布了 co 库——用 Generator 函数模拟 async/await：

```javascript
co(function* () {
  const user = yield fetch('/api/user');
  const posts = yield fetch(`/api/posts/${user.id}`);
  return { user, posts };
}).then(result => console.log(result));
```

co 的工作原理：
1. 调用 generator 函数 → 获得 generator 对象
2. 调用 `gen.next()` → 获得 `{ value: promise, done: false }`
3. 等待 `promise` resolve → 用 resolve 的值调用 `gen.next(value)`
4. 重复直到 `done: true` → resolve 整个 co 返回的 Promise

这本质上就是一个**手动的 async/await 引擎**。ES2017 将这个模式标准化为 `async/await`，让引擎在内部做这一切。

### 3.2 await 的精确反糖过程

```javascript
// 这段代码
async function foo() {
  const a = await getA();
  const b = await getB(a);
  return b;
}

// 等价于（反糖过程）
function foo() {
  return new Promise((resolve, reject) => {
    let a, b;
    getA()
      .then(_a => {
        a = _a;
        return getB(a);
      })
      .then(_b => {
        b = _b;
        resolve(b);
      })
      .catch(reject);
  });
}

// 注意：每一个 await 点都对应一个 .then()
// 这意味着 async 函数是"分段执行"的
// 每个 await 点 => 当前 .then 执行完 => 下一个 .then 入微任务队列
```

## 第四章：Promise 并发模式——从 all/race 到生产级并发控制

### 4.1 Promise.allSettled vs Promise.all —— 失败不应该让其他结果丢失

`Promise.all` 的 all-or-nothing 语义在批量操作中代价很高——如果 100 个请求中 99 个成功 1 个失败，`Promise.all` 只返回失败的 1 个结果。

`Promise.allSettled`（ES2020）解决：
```javascript
const results = await Promise.allSettled(promises);
// → [
//   { status: 'fulfilled', value: 42 },
//   { status: 'rejected',  reason: Error('timeout') },
//   { status: 'fulfilled', value: 99 },
// ]
// 所有结果都被保留——你可以分别处理
```

### 4.2 Promise.any —— 多副本竞速

`Promise.any`（ES2021）实现 Aggressive Race：只要任意一个成功就返回，只有所有都失败才 reject。典型场景：多个 CDN 获取同一文件——从最快的 CDN 拿到结果。

### 4.3 并发限制池——从面试题到生产级代码

生产级并发池需要处理的额外问题远超面试题中的简单实现：

1. **错误隔离**：单个任务失败不中断其他任务（Promise.allSettled 包装每个任务）
2. **重试策略**：可重试的错误（网络超时、503）用指数退避重试
3. **优先级队列**：高优任务可以插队到队列头部
4. **速率限制**：配合令牌桶算法保护后端
5. **动态调整并发数**：根据系统负载（CPU/内存/网络）动态增减

## 第五章：举一反三——Promise 模式在不同语言和框架中的体现

1. **Rust 的 Future trait 与 async/.await**：Rust 的 async fn 编译为状态机（实现了 Future trait），每个 .await 点是状态转换。与 JS 的微任务调度不同——Rust 的 Future 是惰性的（调用时才执行），需要 tokio/async-std 这样的运行时来驱动（类似 JS 的事件循环/Node.js 的 libuv）。

2. **Go 的 goroutine + channel**：Goroutine 是"有栈协程"（stackful coroutine）——每个 goroutine 有自己独立的栈（初始 2KB，可动态增长到 1GB）。async/await 是"无栈协程"（stackless coroutine）——不独立分配栈，编译器将其编译为状态机。有栈协程切换成本高于无栈但编程模型更自然（不需要 async/await 着色问题）。

3. **Kotlin 协程的"结构化并发"**：Kotlin 的 coroutineScope 和 supervisorScope 自动管理子协程的生命周期——父协程取消自动取消所有子协程。JS 目前没有类似的原生支持——需要手动管理 AbortController 传递。

4. **Java 的 CompletableFuture**：支持 `thenApply`/`thenCompose`/`thenCombine` 等方法（命名不同但语义等价于 Promise.then/async-then/Promise.all）。Java 21 的 Virtual Threads 提供了"同步写异步"的体验——类似 async/await 但不需要函数着色。

5. **Python asyncio 的 Task 和 gather**：`asyncio.create_task()` 创建"后台"协程——类似 JS 的"不 await 但又想执行"的 Promise。关键差异：Python 中如果不 await task，它可能永远不会被执行（因为只有一个线程），而 JS 中 Promise 一旦创建就开始了。

6. **RxJS/Observable 和 Promise 的本质差异**：Promise 是"热"的（创建即执行）、单值的（resolve 一次后结束）、不可取消的（ES6 Promise 不支持取消）。Observable 是"冷"的（订阅才执行）、多值的（可以 emit 多次）、可取消的（unsubscribe）。选择哪个取决于你的数据模型是"一次性请求"还是"事件流"。
