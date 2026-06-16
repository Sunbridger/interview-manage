## 第一章：格式化上下文——CSS 布局的微观基础

### 1.1 从 Normal Flow 到 BFC

CSS 2.1 定义了"正常流"（Normal Flow）——块级元素从上到下排列，行内元素从左到右排列。当元素浮动（float）或绝对定位（position:absolute）时，它脱离了正常流——这意味着父容器不再"感知"它的高度——这就是经典的高度塌陷问题。

BFC（Block Formatting Context）是 CSS 在"格式化上下文"层面的解决方案。一个 BFC 是一个独立的布局环境——在这个环境内部，所有元素按照 BFC 的规则参与布局，外部元素不受影响。当一个元素"创建了 BFC"时，它的所有子元素（包括浮动元素）都参与这个 BFC 的高度计算——高度塌陷自然消失。

### 1.2 创建 BFC 的 6 种方式及各自的副作用

每种方式都有代价——选择最"干净"的方式取决于你的场景：
1. overflow:hidden/auto/scroll——会裁剪溢出内容（这是最常见的"误伤"——为了清除浮动而意外裁剪了tooltip/下拉菜单）
2. display:flow-root（现代浏览器首选）——专门创建BFC，零副作用。IE不支持（但IE已停止支持）
3. float:left/right——元素本身脱离正常流，改变了布局行为
4. position:absolute/fixed——同上
5. contain:layout/paint/strict——CSS Containment，还告诉浏览器内部变化不影响外部（渲染优化的强大提示）
6. display:inline-block/table-cell/flex/grid——各自有布局行为，不仅仅是BFC

### 1.3 外边距折叠（Margin Collapsing）——BFC 的隐藏功能

外边距折叠只发生在同一 BFC 内的相邻块级元素。这是 CSS 规范中设计的行为——目的是"防止段落间距翻倍"（如果两个连续的 `<p>` 各有 1em 的 margin-bottom 和 margin-top，折叠后间距为 1em 而非 2em）。但这在复杂布局中经常导致"意料之外"的间距消失——BFC 是阻止外边距折叠的最干净方式。

### 1.4 Stacking Context（层叠上下文）——z-index 的真正作用域

许多人以为 z-index 是一个"全局"排序——数字越大的元素越靠前。实际上 z-index 只在同一个 Stacking Context 内比较。不同的 Stacking Context 之间，按 Context 本身的创建顺序决定层叠——子元素的 z-index 再大也无法超越父 Context 的限制。

创建 Stacking Context 的常见方式：position 非 static + z-index 非 auto、opacity < 1、transform/filter/perspective 非 none、will-change 指定这些属性、contain:layout/paint。

## 第二章：Flexbox——一维布局的终极方案

### 2.1 Flexbox 的核心设计：主轴和交叉轴

Flexbox 的一切行为都可以归结为两个轴：
- 主轴（Main Axis）：flex-direction 定义的方向——元素排列的方向
- 交叉轴（Cross Axis）：与主轴垂直的方向

这种"轴"的抽象让 Flexbox 可以在不知道容器尺寸的情况下自适应——与传统的"从左到右、从上到下"的固定思维完全不同。

### 2.2 flex-grow / flex-shrink / flex-basis 的精确计算公式

这是 Flexbox 中最容易被误解的部分。浏览器的实际计算：

1. 计算剩余空间（或不足空间）
2. 按 flex-grow 比例分配剩余空间
3. 按 flex-shrink 比例（乘以 flex-basis）收缩不足空间

关键坑点：flex:1 不等价于 flex:1 1 0——它是 flex:1 1 0%（百分比和数字不同：0 意味着"内容的最小尺寸"，0% 意味着"忽略内容尺寸"）。这个差异在文本溢出场景（ellipsis）中导致完全不同的行为。

### 2.3 margin:auto 在 Flexbox 中的特殊行为

在正常流中，margin:auto 只能水平居中（因为块级元素默认宽度 100%）。在 Flexbox 中，margin:auto 可以在主轴和交叉轴上吸收剩余空间——这是实现"将一个元素推到容器末尾"的最简洁方式（比使用 justify-content:space-between 更灵活）。

## 第三章：CSS Grid——二维布局的革命

### 3.1 fr 单位的精确行为

1fr 不是"均分"——它是"按比例分配剩余空间"。`grid-template-columns: 1fr 2fr` 意味着第二列是第一列的两倍宽。但与百分比不同——fr 先从总空间中减去所有固定尺寸（px/em/rem），然后分配剩余空间。这意味着：`200px 1fr 1fr` = 200px的固定列 + 两列均分剩余空间。fr 与 minmax() 组合创造了"自适应但有边界"的布局能力。

### 3.2 subgrid——最被低估的 CSS Grid 特性

嵌套 Grid 的子 Grid 的列宽独立于父 Grid——导致"卡片内不同高度但同一列的元素无法对齐"。subgrid 让子 Grid 继承父 Grid 的轨道定义：`grid-template-rows: subgrid`。这是 CSS 布局中"对齐"问题的终极解决方案——之前只能用 CSS masonry 或 JS 计算来解决的问题。

### 3.3 Grid 的显式 vs 隐式网格

`grid-template-columns` 定义显式网格。`grid-auto-rows` 和 `grid-auto-flow` 定义隐式网格（自动创建的额外行/列）。理解这两个概念的区别是掌握 Grid 的关键——自动填充的 grid 元素遵循隐式规则，而显式网格提供精确控制。

## 第四章：CSS Containment——现代布局的性能基础设施

contain 属性告诉浏览器"这个元素的某些变化不会影响外部"——浏览器可以利用这些提示跳过子树外的重排和重绘：

- contain:layout：内部布局变化不影响外部——跳过父元素的 Layout 检查
- contain:paint：内部元素不会绘制到边界框之外——跳过父元素的 Paint 检查
- contain:size：元素的尺寸不依赖子元素——跳过尺寸重新计算
- contain:style（已废弃）：计数器、引号等样式变化不影响外部

CSS Containment 对于长列表（如虚拟滚动容器中的大量卡片）的性能提升最为显著——每个卡片设置 `contain:layout style paint`（或简写 `contain:strict`），当卡片内部状态变化时，浏览器只重排/重绘那张卡片——不影响整个列表。

## 第五章：CSS 动画性能——从 GPU 层级到 Compositor-Only 属性

### 5.1 渲染管线的四个阶段

Style（CSS选择器匹配→计算最终样式）→ Layout（几何计算，最贵）→ Paint（光栅化，生成位图）→ Composite（GPU将图层合成到屏幕，最便宜）。

transform 和 opacity 只发生在 Composite 阶段——浏览器不需要重新Layout或Paint。这就是为什么它们是"compositor-only"属性：它们不改变元素的几何位置或外观，只改变最终合成到屏幕的方式（位置/大小/旋转/透明度）。

### 5.2 will-change——提前创建合成层的双刃剑

will-change:transform 告诉浏览器"这个元素即将被动画"——浏览器提前创建GPU合成层，动画开始时直接从GPU操作。代价：每个合成层在GPU内存中占用约数MB（纹理副本+操作缓冲）。手机上超过10个合成层就可能导致内存压力——轻则降帧，重则OOM崩溃。最佳实践：动画开始前设置will-change，动画完成后移除以释放GPU内存。

### 5.3 FLIP 动画技术——用 Composite 模拟 Layout 动画

FLIP（First-Last-Invert-Play）的核心思想：先记录元素动画前后的位置（getBoundingClientRect），然后用 transform 做反向位移+正向过渡——整个动画过程只改变 transform，不触发 Layout。这比直接改变 width/height/top/left 的动画性能高一个数量级。React Spring 和 Framer Motion 等动画库内部大量使用了 FLIP 技术。

## 第六章：举一反三

1. CSS Houdini（CSS Layout API / Paint API）：让开发者用 JavaScript 编写自定义布局算法和绘制函数，直接集成到浏览器的渲染管线中——与浏览器内置布局算法（Flex/Grid）在同一层级运行。CSS Houdini 是 CSS 可扩展性的终极方向。

2. Container Queries（@container）：与 Media Queries 不同，Container Queries 基于父容器的尺寸而非视口。这真正实现了"组件级响应式"——同一个卡片组件在不同宽度的容器中自动切换布局。与 CSS Grid 的 minmax/subgrid 结合使用可以消除大部分"CSS 需要 JS 计算尺寸"的场景。

3. CSS Nesting（原生嵌套）：不再需要 Sass/Less 预处理器来做嵌套——CSS 原生支持 `&` 语法。与 @layer（级联层）结合后，CSS 的组织方式从"全局平铺"变成了"分层模块化"。

4. View Transitions API（SPA MPA 过渡动画）：浏览器原生支持页面间过渡动画——FLIP 动画在浏览器层面自动完成。开发者只需指定"transition name"，浏览器自动捕捉两个页面中同名元素的位置变化并做平滑过渡。与 CSS Animation/WAAPI 互补——后者适合组件内动画，前者适合页面级过渡。

5. Web Animations API（WAAPI）：JavaScript 驱动的动画 API，与 CSS Animation 共享底层引擎但提供 JS 控制（开始/暂停/反转/跳转/组合）。Animation.finished 返回 Promise——动画结束时自动 resolve——适合需要动画完成后执行逻辑的场景。
