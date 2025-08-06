# 🚀 Shadowrocket 完整配置指南

## 📱 当前配置状态

根据你的截图，你已经正确配置了：

- ✅ `149.88.96.0/20` -> DIRECT
- ✅ `gate.decodo.com` -> DIRECT
- ✅ `decodo.com` -> DIRECT

## 🔧 优化建议

### 1. 确保规则顺序正确

在 Shadowrocket 中，规则是**从上到下**匹配的，确保 Decodo 相关规则在最前面：

```
[Rule]
# Decodo 代理直连 - 必须在最前面
DOMAIN,gate.decodo.com,DIRECT
DOMAIN-SUFFIX,decodo.com,DIRECT
IP-CIDR,149.88.96.0/20,DIRECT

# 测试域名（用于验证）
DOMAIN,httpbin.org,DIRECT
DOMAIN,api.ipify.org,DIRECT

# 其他规则...
GEOIP,CN,DIRECT
FINAL,PROXY
```

### 2. 添加测试域名

为了验证配置是否生效，建议添加：

```
DOMAIN,httpbin.org,DIRECT
DOMAIN,api.ipify.org,DIRECT
```

### 3. 重启应用

配置完成后：

1. 保存配置
2. 完全关闭 Shadowrocket
3. 重新打开并连接

## 🧪 验证步骤

### 步骤 1: 开启 VPN 后测试

```bash
# 重新开启 Shadowrocket
# 然后运行测试
./test_proxy_fix.sh
```

### 步骤 2: 检查代理状态

```bash
curl "https://getgoodtape-video-proc.fly.dev/proxy-stats"
```

### 步骤 3: 测试转换功能

```bash
curl -X POST "https://getgoodtape-video-proc.fly.dev/convert" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://www.youtube.com/watch?v=jNQXAC9IVRw",
    "format": "mp3",
    "quality": "medium"
  }'
```

## 📊 预期结果

配置正确后，你应该看到：

### 代理统计改善

```json
{
  "success_rate": 0.8,
  "total_attempts": 10,
  "success": 8,
  "failure": 2
}
```

### 转换功能稳定

- 更快的 YouTube 访问
- 更高的成功率
- 更稳定的连接

## 🔍 故障排除

### 如果代理仍然失败：

1. **检查规则优先级**
   - 确保 Decodo 规则在最前面
   - 没有其他规则覆盖

2. **验证域名解析**

   ```bash
   nslookup gate.decodo.com
   # 应该返回 149.102.253.x 的 IP
   ```

3. **测试直连**
   ```bash
   # 临时关闭 VPN 测试
   curl --proxy "http://spwd19mn8t:VWo_9unscw6dpAl57T@gate.decodo.com:10001" "https://httpbin.org/ip"
   ```

### 如果问题持续：

1. **尝试不同的规则格式**：

   ```
   # 方式 1: 域名匹配
   DOMAIN,gate.decodo.com,DIRECT

   # 方式 2: 域名后缀匹配
   DOMAIN-SUFFIX,decodo.com,DIRECT

   # 方式 3: 关键词匹配
   DOMAIN-KEYWORD,decodo,DIRECT
   ```

2. **检查 Shadowrocket 版本**：
   - 确保使用最新版本
   - 某些旧版本可能有规则解析问题

3. **重置网络设置**：
   - iOS 设置 -> 通用 -> 还原 -> 还原网络设置
   - 重新配置 Shadowrocket

## 🎯 最佳实践

1. **规则简洁性**：只添加必要的规则
2. **定期测试**：使用测试脚本验证配置
3. **备份配置**：导出配置文件备份
4. **监控日志**：查看 Shadowrocket 连接日志

## 📞 需要帮助？

如果配置后仍有问题：

1. 截图当前的规则配置
2. 运行 `./test_proxy_fix.sh` 并分享结果
3. 检查 Shadowrocket 的连接日志

---

**记住**：配置完成后一定要重启 Shadowrocket 使规则生效！
