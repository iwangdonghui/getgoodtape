# WebSocket 1006 错误解决指南

## 🚨 问题描述

**错误代码**: 1006  
**错误信息**: "连接失败: 1006"  
**含义**: WebSocket连接异常关闭

## 🔍 问题分析

### 错误代码1006的含义

- **1006**: 连接异常关闭，没有收到关闭帧
- **常见原因**: 网络中断、防火墙阻止、CORS限制、代理服务器问题

### 可能的原因

#### 1. **网络环境限制**

- 企业防火墙阻止WebSocket连接
- 网络代理服务器不支持WebSocket
- ISP限制WebSocket协议

#### 2. **浏览器/CORS问题**

- 跨域WebSocket连接被阻止
- 浏览器安全策略限制
- 证书验证问题

#### 3. **服务器配置**

- Cloudflare Workers WebSocket配置问题
- 服务器负载过高
- 临时网络故障

## 🛠️ 解决方案

### 方案1: 网络环境检查

#### 步骤1: 使用诊断工具

1. 访问 `/debug` 页面
2. 点击"开始诊断"按钮
3. 查看详细的诊断结果

#### 步骤2: 网络连接测试

```bash
# 测试基本网络连接
ping getgoodtape-api-production.wangdonghuiibt-cloudflare.workers.dev

# 测试HTTPS连接
curl -I https://getgoodtape-api-production.wangdonghuiibt-cloudflare.workers.dev/api/health
```

#### 步骤3: 防火墙检查

- 检查企业防火墙设置
- 确保允许WebSocket连接 (端口443)
- 联系网络管理员开放WebSocket协议

### 方案2: 浏览器环境优化

#### 步骤1: 浏览器设置

- 清除浏览器缓存和Cookie
- 禁用浏览器扩展（特别是广告拦截器）
- 尝试无痕/隐私模式

#### 步骤2: 证书检查

- 确保系统时间正确
- 检查SSL证书是否有效
- 尝试访问: https://getgoodtape-api-production.wangdonghuiibt-cloudflare.workers.dev

#### 步骤3: 不同浏览器测试

- Chrome/Edge
- Firefox
- Safari

### 方案3: 网络环境切换

#### 移动网络测试

- 使用手机热点
- 切换到不同的网络环境
- 测试是否是网络限制问题

#### VPN测试

- 使用VPN连接
- 选择不同的服务器位置
- 测试WebSocket连接

### 方案4: 应用层解决方案

#### HTTP轮询备选方案

应用已经内置了HTTP轮询作为WebSocket的备选方案：

```typescript
// 自动降级到HTTP轮询
if (webSocketFailed) {
  // 使用HTTP轮询获取状态更新
  setInterval(() => {
    fetch('/api/status/' + jobId)
      .then(response => response.json())
      .then(data => updateStatus(data));
  }, 1000);
}
```

## 🔧 开发者解决方案

### 本地开发环境

#### 方案1: 使用本地Workers

```bash
# 安装Wrangler
npm install -g wrangler

# 启动本地Workers
wrangler dev

# 更新WebSocket URL为本地地址
const wsUrl = 'ws://localhost:8787/api/ws';
```

#### 方案2: WebSocket模拟

```typescript
// 开发环境WebSocket模拟
if (process.env.NODE_ENV === 'development') {
  // 使用HTTP轮询模拟WebSocket
  const simulateWebSocket = () => {
    setInterval(() => {
      // 模拟WebSocket消息
      onMessage({ type: 'progress', data: { progress: 50 } });
    }, 1000);
  };
}
```

### 生产环境优化

#### Cloudflare Workers配置

```toml
# wrangler.toml
[env.production]
compatibility_flags = ["websocket"]

# 确保WebSocket支持
[[env.production.services]]
binding = "WEBSOCKET"
service = "websocket-service"
```

#### 错误处理增强

```typescript
// 增强的WebSocket连接
const connectWithRetry = (url, maxRetries = 3) => {
  let retries = 0;

  const connect = () => {
    const ws = new WebSocket(url);

    ws.onopen = () => {
      console.log('WebSocket连接成功');
      retries = 0;
    };

    ws.onclose = event => {
      if (event.code === 1006 && retries < maxRetries) {
        retries++;
        console.log(`WebSocket重连尝试 ${retries}/${maxRetries}`);
        setTimeout(connect, 1000 * retries);
      } else {
        console.log('WebSocket连接失败，切换到HTTP轮询');
        fallbackToPolling();
      }
    };
  };

  connect();
};
```

## 📊 诊断工具使用

### WebSocket状态监控

- **位置**: `/debug` 页面
- **功能**: 实时WebSocket连接状态
- **信息**: 连接延迟、错误详情、环境信息

### WebSocket连接诊断

- **位置**: `/debug` 页面下方
- **功能**: 全面的连接诊断
- **测试项目**:
  - 网络连接测试
  - Workers API可用性
  - WebSocket支持检查
  - 实际连接测试
  - 环境信息收集

### 使用步骤

1. 访问 `http://localhost:3000/debug`
2. 查看"WebSocket状态"部分
3. 点击"测试连接"按钮
4. 查看"WebSocket连接诊断"部分
5. 点击"开始诊断"进行全面检查

## 🎯 常见解决方案

### 企业网络环境

```
问题: 企业防火墙阻止WebSocket
解决:
1. 联系IT部门开放WebSocket协议
2. 使用HTTP轮询备选方案
3. 通过VPN连接
```

### 家庭网络环境

```
问题: ISP限制或路由器配置
解决:
1. 重启路由器
2. 更新路由器固件
3. 联系ISP技术支持
```

### 移动网络环境

```
问题: 移动网络限制
解决:
1. 切换到WiFi网络
2. 使用不同的移动网络运营商
3. 启用VPN
```

## 🔮 预防措施

### 应用层面

- ✅ 自动降级到HTTP轮询
- ✅ 连接重试机制
- ✅ 详细的错误日志
- ✅ 用户友好的错误提示

### 监控层面

- ✅ 实时连接状态监控
- ✅ 连接成功率统计
- ✅ 错误类型分析
- ✅ 网络环境检测

## 📋 总结

### 关键点

1. **1006错误通常是网络环境问题**，不是应用程序错误
2. **HTTP轮询是可靠的备选方案**，功能完全不受影响
3. **诊断工具可以快速定位问题**原因
4. **多种解决方案**适应不同的网络环境

### 用户建议

- 🔍 **首先使用诊断工具**检查问题
- 🌐 **尝试不同网络环境**（WiFi、移动网络、VPN）
- 🔄 **应用功能不受影响**，HTTP轮询会自动接管
- 📞 **如需帮助**，提供诊断结果给技术支持

### 开发者建议

- 📊 **监控WebSocket连接成功率**
- 🔧 **优化重连机制**
- 📝 **收集错误统计**
- 🚀 **考虑Server-Sent Events作为备选**

WebSocket 1006错误虽然常见，但通过合适的诊断和解决方案，可以确保用户获得良好的体验！🎉

---

**文档版本**: 1.0  
**最后更新**: 2025-08-07  
**适用范围**: GetGoodTape WebSocket连接问题
