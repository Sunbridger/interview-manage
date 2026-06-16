## 第一章：同源策略——Web 安全的基石

### 1.1 为什么需要同源策略

没有同源策略的互联网是这样的：你访问 evil.com，该网站的 JavaScript 可以通过 fetch 读取你在 gmail.com 的所有邮件，通过 XMLHttpRequest 从 bank.com 获取你的账户余额，通过 DOM 操作读取你在 facebook.com 的私信。JavaScript 可以访问任何它被加载到的页面的全部内容——这是 Web 平台的基础能力。同源策略（Same-Origin Policy）是唯一阻止这种滥用的机制。

同源的定义：协议 + 域名 + 端口完全相同。https://a.example.com 和 https://b.example.com 不同源（子域名不同）。http 和 https 永远不同源（即使域名相同）。

### 1.2 同源策略的三层限制

1. DOM 访问限制：不同源的 iframe 之间不能通过 JavaScript 互相访问 DOM——window.contentDocument 会抛异常
2. 网络请求限制：XHR/fetch 不能向不同源发送请求（这是 CORS 要解决的问题）
3. 存储隔离：不同源的 localStorage、IndexedDB、Cookie 完全隔离

**重要例外**：script、img、link、iframe 的 src 不受同源策略限制——这是故意为之（CDN 跨域加载脚本、图片热链接）。JSONP 正是利用了这个"漏洞"。

## 第二章：XSS——注入攻击的三张面孔

### 2.1 存储型 XSS——最危险的持久化攻击

恶意脚本存储在服务器端（数据库、文件系统），每次用户请求该内容时都被执行。典型场景：用户评论中插入 `<script>steal(document.cookie)</script>`——服务端未做 HTML 转义直接存储和输出。每个查看该评论的用户都会执行这段脚本。

防范：服务端输出时对所有用户输入做 HTML Entity 转义（`<` → `&lt;`、`"` → `&quot;`）。但不同上下文需要不同的转义规则——HTML 上下文、属性值上下文、JavaScript 上下文、CSS 上下文各自有不同的注入向量。

### 2.2 DOM 型 XSS——完全在客户端发生的攻击

与存储型不同，DOM 型 XSS 的恶意载荷从不到达服务器——攻击发生在浏览器端：URL 的 hash 参数（#后面的内容）或 search 参数被 JavaScript 直接插入 DOM。因为 hash 参数不发送给服务器（浏览器处理），服务端的 XSS 过滤器完全看不到这个攻击。

```javascript
// 危险：直接将 URL 参数拼入 DOM
document.getElementById('content').innerHTML = location.hash.slice(1);
// 访问 example.com#<img src=x onerror=alert(1)>
// → 恶意代码在受害者浏览器中执行
```

防范：使用 `textContent` 而非 `innerHTML`、对插入 DOM 的用户数据做 HTML 转义、使用 Trusted Types API（浏览器强制所有 DOM 操作经过安全策略）。

### 2.3 React 不是 XSS 的银弹

JSX 的自动转义（React.createElement 会将 `{value}` 中的 `<>&"` 转义）是很好的默认安全策略，但以下场景仍然危险：

```jsx
// 1. dangerouslySetInnerHTML——命名就警告了危险
<div dangerouslySetInnerHTML={{ __html: userInput }} />

// 2. a.href 的 javascript: 协议
<a href={`javascript:${userInput}`}>Click</a>

// 3. 用户输入作为 style 属性
<div style={{ background: userInput }} />
// 攻击者可以注入 CSS expression（IE）或 custom property 注入

// 4. 服务端渲染时的 HTML 注入
// SSR 的 HTML 模板引擎不会自动转义 JSX 以外的内容
```

### 2.4 CSP（Content Security Policy）——浏览器级 WAF

CSP 通过 HTTP 响应头告诉浏览器"允许从哪些来源加载资源"，从浏览器层面阻止未授权的脚本执行：

```
Content-Security-Policy: default-src 'self'; script-src 'self' 'nonce-abc123'; style-src 'self' 'unsafe-inline'
```

**nonce vs hash 模式**：
- nonce（随机数）：每次响应生成新的 nonce 值，`<script nonce="abc123">` 匹配 CSP 头中的 nonce。适合 SSR——每次页面渲染生成新的 nonce
- hash（SHA-256）：计算内联脚本的 SHA-256 hash，写入 CSP 头。适合静态 HTML——hash 不变，CSP 头可以缓存

**strict-dynamic** 指令：如果脚本的 nonce/hash 验证通过，则该脚本动态创建的 script（如 `document.createElement('script')`）也自动被信任——不需要把所有 CDN 域名加入白名单。这是 CSP Level 3 解决"白名单膨胀"的关键特性。

**report-uri / report-to**：报告模式——先只记录违规（不阻断），观察一段时间后切换到 Enforce 模式。让团队在"破坏用户功能"之前收集足够的 CSP 违规数据。

## 第三章：CSRF——跨站请求伪造

### 3.1 CSRF 的根本原因：Cookie 的"隐式认证"

浏览器在发送请求时自动附加目标域的 Cookie——这是 HTTP 的无状态设计决定的。攻击者利用这一点：在 evil.com 上放置一个自动提交的表单，action 指向 bank.com/transfer，浏览器自动带上 bank.com 的 Cookie——服务端以为这是用户的正常操作。

### 3.2 SameSite Cookie——最简单的防御，也是最容易被理解的

SameSite 属性控制 Cookie 何时随跨站请求发送：
- SameSite=Strict：完全不发送跨站 Cookie。最安全，但用户体验差——从邮件链接跳转时处于"未登录"状态
- SameSite=Lax（Chrome 默认）：跨站 GET 可带 Cookie（如链接跳转），跨站 POST/PUT 不发送。用户体验和安全性的平衡点
- SameSite=None + Secure：允许跨站带 Cookie（仅 HTTPS）。用于第三方登录、嵌入式支付等场景

### 3.3 Token 方案 vs Double Submit Cookie

CSRF Token（传统方案）：服务端在表单中嵌入隐藏字段 `<input type="hidden" name="csrf_token" value="random">`，提交时校验。攻击者无法读取同域的 Cookie（同源策略阻止了 evil.com 读取 bank.com 的 Cookie），也无法从 Cookie 中提取 token。

Double Submit Cookie（无状态方案）：Cookie 中存储随机值 → 前端 JavaScript 从 Cookie 读取 → 放到自定义 Header（如 X-CSRF-Token）→ 服务端比较 Cookie 和 Header 中的值。攻击者无法设置自定义 Header（跨域请求不能带自定义 Header——这就是为什么 CORS 预检请求的存在）。

### 3.4 为什么 RESTful API + Bearer Token 天然免疫 CSRF

使用 `Authorization: Bearer xxx` 的 API 不受 CSRF 攻击——浏览器不会自动附加 Authorization Header，只有开发者显式设置了 Header 的 fetch/XHR 才会携带。这与 Cookie 的自动附加机制完全不同——从根本上消除了 CSRF 的利用条件。

## 第四章：CORS——有控制地放松同源策略

### 4.1 预检请求（Preflight）的精确触发条件

预检 OPTIONS 请求只在以下情况触发：
1. 非简单方法：PUT/DELETE/PATCH
2. 非简单 Content-Type：不是 application/x-www-form-urlencoded、multipart/form-data、text/plain 三种之一
3. 自定义请求头（包括 Authorization 这类常用 Header）

预检请求的目的是"先问再发"——询问服务器"我可以用 PUT 方法和 x-custom-header 吗？"。服务器通过 Access-Control-Allow-Methods 和 Access-Control-Allow-Headers 回答。

### 4.2 withCredentials 和 Access-Control-Allow-Origin 不能为 *

当 withCredentials: true 时，浏览器发送 Cookie 和 Authorization Header。服务器必须设置 `Access-Control-Allow-Credentials: true`，且 `Access-Control-Allow-Origin` 不能是 `*`（规范禁止——因为 `*` 意味着"任意网站都可以携带用户凭据访问"——这是灾难性的安全漏洞）。

## 第五章：OAuth 2.0 + PKCE——现代 Web 的身份认证标准

### 5.1 隐式流程（Implicit Flow）为什么被废弃

隐式流程直接返回 access_token 在 URL fragment 中（#access_token=xxx）。问题包括 token 暴露在浏览器历史中、无法安全刷新（没有 refresh_token）、redirect_uri 日志可能记录 token。OAuth 2.1（进行中）将完全移除 Implicit Flow。

### 5.2 PKCE——让 SPA 也能安全使用 Authorization Code Flow

SPA 无法安全存储 client_secret（任何客户端机密都可以被提取）。PKCE 机制让 SPA 不需要 client_secret：

1. 客户端生成 code_verifier（随机 43-128 字符字符串）
2. 计算 code_challenge = BASE64URL(SHA-256(code_verifier))
3. 授权请求中发送 code_challenge
4. 换取 token 时发送 code_verifier——授权服务器验证 challenge 和 verifier 是否匹配
5. 即使攻击者截获了授权码（code），没有 code_verifier 也无法换成 token

## 第六章：举一反三

1. **Subresource Integrity（SRI）**：在 script/link 标签上添加 integrity 属性（内容的 SHA-384 hash）。如果 CDN 提供的文件被篡改，浏览器拒绝执行。防御供应链攻击（CDN 被入侵、恶意 npm 包注入脚本）。

2. **Trusted Types（浏览器 API）**：从 DOM API 层面防止 XSS——`innerHTML`、`document.write`、`eval` 等危险 sink 只接受 TrustedHTML 对象（而非原始字符串）。开发者必须通过 Trusted Types 策略（如 DOMPurify + TrustedTypePolicy）将字符串转为 TrustedHTML——从根本上消除 DOM XSS。

3. **Content Security Policy Level 3 的 script-src-elem 和 script-src-attr**：区分 script 元素的 URL 和事件处理器（如 onclick=""）的 URL。细化到"允许加载脚本"和"允许内联事件处理器"是两回事——Level 2 的 script-src 把两者混为一谈。

4. **WebAuthn（FIDO2）——无密码认证**：用生物识别（指纹/FaceID）或硬件安全密钥替代密码。私钥存储在用户设备的安全区域（TPM/Secure Enclave）中——服务端只存储公钥。钓鱼攻击完全无效（因为没有密码可钓），是比 OAuth 更安全的认证方式。

5. **HTTPS 的 Certificate Transparency（CT）**：所有 TLS 证书必须公开记录到 CT Log 中——防止 CA 错误签发或恶意签发证书。浏览器要求证书附带 SCT（Signed Certificate Timestamp）作为 CT Log 收录的证明。这是近年 HTTPS 安全的最大改进之一——让"中间人攻击"变得更容易被发现。
