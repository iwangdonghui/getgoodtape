#!/bin/bash

echo "🔍 VPN DNS 问题诊断和修复"
echo "=========================="

echo "📋 当前 DNS 解析状态:"
echo "gate.decodo.com:"
nslookup gate.decodo.com

echo -e "\n149.102.253.91:"
nslookup 149.102.253.91

echo -e "\n149.102.253.65:"
nslookup 149.102.253.65

echo -e "\n🔧 问题分析:"
GATE_IP=$(nslookup gate.decodo.com | grep "Address:" | tail -1 | awk '{print $2}')

if [[ "$GATE_IP" == "198.18.0."* ]]; then
    echo "❌ gate.decodo.com 被 VPN 拦截 (解析到: $GATE_IP)"
    echo "   这是 Shadowrocket 内部 IP，说明分流规则未生效"
    echo ""
    echo "🛠️ 修复步骤:"
    echo "1. 打开 Shadowrocket"
    echo "2. 点击右上角 +"
    echo "3. 选择 '规则'"
    echo "4. 添加以下规则:"
    echo "   DOMAIN,gate.decodo.com,DIRECT"
    echo "   DOMAIN-SUFFIX,decodo.com,DIRECT"
    echo "   IP-CIDR,149.102.253.0/24,DIRECT"
    echo "   IP-CIDR,149.88.96.0/20,DIRECT"
    echo ""
    echo "5. 保存并重启 VPN 连接"
    echo ""
    echo "📱 或者使用配置文件方式:"
    echo "   在 Shadowrocket 配置文件的 [Rule] 部分添加上述规则"
    
elif [[ "$GATE_IP" == "149.102.253."* ]]; then
    echo "✅ gate.decodo.com 解析正常 (解析到: $GATE_IP)"
    echo "   DNS 配置正确，问题可能在其他地方"
    
    echo -e "\n🔍 测试代理连接:"
    echo "测试代理: http://spwd19mn8t:***@$GATE_IP:10001"
    
    # 测试代理连接
    if curl -x "http://spwd19mn8t:VWo_9unscw6dpAl57T@$GATE_IP:10001" \
           --connect-timeout 10 \
           -s "https://api.ipify.org" > /dev/null 2>&1; then
        echo "✅ 代理连接测试成功"
    else
        echo "❌ 代理连接测试失败"
        echo "   可能是代理服务器问题或网络问题"
    fi
    
else
    echo "⚠️ gate.decodo.com 解析到未知 IP: $GATE_IP"
    echo "   请检查网络配置"
fi

echo -e "\n🧪 建议的测试步骤:"
echo "1. 修复 VPN 分流规则（如果需要）"
echo "2. 重启 VPN 连接"
echo "3. 运行: nslookup gate.decodo.com"
echo "4. 确认解析到 149.102.253.x"
echo "5. 重新测试服务"

echo -e "\n🔄 修复后重新测试:"
echo "   curl -X POST \"http://localhost:8000/extract-metadata\" \\"
echo "     -H \"Content-Type: application/json\" \\"
echo "     -d '{\"url\": \"https://www.youtube.com/watch?v=jNQXAC9IVRw\"}'"