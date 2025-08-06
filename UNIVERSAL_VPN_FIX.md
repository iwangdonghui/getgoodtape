# 🌐 通用 VPN + 代理冲突解决方案

## 📋 适用于所有主流 VPN 客户端

### 🔧 方案 1: 主流 VPN 客户端配置

#### Clash/ClashX (推荐) ⭐⭐⭐⭐⭐

```yaml
# 在 config.yaml 的 rules 部分添加
rules:
  # Decodo 代理直连 - 必须放在最前面
  - DOMAIN,gate.decodo.com,DIRECT
  - DOMAIN-SUFFIX,decodo.com,DIRECT
  - IP-CIDR,149.88.96.0/20,DIRECT

  # 测试域名
  - DOMAIN,httpbin.org,DIRECT
  - DOMAIN,api.ipify.org,DIRECT

  # 其他规则...
  - MATCH,PROXY
```

#### Surge ⭐⭐⭐⭐

```
[Rule]
# Decodo 代理直连
DOMAIN,gate.decodo.com,DIRECT
DOMAIN-SUFFIX,decodo.com,DIRECT
IP-CIDR,149.88.96.0/20,DIRECT

# 测试域名
DOMAIN,httpbin.org,DIRECT
DOMAIN,api.ipify.org,DIRECT

# 默认规则
FINAL,PROXY
```

#### Shadowrocket ⭐⭐⭐⭐

```
[Rule]
DOMAIN,gate.decodo.com,DIRECT
DOMAIN-SUFFIX,decodo.com,DIRECT
IP-CIDR,149.88.96.0/20,DIRECT
DOMAIN,httpbin.org,DIRECT
FINAL,PROXY
```

#### V2rayU/V2rayN ⭐⭐⭐

```json
{
  "routing": {
    "rules": [
      {
        "type": "field",
        "domain": ["gate.decodo.com", "decodo.com"],
        "outboundTag": "direct"
      },
      {
        "type": "field",
        "ip": ["149.88.96.0/20"],
        "outboundTag": "direct"
      }
    ]
  }
}
```

#### Quantumult X ⭐⭐⭐

```
[filter_local]
host, gate.decodo.com, direct
host-suffix, decodo.com, direct
ip-cidr, 149.88.96.0/20, direct
host, httpbin.org, direct
```

### 🔧 方案 2: 系统级环境变量

如果 VPN 客户端不支持分流，使用系统环境变量：

#### macOS/Linux

```bash
# 添加到 ~/.zshrc 或 ~/.bashrc
export NO_PROXY="gate.decodo.com,*.decodo.com,149.88.96.0/20"
export no_proxy="gate.decodo.com,*.decodo.com,149.88.96.0/20"

# 重新加载配置
source ~/.zshrc
```

#### Windows

```cmd
# 在系统环境变量中添加
NO_PROXY=gate.decodo.com,*.decodo.com,149.88.96.0/20
no_proxy=gate.decodo.com,*.decodo.com,149.88.96.0/20
```

### 🔧 方案 3: 路由器级别配置

如果使用路由器 VPN：

```bash
# 添加到路由器的直连路由表
route add -net 149.88.96.0/20 gw [本地网关IP]
```

## 🧪 通用验证步骤

### 1. 配置后验证

```bash
# 测试 DNS 解析
nslookup gate.decodo.com

# 测试连通性
ping gate.decodo.com

# 测试代理
curl --proxy "http://用户名:密码@gate.decodo.com:10001" "https://httpbin.org/ip"
```

### 2. 运行自动测试

```bash
./test_proxy_fix.sh
```

### 3. 检查服务状态

```bash
curl "https://getgoodtape-video-proc.fly.dev/proxy-stats"
```

## 🚀 智能代码解决方案

如果 VPN 配置仍然困难，我已经准备了代码层面的智能解决方案：
