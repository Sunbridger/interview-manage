## 第一章：为什么 JavaScript 需要 JIT——解释执行 vs 编译执行的矛盾

### 1.1 V8 的设计目标

V8 诞生于 2008 年（Google Chrome 发布时），设计目标是让 JavaScript 运行得足够快——快到来构建像 Google Maps 这样的大型 Web 应用。当时的主流 JS 引擎（SpiderMonkey、JavaScriptCore）都是纯解释器或简单的基线 JIT。

V8 的激进之处在于直接从源码编译为机器码——跳过了中间表示（IR）的解释执行阶段。这在 2008 年是一个革命性的决定——编译器启动更慢（因为需要编译），但执行速度大幅提升。然而这个架构有一个致命缺陷：不是所有代码都值得全量编译。一个只执行一次的初始化函数和一段执行 10000 次的热循环——花同样的编译时间是不合理的。

### 1.2 现代 V8 的编译管线（Ignition + TurboFan + Maglev）

2017 年 V8 彻底重写了编译架构（代号"Turbofan on a Diet"），引入 Ignition 解释器：

```
源代码（JS）
  ↓
Parser（解析器）→ 生成 AST
  ↓
Ignition（解释器）→ 生成字节码 → 解释执行
  ↓ （热点检测）
TurboFan（优化编译器）→ 生成优化的机器码 ← 需要去优化时回退
  ↑ （2023年新增）
Maglev（中间层编译器）→ 中等优化的机器码
```

**为什么需要三层**：
- **Ignition**：启动快（不需要编译），适合冷代码（只执行几次的函数）
- **Maglev**（2023）：填补 Ignition 和 TurboFan 之间的空白——TurboFan 编译太慢（数百毫秒），Maglev 提供"够快但不够完美"的优化（几十毫秒），适合中等热度的代码
- **TurboFan**：深度优化——函数内联、逃逸分析、循环展开、向量化。适合热代码（执行数万次的函数）

### 1.3 热点检测——OSR（On-Stack Replacement）

V8 如何判断一个函数"变热了"？通过 **invocation counter**（调用计数器）：
- 每次函数调用，计数器++
- 计数器达到阈值（Ignition 约 500 次调用）时，V8 决定编译这个函数
- 如果函数正在执行中（如长循环中），V8 使用 OSR——"原地替换"：在循环体中间将字节码替换为编译后的机器码

## 第二章：Hidden Class（Map）——V8 让 JavaScript 对象访问接近 C 语言速度的秘密

### 2.1 问题：动态类型语言的属性访问为什么慢

在 C++ 中：
```cpp
struct Point { double x; double y; };
Point p;
p.x = 1.0;  // 编译时就知道 x 在偏移量 0 处（一个内存访问指令）
```

在 JavaScript 中：
```javascript
const p = { x: 1, y: 2 };
p.x; // 运行时需要查找 'x' 在哪里 → 哈希表查找 → 慢！
```

### 2.2 Hidden Class 的解决方案

V8 的 Hidden Class（内部称为 Map）为每个"对象形状"创建描述符。对象结构相同 → 共享同一个 Map → 属性在内存中的偏移量固定 → 属性访问变为简单的指针偏移 + 类型检查：

```javascript
function Point(x, y) { this.x = x; this.y = y; }
const p1 = new Point(1, 2);
const p2 = new Point(3, 4);
// p1 和 p2 共享同一个 Hidden Class
// x 始终在偏移量 12，y 始终在偏移量 20
// 访问 p2.y → *(p2 + 20) → 一条指令！
```

### 2.3 Transition Chain——动态添加属性的代价

每个新属性的添加创建新的 Hidden Class，形成 transition chain：

```
Point {} → (添加 x) → Point { x } → (添加 y) → Point { x, y }
HC0          HC1          HC2          HC3
```

如果两个对象的属性**顺序不同**，它们会走完全不同的 transition chain：
```javascript
const a = {}; a.x = 1; a.y = 2; // HC0 → HC1(x) → HC2(y)
const b = {}; b.y = 2; b.x = 1; // HC0 → HC3(y) → HC4(x)
// a 和 b 的 Hidden Class 不同！即使最终属性完全相同
```

**这就是为什么构造函数中一次性初始化所有属性是 V8 友好的关键**——所有实例走完全相同的 transition chain，共享最终的 Hidden Class。

### 2.4 delete 降级为字典模式

```javascript
const obj = { x: 1, y: 2, z: 3 };
delete obj.y;
// → obj 的 Hidden Class 链断裂
// → V8 将其降级为"字典模式"（Dictionary Mode / Slow Mode）
// → 属性访问从指针偏移退化为哈希表查找
// → 慢 3-10 倍
```

**字典模式是不可逆的**——一旦进入，即使后来重新添加了 `y`，对象也不会回到 transition chain 模式。

## 第三章：内联缓存（Inline Cache）——V8 的"作弊器"

### 3.1 IC 的工作原理

在字节码层面，属性访问被编译为对 IC stub 的调用。第一次执行时（未命中），IC 记录"这个位置看到的 Hidden Class"，然后使用该 class 的属性偏移量。第二次执行时（命中），直接使用上次记录的偏移量——**零查找开销**。

```javascript
function getName(obj) { return obj.name; }
// 字节码中 'obj.name' 处生成 IC stub
// 第 1 次调用 getName({name:'a'}) → IC 记录 HC of {name}
// 第 2 次调用 getName({name:'b'}) → IC 命中 → 直接用偏移量
// 第 3 次调用 getName({name:'c'}) → IC 命中 → 快！
```

### 3.2 单态→多态→超态的退化

IC 状态机：

```
UNINITIALIZED（未初始化）
  ↓ 第一个 HC
MONOMORPHIC（单态：1种 HC）—— 最快，直接比较+偏移
  ↓ 第二个不同的 HC
POLYMORPHIC（多态：2-4种 HC）—— 较慢，switch-case 匹配
  ↓ 第 5 个不同的 HC
MEGAMORPHIC（超态：≥5种 HC）—— 最慢，回退到哈希查找
```

**如何避免退化**：
- 不要用同一个函数处理完全不同结构的对象
- 保持 API 形状一致（返回的对象总是有相同的属性）
- Monorepo 中共享的接口类型要严格一致

## 第四章：V8 的垃圾回收——分代 + 并发 + 增量

### 4.1 为什么需要分代

**弱分代假说（Weak Generational Hypothesis）**：大多数对象在年轻时死亡（分配后不久就不再被引用），少数对象活得很久。分代 GC 将堆分成**新生代**（Young Generation，1-8MB）和**老生代**（Old Generation），针对不同代用不同策略。

### 4.2 新生代：Scavenger（复制算法）

- 将新生代分为两个半空间（From-Space 和 To-Space）
- 一次 Minor GC：遍历 From-Space 中存活的对象 → 复制到 To-Space → 互换两个空间
- 存活时间短的对象不复制（直接丢弃）→ 非常快
- 经历过 2 次 Minor GC 仍然存活的对象 → 晋升到老生代

### 4.3 老生代：Mark-Sweep + Mark-Compact

老生代对象存活率高（大多数是长期存活的生命周期对象），用复制算法不划算（需要复制大量数据）。

- **Mark-Sweep**：标记所有可达对象（从根出发），清除未标记的对象
- **Mark-Compact**：类似 Mark-Sweep，但还将存活对象移到连续区域（消除碎片）
- **并发标记**：Mark 阶段与 JS 主线程并发执行（不阻塞用户交互）。写屏障（Write Barrier）处理在标记过程中新创建的引用
- **增量标记**：Mark 阶段分多次执行（与 JS 交替），每次只标记一部分 → 减少单次 GC 停顿

### 4.4 Orinoco 项目——V8 的 GC 革命

2018 年的 Orinoco 项目实现了**并发的 Mark-Compact**（不仅 Mark 是并发的，Compact 阶段也部分并发），将 GC 停顿从几百毫秒减少到几毫秒。这是使 JavaScript 能支撑复杂 Web 应用的关键基础设施改进。

## 第五章：举一反三——V8 内幕的跨领域影响

1. **Java HotSpot JIT**：Java 的 C1（Client Compiler，快速编译）+ C2（Server Compiler，深度优化）二层编译架构与 V8 的 Maglev + TurboFan 完全对应。Java 的"去优化"（Deoptimization）概念源自 Self 语言（1990年代）——与 V8 的去优化是同一机制的独立实现。

2. **LuaJIT 的 Trace Compiler**：LuaJIT 不用方法 JIT（method-based JIT）而是用 trace-based JIT——追踪热点路径而非整函数编译。V8 最初也考虑过这个方案，最终选择了方法 JIT（更适合 JavaScript 的函数式编程风格）。

3. **WebAssembly 为什么比 JavaScript 快**：WASM 的类型系统在模块加载时完全确定——没有 Hidden Class、没有去优化、没有 IC。WASM 编译器（Liftoff→TurboFan）可以直接生成接近原生速度的代码。JS→WASM 的性能差距主要来自类型不确定性——V8 几十年优化经验主要就是在"猜测类型"。

4. **Python 的 GIL 与 JS 的单线程**：Python 因为有 GIL 无法真正并行（即使在多核机器上），JS 通过 Worker 实现了真正的并行（每个 Worker 有独立的 V8 实例）。但 Worker 不能共享对象（不能像 Java 线程那样共享堆）——这是设计选择而非技术限制：SharedArrayBuffer 证明了共享内存是可能的，但 V8 故意限制它来保证安全。

5. **JavaScript 的 Tail Call Optimization（TCO）**：ES6 规范要求尾调用优化，但 V8 在 2016 年实现后又在 2018 年移除了——因为 TCO 破坏了调用栈信息（开发者期望在 Error.stack 中看到完整的调用链），且与 V8 的优化编译器存在冲突。Safari 的 JSC 是唯一持续支持 TCO 的主流引擎。

6. **AssemblyScript——编译到 WASM 的 TypeScript 子集**：它使用类似 V8 的"形状分析"在编译时确定对象布局——将 JSON-like 的 JS 对象编译为 WASM 的固定偏移量结构体。最终产物不需要 GC（使用手动内存管理或 ARC）——性能接近手写 C。
