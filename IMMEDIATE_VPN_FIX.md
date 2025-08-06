# 🚨 立即修复 VPN + Decodo 冲突

## 📊 当前状态

- ❌ **所有 Decodo 代理成功率: 0%**
- ❌ **18 个代理配置全部失败**
- ✅ **MP3 转换仍然工作**（使用直连）

## 🎯 立即行动方案

### 方案 1: 完善 VPN 分流规则（5分钟）⭐⭐⭐⭐⭐

你已经添加了基础规则，但需要确保格式正确：

#### 检查你的 VPN 客户端配置：

**如果使用 Clash/ClashX:**

```yaml
rules:
  # Decodo 代理直连
  - DOMAIN,gate.decodo.com,DIRECT
  - DOMAIN-SUFFIX,decodo.com,DIRECT
  - IP-CIDR,149.88.96.0/20,DIRECT

  # 测试域名
  - DOMAIN,httpbin.org,DIRECT
  - DOMAIN,api.ipify.org,DIRECT
```

**如果使用 Surge:**

```
[Rule]
DOMAIN,gate.decodo.com,DIRECT
DOMAIN-SUFFIX,decodo.com,DIRECT
IP-CIDR,149.88.96.0/20,DIRECT
DOMAIN,httpbin.org,DIRECT
```

**如果使用 Shadowrocket:**

```
[Rule]
DOMAIN,gate.decodo.com,DIRECT
DOMAIN-SUFFIX,decodo.com,DIRECT
IP-CIDR,149.88.96.0/20,DIRECT
```

#### 重要步骤：

1. ✅ 添加规则到 VPN 客户端
2. 🔄 **重启 VPN 客户端**（关键步骤！）
3. 🧪 测试验证

### 方案 2: 临时绕过测试（1分钟）⭐⭐⭐

```bash
# 临时关闭 VPN，测试代理是否工作
# 然后重新开启 VPN 并验证分流规则
```

### 方案 3: 环境变量绕过（需要重新部署）⭐⭐⭐

如果有 flyctl 访问权限：

```bash
flyctl secrets set NO_PROXY=gate.decodo.com,*.decodo.com --app getgoodtape-video-proc
flyctl secrets set no_proxy=gate.decodo.com,*.decodo.com --app getgoodtape-video-proc
```

## 🧪 验证方法

### 1. 快速测试（30秒）

```bash
# 测试代理状态
curl "https://getgoodtape-video-proc.fly.dev/proxy-stats"

# 查看成功率是否 > 0%
```

### 2. 完整测试（2分钟）

```bash
# 测试转换功能
curl -X POST "https://getgoodtape-video-proc.fly.dev/convert" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "format": "mp3",
    "quality": "high"
  }'
```

## 📈 成功指标

修复成功后，你应该看到：

- ✅ `proxy-stats` 中至少有部分代理成功率 > 0%
- ✅ 转换速度提升（使用代理绕过限制）
- ✅ 更稳定的 YouTube 访问

## 🔍 诊断工具

如果仍有问题，运行本地诊断：

```bash
cd video-processor
./diagnose_vpn.sh
```

## ⚡ 预期结果

**修复前:**

```json
"success_rate": 0.0,
"total_attempts": 5,
"success": 0,
"failure": 5
```

**修复后:**

```json
"success_rate": 0.6,
"total_attempts": 10,
"success": 6,
"failure": 4
```

## 🆘 如果仍然失败

1. **检查 VPN 客户端类型** - 确保支持域名/IP 分流
2. **尝试不同格式** - 有些客户端需要特定的规则格式
3. **联系我** - 提供 VPN 客户端类型和配置截图

---

**⏰ 建议立即执行方案 1，然后运行验证测试！**
