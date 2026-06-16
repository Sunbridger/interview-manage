## 第一章：Node.js 事件驱动架构——从 libuv 到 Stream

### 1.1 libuv 的设计哲学

libuv 最初是为 Node.js 开发的跨平台异步 I/O 库，现在被 Julia、Luvit 等项目使用。它的核心抽象是 **event loop + thread pool**：主线程运行事件循环（单线程），耗时的 I/O 操作（文件系统、DNS 查询）在线程池（默认 4 个线程）中执行。这种"一个事件循环 + 一个线程池"的模式是 Node.js 能同时处理数千并发连接的秘密。

CPU 密集型操作（加密、压缩、图像处理）不在线程池中处理——它们占用主线程。这就是为什么"Node.js 不适合 CPU 密集型任务"的观点存在——但 Worker Threads（Node 10.5+）改变了这一局面：将 CPU 密集型计算移入 Worker，主线程保持响应。

### 1.2 Stream——Node.js 最强大的抽象

Stream 不是 Node.js 独有的——Unix 管道的"流"思想影响了所有现代 I/O 系统。Node.js 的 Stream 将这一思想映射为四个抽象类型：

- Readable：数据来源（fs.createReadStream、HTTP request）
- Writable：数据去处（fs.createWriteStream、HTTP response）
- Transform：数据转换（zlib.createGzip、crypto.createCipher）
- Duplex：同时可读可写（net.Socket、TLS 连接）

背压（Backpressure）是 Stream 最核心但最不被理解的概念。当 Writable 的消费速度慢于 Readable 的生产速度时，write() 返回 false 通知上游暂停。drain 事件信号恢复生产。pipe() 自动处理背压，但错误处理不好——一个环节出错不会自动销毁其他环节。pipeline（stream/promises，Node 15+）解决了这个问题——自动错误传播 + 资源清理。

### 1.3 Cluster vs Worker Threads——何时用哪个

Cluster 基于 child_process.fork()——创建独立的 V8 实例和独立的内存空间。进程间通信通过 IPC（基于 libuv 的 pipe）。适合 CPU 密集 + HTTP 服务（利用多核）。端口共享原理：主进程监听端口 → round-robin 分发到工作进程。PM2 在 Cluster 之上加了进程监控、零停机重载、日志管理。

Worker Threads 共享同一个进程的不同 V8 实例——通过 SharedArrayBuffer 共享内存，Atomics 做同步。适合计算密集型（图片处理、加密、压缩）。关键差异：Worker Threads 可以高效共享大 Buffer（通过 TransferList 零拷贝）——Cluster 必须通过 IPC 序列化拷贝。

## 第二章：工程化——从单体到微前端

### 2.1 Monorepo 的三种工具链策略

pnpm workspace + turborepo：最轻量的方案。pnpm 的全局 store + 硬链接让所有依赖物理只存一份。turborepo 的缓存策略：相同的源码 + 相同的依赖 → 直接复用上次构建产物（远程缓存实现 CI 间共享）。

Nx：更重量级但功能更全面——依赖图可视化、分布式任务执行、代码生成器（generate React component、API route）。适合大型团队（20+ 开发者，50+ packages）。

Rush（微软）：策略化版本管理 + 变更日志自动生成。适合超大规模（100+ packages），与 pnpm 深度集成。

### 2.2 AST 在工程化中的三重身份

1. 代码转换（Babel/SWC/esbuild）：parse → transform → generate。Babel 的 visitor 模式是可变的 AST 操作——直接在树上修改。esbuild/SWC 生成全新的不可变 AST——并发安全但灵活性更低。

2. 代码检查（ESLint）：遍历 AST，对匹配的 Node 应用规则。Prettier 也基于 AST——但 Prettier 的"格式化"原则不同：尽量少配置，以可读性为唯一目标。

3. 代码分析（jscodeshift）：批量重构工具——对整个代码库的 AST 做变换后写回文件。React 团队用 jscodeshift 写了 30+ 个 codemod（自动迁移 API 的工具）。

### 2.3 错误监控——从捕获到定位

window.onerror / unhandledrejection → Sentry/自建平台。Source Map 上传（注意安全：上传到内网服务而非公开 CDN）。错误指纹去重：错误类型 + 堆栈前 N 行（去掉行号列号——minify 后行号无意义）的 hash。

用户行为录制（rrweb）：录屏回放错误发生前的用户操作——比堆栈更直观。采样策略：全量错误但 10% 行为数据——平衡监控覆盖和存储成本。

## 第三章：构建工具——从 Webpack 到 Vite 到 Turbopack

### 3.1 Webpack 的 Tapable 插件架构

Webpack 基于 Tapable 钩子系统——一个发布-订阅模式的实现，但钩子类型比 EventEmitter 丰富得多：SyncHook（同步串行）、SyncBailHook（遇到非 undefined 停止）、AsyncSeriesHook（异步串行）、AsyncParallelHook（异步并行）。

Plugin 通过 `compiler.hooks.xxx.tap(name, fn)` 注册。Compiler 是构建全生命周期单例，Compilation 是每次构建的实例（watch 模式下每次重新构建都有新的 Compilation）。这是"框架定义钩子，插件注册回调"的 IoC（控制反转）模式。

### 3.2 Vite 的 Native ESM + 按需编译

Vite 开发模式快的原因：不对源码做打包——利用浏览器原生 ESM 的 import 按需请求模块。Webpack 必须先构建完整的依赖图 → 打包 → 输出——改动一行可能重打包整个 chunk。Vite 只转译浏览器请求的那个文件（及其 import 链）。

ESBuild（Go）做预构建：将 CJS 包转为 ESM、小模块合并减少请求数。生产环境用 Rollup——因为 ESBuild 定位是转译工具，不擅长 Code Splitting 和精细的分包策略。

### 3.3 Turbopack 和 Rspack——Rust 改写 Webpack

Turbopack（Next.js 团队）：Rust 实现，与 Webpack 不兼容——从零构建的增量打包引擎，利用 Rust 的所有权模型实现细粒度缓存（函数级而非文件级）。Rspack（字节跳动）：Rust 实现，兼容 Webpack 配置和 loader 生态——目标是"即插即用的 Webpack 替代品，但快 10 倍"。

## 第四章：举一反三

1. **Deno 的模块系统**：Deno 使用 URL-based ESM import——`import {} from "https://deno.land/std/fs/mod.ts"`。抛弃了 node_modules（依赖通过 URL 缓存到全局目录）。权限模型默认沙箱（文件系统、网络、环境变量都需要显式授权）。Deno 的内置工具链（formatter、linter、test runner、doc generator）是 Node.js 生态中需要第三方工具填补的空白。

2. **Bun 的"全能运行时"**：Bun 不是"另一个 Node.js"——它试图成为 JS 的"瑞士军刀"。内置打包器、转译器、测试运行器、包管理器（bun install 比 npm install 快 25 倍）。所有工具共享同一个原生实现（Zig 编写），消除了 Node 生态中工具链碎片化的问题。

3. **esbuild 的 Go 架构**：esbuild 用 Go 编写而非 JS——利用 Go 的 goroutine 做并行编译，流式架构避免了完整 AST 的构建。但 esbuild 不支持 AST 操作的插件（不可变输出）——这是与 Babel 的根本差异。esbuild 的"快"来自于设计取舍（牺牲灵活性换速度），而非仅仅是"Go 比 JS 快"。

4. **SWC 和 Rust 的前端工具链**：SWC（Speedy Web Compiler）用 Rust 编写——利用 Rust 的所有权系统自动内存管理（无 GC），编译成原生代码后执行速度比 JS 快 20-70 倍。被 Next.js、Deno、Parcel 等工具采用。Rust 在构建工具领域的兴起不是因为 Rust 流行——是因为 JS 的工具链已经复杂到需要用编译语言来重写才能获得可接受的性能。

5. **Rome（Biome）的"统一工具链"愿景**：Rome（现改名 Biome）的目标是取代 Babel + ESLint + Prettier + Webpack——一个工具完成所有前端开发基础设施。这是对"工具链碎片化"的根本回应。虽然后来被 Vite 和 Rspack 等更专注的工具抢占了生态，但"统一工具链"的思想仍然是前端工程的终极方向。
