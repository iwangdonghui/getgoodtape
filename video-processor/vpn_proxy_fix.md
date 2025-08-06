# VPN + Decodo 代理冲突解决方案

## 问题分析

- VPN 拦截了所有流量，包括到 Decodo 的连接
- Decodo 代理需要直连才能正确认证
- 407 错误表明代理认证失败

## 解决方案

### 1. 完善 VPN 分流规则

除了已添加的 IP 段，还需要添加：

```
# Decodo 相关域名和 IP
gate.decodo.com
*.decodo.com
149.88.96.0/20

# 可能的其他 Decodo IP 段（需要确认）
185.199.108.0/22
104.21.0.0/16
172.67.0.0/16

# DNS 解析相关
8.8.8.8
8.8.4.4
1.1.1.1
1.0.0.1
```

### 2. 测试分流是否生效

```bash
# 测试 Decodo 连接
curl -v --proxy http://spwd19mn8t:VWo_9unscw6dpAl57T@gate.decodo.com:10001 https://httpbin.org/ip

# 检查路由
traceroute gate.decodo.com
```

### 3. 如果分流仍有问题，使用环境变量控制

```bash
# 临时关闭 VPN 测试
export NO_PROXY=gate.decodo.com,*.decodo.com
export no_proxy=gate.decodo.com,*.decodo.com
```
