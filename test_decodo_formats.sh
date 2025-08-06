#!/bin/bash

echo "🧪 测试 Decodo 代理格式"
echo "======================"

# 测试不同的代理格式
formats=(
    "http://spwd19mn8t:VWo_9unscw6dpAl57T@gate.decodo.com:10001"
    "http://spwd19mn8t-123:VWo_9unscw6dpAl57T@gate.decodo.com:10001"
    "http://spwd19mn8t-session-456:VWo_9unscw6dpAl57T@gate.decodo.com:10001"
)

for i in "${!formats[@]}"; do
    proxy="${formats[$i]}"
    echo ""
    echo "测试格式 $((i+1)): $(echo "$proxy" | sed 's/:VWo_9unscw6dpAl57T@/:***@/')"
    
    result=$(curl -s --max-time 10 --proxy "$proxy" "https://httpbin.org/ip" 2>&1)
    
    if echo "$result" | grep -q '"origin"'; then
        ip=$(echo "$result" | grep -o '"origin":"[^"]*"' | cut -d'"' -f4)
        echo "  ✅ 成功 - IP: $ip"
    else
        echo "  ❌ 失败"
        if echo "$result" | grep -q "407"; then
            echo "    错误: 407 认证失败"
        elif echo "$result" | grep -q "timeout"; then
            echo "    错误: 连接超时"
        else
            echo "    错误: $(echo "$result" | head -1)"
        fi
    fi
done

echo ""
echo "📋 结论:"
echo "- 格式 1 (基础): 应该是最可靠的"
echo "- 格式 2 (数字后缀): 可能支持"  
echo "- 格式 3 (session 前缀): 可能不支持"