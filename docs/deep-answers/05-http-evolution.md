## 第一章：HTTP/0.9 → HTTP/1.1 —— Web 协议的第一个十年

### 1.1 HTTP/0.9（1991）—— 只有 GET 的极简协议

Tim Berners-Lee 设计的最初版 HTTP 只有一行请求和一行响应的 HTML。没有 Header、没有状态码、没有 POST。设计哲学是"尽可能简单来加速 Web 的采用"。这个哲学贯穿了 HTTP 协议的整个演进史——每次升级都在"向后兼容"和"能力增强"之间做权衡。

### 1.2 HTTP/1.1（1997）—— 奠定现代 Web 的基石特性

HTTP/1.1 引入了三个至今仍在广泛使用的核心特性：

**持久连接（Keep-Alive）**：HTTP/1.0 每次请求都需要新建 TCP 连接（三次握手 + 四次挥手），每个连接的建立和关闭消耗大量 RTT（Round Trip Time）。HTTP/1.1 默认 Keep-Alive——一个 TCP 连接上可以发送多个请求。这在拨号上网年代是性能的质变。

**分块传输编码（Chunked Transfer Encoding）**：Content-Length 要求服务端在发送响应前知道完整的响应大小——这对于动态生成的内容（如实时报表、服务端渲染页面）是不可能的。分块编码让服务端可以"一边生成一边发送"，每个 chunk 自描述大小，最后一个 chunk 长度为 0 标记结束。

**管线化（Pipelining）**：理论上可以不等第一个请求的响应就发送第二个请求。但实践中几乎从未被启用——因为 HTTP/1.1 要求响应必须严格按发送顺序返回（队头阻塞），一个慢响应会阻塞后续所有响应。主流浏览器（包括 Chrome 和 Firefox）从未在默认配置中启用 HTTP 管线化。

### 1.3 HTTP/1.1 的性能天花板

队头阻塞（Head-of-Line Blocking）是 HTTP/1.1 的根本性能瓶颈。浏览器通过**多连接并行**（同域 6 个并发连接）来绕过这个问题——但每个连接都有自己的 TCP 慢启动过程，且 6 个连接的上限意味着第 7 个请求必须排队等待。

## 第二章：HTTP/2（2015）—— 多路复用的革命

### 2.1 SPDY 协议和 HTTP/2 的诞生

Google 在 2009 年发布了 SPDY 协议（发音 speedy），通过在 HTTP 和 TCP 之间加一层来解决 HTTP/1.1 的性能问题。IETF 在 SPDY 的基础上标准化了 HTTP/2（2015年 RFC 7540）。

### 2.2 二进制帧层——HTTP/2 的核心创新

HTTP/2 在 HTTP 语义层和 TCP 传输层之间插入了**二进制帧层**（Binary Framing Layer）。所有 HTTP 语义（Header、Body、请求方法、状态码）保持不变，但传输格式从文本变为二进制帧：

```
HTTP/1.1:  文本流（人类可读，机器解析慢）
HTTP/2:    二进制帧（Stream ID + Frame Type + Payload）
```

每个 TCP 连接上可以同时存在多个 **Stream**（双向字节流），每个 Stream 被分割为多个 **Frame**，来自不同 Stream 的 Frame 在连接上**交错传输**。接收方根据 Frame Header 中的 Stream ID 重新组装。

### 2.3 HPACK 头部压缩——消除重复传输

HTTP/1.1 中每次请求都携带完整的 Header（Cookie、User-Agent、Accept-Encoding 等），在多次请求同一域时大量重复传输。HPACK 维护了发送方和接收方共享的**动态表**和**静态表**，重复的 Header 只需发送表索引（1-2 字节）。

### 2.4 HTTP/2 的队头阻塞——只解决了一半

HTTP/2 解决了**HTTP 层的队头阻塞**（响应不必按请求顺序返回）。但**TCP 层的队头阻塞**仍然存在：TCP 保证按序交付——一个丢失的 TCP 包会阻塞所有 Stream，因为接收方必须等待重传完成才能将数据交付给 HTTP/2 层。在 2% 的丢包率下（移动网络常见），HTTP/2 的性能甚至可能**低于** HTTP/1.1 的多连接方案——因为 HTTP/1.1 的 6 个连接中只有 1 个受影响，而 HTTP/2 只有 1 个连接。

## 第三章：HTTP/3（2022）—— QUIC 的彻底革命

### 3.1 为什么选 UDP——TCP 的"僵化"问题

TCP 在操作系统内核中实现，修改 TCP 需要更新内核——而内核更新周期以年计。TCP 面临所谓的"僵化"问题（Ossification）：中间盒（middlebox）——防火墙、NAT、负载均衡器——对 TCP Header 做了各种假定，如果 TCP 出现新字段会被当作异常流量丢弃。

Google 的解决方案是激进的：**直接在 UDP 之上新建传输层**。QUIC 实现了 TCP 的可靠性、拥塞控制、流量控制，TLS 1.3 的加密，HTTP/2 的多路复用——全部在用户态（UDP 之上）。因为 UDP 的 Header 极简（只有源端口、目标端口、长度、校验和），中间盒对它几乎没有"固化认知"——QUIC 的所有扩展都可以通过新的 Frame 类型实现。

### 3.2 QUIC 的核心优势

**0-RTT 握手**：如果客户端之前连接过该服务器（有 PSK - Pre-Shared Key），可以在第一个数据包中就携带 HTTP 请求数据——TLS 握手和 HTTP 请求同时完成。这在移动网络（高 RTT）中的体验提升巨大。

**连接迁移**：QUIC 连接用 Connection ID（64-160 位随机字符串）标识，而非 IP:Port 四元组。用户从 WiFi 切换到 4G（IP 地址变化），TCP 连接必然断开（需要重新握手）。QUIC 的 CID 不变——连接无缝迁移到新网络，上层 HTTP 请求完全不受影响。

**无 TCP 层队头阻塞**：QUIC 中每个 Stream 独立传输——一个 Stream 的丢包只影响该 Stream 的重传，不影响其他 Stream 的数据交付。这在弱网环境下的改进是质变的。

### 3.3 QPACK——HTTP/3 的头部压缩

HPACK 的动态表更新依赖于严格的**按序解码**——与 TCP 的按序交付绑定。QUIC 的 Stream 独立传输破坏了这种顺序依赖。QPACK 将动态表更新与 Stream 传输解耦——表更新通过独立的单向 Stream 发送，数据 Stream 中的引用使用"表已确认的最大状态"——消除头部压缩层面的 HOLB。

## 第四章：HTTP/3 的生产现状和迁移挑战

### 4.1 浏览器支持

Chrome 89+、Firefox 88+、Safari 14+ 已默认启用 HTTP/3。Google 和 Facebook 的内部数据显示，HTTP/3 在视频流传输中减少了约 15% 的卡顿（rebuffering），在搜索页面中减少了约 5% 的延迟。

### 4.2 迁移成本

HTTP/3 需要服务端支持 QUIC（nginx-quic、Caddy、LiteSpeed 原生支持，Apache 通过 mod_http3 实验性支持）。UDP 被某些企业防火墙阻止（安全策略只允许 TCP 80/443）——这种环境下 HTTP/3 不可用，浏览器会自动降级到 HTTP/2。

### 4.3 UDP 放大攻击的缓解

QUIC 要求初始数据包至少 1200 字节——小于这个大小的数据包被服务器丢弃（防止攻击者伪造小的 UDP 请求触发大的响应）。这是 QUIC 对抗 DRDoS（Distributed Reflective Denial of Service）攻击的核心机制。

## 第五章：举一反三——HTTP 演进对其他领域的影响

1. **gRPC 基于 HTTP/2 的双向流**：gRPC 利用 HTTP/2 的多路复用和双向 Stream 实现 RPC 调用。客户端和服务端可以同时发送多个消息——"服务器推送"在 gRPC 中是原生支持的。gRPC 的四种调用模式（Unary/Server Streaming/Client Streaming/Bidirectional）与 HTTP/2 Stream 的能力一一对应。

2. **WebTransport（基于 QUIC）——WebSocket 的继任者**：WebTransport 在浏览器中提供类似 QUIC 的传输能力——低延迟、不可靠传输（类似 UDP datagram）和可靠流传输（类似 TCP stream）同时可用。这是 WebRTC 和 WebSocket 两种模式在 QUIC 层面的融合。游戏、实时协作、云游戏是主要应用场景。

3. **TCP Fast Open vs QUIC 0-RTT——同目标不同路径**：TCP Fast Open（TFO）在 TCP 层面实现 0-RTT——在 SYN 包中携带数据。但部署率极低——因为 TFO 需要操作系统、网络中间件和应用程序三层都支持。QUIC 通过把传输层移到用户态绕过了这个问题。

4. **Multipath TCP（MPTCP）vs QUIC Connection Migration**：MPTCP 允许一个 TCP 连接同时使用多个网络接口（WiFi + 4G），实现带宽聚合和无缝切换。苹果从 iOS 7 开始使用 MPTCP 为 Siri 提供更可靠的连接。QUIC 的连接迁移实现了类似的多路径能力但更简单（连接迁移而非带宽聚合）。

5. **WebSocket over HTTP/2（RFC 8441）**：HTTP/2 可以承载 WebSocket——将 WebSocket 升级握手替换为 HTTP/2 的 CONNECT 方法。但实际部署有限——因为 HTTP/2 的 Stream 流控与 WebSocket 的无界消息语义存在不匹配。
