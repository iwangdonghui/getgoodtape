#!/bin/bash

echo "🔍 Decodo DNS 完整诊断"
echo "======================"

echo "📋 使用不同 DNS 服务器查询:"

echo -e "\n1️⃣ 当前系统 DNS (VPN):"
nslookup gate.decodo.com

echo -e "\n2️⃣ Google DNS (8.8.8.8):"
nslookup gate.decodo.com 8.8.8.8

echo -e "\n3️⃣ Cloudflare DNS (1.1.1.1):"
nslookup gate.decodo.com 1.1.1.1

echo -e "\n4️⃣ 使用 dig 命令:"
if command -v dig &> /dev/null; then
    dig gate.decodo.com
else
    echo "dig 命令不可用"
fi

echo -e "\n📊 分析结果:"
echo "VPN DNS 解析:"
VPN_IP=$(nslookup gate.decodo.com | grep "Address:" | tail -1 | awk '{print $2}')
echo "  $VPN_IP (VPN 内部)"

echo "公共 DNS 解析:"
PUBLIC_IPS=$(nslookup gate.decodo.com 8.8.8.8 | grep "Address:" | grep -v "8.8.8.8" | awk '{print $2}')
echo "$PUBLIC_IPS" | while read ip; do
    if [[ -n "$ip" ]]; then
        echo "  $ip (真实 IP)"
    fi
done

echo -e "\n🔧 建议的分流规则更新:"
echo "基于真实 DNS 解析，你可能需要添加:"
echo "IP-CIDR,149.88.99.0/24,DIRECT"

echo -e "\n🧪 测试代理连接到真实 IP:"
REAL_IP="149.88.99.29"
echo "测试连接到: $REAL_IP:10001"

if curl -x "http://spwd19mn8t:VWo_9unscw6dpAl57T@$REAL_IP:10001" \
       --connect-timeout 10 \
       -s "https://api.ipify.org" > /dev/null 2>&1; then
    echo "✅ 真实 IP 代理连接成功"
else
    echo "❌ 真实 IP 代理连接失败"
fi

echo -e "\n💡 解决方案:"
echo "1. 在 Shadowrocket 中添加更多 IP 段:"
echo "   IP-CIDR,149.88.99.0/24,DIRECT"
echo "2. 或者使用更广泛的规则:"
echo "   IP-CIDR,149.88.0.0/16,DIRECT"
echo "3. 重启 VPN 连接"