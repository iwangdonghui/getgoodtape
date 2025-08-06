#!/bin/bash

echo "🔍 验证 VPN 分流规则修复"
echo "========================"

echo "📋 详细 DNS 解析测试:"
echo "完整 nslookup 输出:"
nslookup gate.decodo.com
echo ""

echo "提取的 IP 地址:"
GATE_IP=$(nslookup gate.decodo.com | grep "Address:" | tail -1 | awk '{print $2}')
echo "解析结果: $GATE_IP"

# 额外测试其他相关域名
echo -e "\n🔍 测试其他相关域名:"
echo "decodo.com:"
nslookup decodo.com | grep "Address:" | tail -1

echo -e "\n149.102.253.91 反向解析:"
nslookup 149.102.253.91 | grep "name ="

if [[ "$GATE_IP" == "149.102.253."* ]]; then
    echo "✅ DNS 解析正确！"
    
    echo -e "\n🧪 测试代理连接:"
    if curl -x "http://spwd19mn8t:VWo_9unscw6dpAl57T@$GATE_IP:10001" \
           --connect-timeout 10 \
           -s "https://api.ipify.org" > /dev/null 2>&1; then
        echo "✅ 代理连接测试成功"
        
        echo -e "\n🚀 测试服务功能:"
        echo "正在测试元数据提取..."
        
        RESULT=$(curl -X POST "http://localhost:8000/extract-metadata" \
          -H "Content-Type: application/json" \
          -d '{"url": "https://www.youtube.com/watch?v=jNQXAC9IVRw"}' \
          -s --max-time 60)
        
        if echo "$RESULT" | grep -q '"success":true'; then
            echo "🎉 完美！所有功能正常工作"
            echo "✅ VPN 分流规则配置成功"
            
            # 提取标题信息
            TITLE=$(echo "$RESULT" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    metadata = data.get('metadata', {})
    print(f\"标题: {metadata.get('title', 'Unknown')}\")
    print(f\"时长: {metadata.get('duration', 0)} 秒\")
except:
    pass
")
            echo "$TITLE"
            
        else
            echo "❌ 服务功能仍有问题"
            echo "错误信息:"
            echo "$RESULT" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    print(data.get('error', 'Unknown error'))
except:
    print(sys.stdin.read())
"
        fi
        
    else
        echo "❌ 代理连接仍然失败"
        echo "请检查代理凭据或网络连接"
    fi
    
elif [[ "$GATE_IP" == "198.18.0."* ]]; then
    echo "❌ DNS 仍被 VPN 拦截 (解析到: $GATE_IP)"
    echo ""
    echo "🔧 故障排除步骤:"
    echo "1. 确认规则在 [Rule] 部分的最前面"
    echo "2. 确认已保存配置文件"
    echo "3. 完全断开并重新连接 VPN"
    echo "4. 等待 10-15 秒让规则生效"
    echo ""
    echo "📱 正确的规则格式:"
    echo "DOMAIN,gate.decodo.com,DIRECT"
    echo "DOMAIN-SUFFIX,decodo.com,DIRECT"
    echo "IP-CIDR,149.102.253.0/24,DIRECT"
    echo ""
    echo "🧪 手动测试命令:"
    echo "dig gate.decodo.com"
    echo "nslookup gate.decodo.com 8.8.8.8"
    
else
    echo "⚠️ DNS 解析到未知 IP: $GATE_IP"
    echo "请检查网络连接"
fi

echo -e "\n📊 测试完成"