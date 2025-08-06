#!/bin/bash

echo "🚀 VPN + Decodo 代理冲突诊断工具"
echo "=================================="

# 检查环境变量
echo ""
echo "🔍 检查环境变量..."
if [ -n "$RESIDENTIAL_PROXY_USER" ]; then
    echo "  ✅ RESIDENTIAL_PROXY_USER: $RESIDENTIAL_PROXY_USER"
else
    echo "  ❌ RESIDENTIAL_PROXY_USER 未设置"
fi

if [ -n "$RESIDENTIAL_PROXY_PASS" ]; then
    echo "  ✅ RESIDENTIAL_PROXY_PASS: [已设置]"
else
    echo "  ❌ RESIDENTIAL_PROXY_PASS 未设置"
fi

# DNS 解析测试
echo ""
echo "🔍 测试 DNS 解析..."
for domain in "gate.decodo.com" "google.com" "youtube.com"; do
    if nslookup "$domain" > /dev/null 2>&1; then
        ip=$(nslookup "$domain" | grep -A1 "Name:" | tail -1 | awk '{print $2}')
        echo "  ✅ $domain -> $ip"
    else
        echo "  ❌ $domain -> 解析失败"
    fi
done

# 网络连通性测试
echo ""
echo "🌐 测试网络连通性..."

# 测试直连
echo "  测试直连到 httpbin.org..."
if curl -s --max-time 10 "https://httpbin.org/ip" > /dev/null; then
    echo "  ✅ 直连成功"
    direct_ip=$(curl -s --max-time 10 "https://httpbin.org/ip" | grep -o '"origin":"[^"]*"' | cut -d'"' -f4)
    echo "    当前 IP: $direct_ip"
else
    echo "  ❌ 直连失败"
fi

# 测试 Decodo 代理
echo ""
echo "🔄 测试 Decodo 代理..."
if [ -n "$RESIDENTIAL_PROXY_USER" ] && [ -n "$RESIDENTIAL_PROXY_PASS" ]; then
    for port in 10001 10002 10003; do
        echo "  测试端口 $port..."
        proxy_url="http://$RESIDENTIAL_PROXY_USER:$RESIDENTIAL_PROXY_PASS@gate.decodo.com:$port"
        
        if curl -s --max-time 15 --proxy "$proxy_url" "https://httpbin.org/ip" > /dev/null 2>&1; then
            proxy_ip=$(curl -s --max-time 15 --proxy "$proxy_url" "https://httpbin.org/ip" | grep -o '"origin":"[^"]*"' | cut -d'"' -f4)
            echo "    ✅ 端口 $port 成功，IP: $proxy_ip"
        else
            echo "    ❌ 端口 $port 失败"
            # 尝试获取详细错误信息
            error_output=$(curl -s --max-time 15 --proxy "$proxy_url" "https://httpbin.org/ip" 2>&1)
            if echo "$error_output" | grep -q "407"; then
                echo "      错误: 407 代理认证失败 (可能是 VPN 冲突)"
            elif echo "$error_output" | grep -q "timeout"; then
                echo "      错误: 连接超时"
            else
                echo "      错误: 未知错误"
            fi
        fi
    done
else
    echo "  ❌ 代理凭据未配置"
fi

# 路由追踪
echo ""
echo "🛣️  测试网络路由..."
if command -v traceroute > /dev/null; then
    echo "  追踪到 gate.decodo.com 的路由..."
    traceroute -m 5 gate.decodo.com 2>/dev/null | head -8
else
    echo "  ⚠️ traceroute 命令不可用"
fi

# 生成解决方案
echo ""
echo "💡 VPN 分流规则建议:"
echo "=================================="
echo "将以下规则添加到你的 VPN 客户端的直连列表中:"
echo ""
echo "# 域名规则"
echo "gate.decodo.com"
echo "*.decodo.com"
echo "decodo.com"
echo ""
echo "# IP 段规则"
echo "149.88.96.0/20"
echo ""
echo "# 测试域名"
echo "httpbin.org"
echo "api.ipify.org"

echo ""
echo "🔧 如果仍有问题，尝试以下解决方案:"
echo "1. 确保 VPN 客户端支持域名和 IP 段分流"
echo "2. 重启 VPN 客户端使规则生效"
echo "3. 临时关闭 VPN 测试代理功能"
echo "4. 考虑更换代理服务商（如 Bright Data）"
echo "5. 使用环境变量: export NO_PROXY=gate.decodo.com"

echo ""
echo "📊 诊断完成！"