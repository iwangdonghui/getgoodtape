#!/bin/bash

# 🚀 VPN + 代理冲突自动修复脚本
# 自动检测问题并提供解决方案

echo "🚀 VPN + 代理冲突自动修复工具"
echo "================================"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 检查依赖
check_dependencies() {
    echo -e "${BLUE}🔍 检查系统依赖...${NC}"
    
    local missing_deps=()
    
    if ! command -v curl &> /dev/null; then
        missing_deps+=("curl")
    fi
    
    if ! command -v jq &> /dev/null; then
        echo -e "${YELLOW}⚠️ jq 未安装，将使用基础解析${NC}"
    fi
    
    if [ ${#missing_deps[@]} -gt 0 ]; then
        echo -e "${RED}❌ 缺少依赖: ${missing_deps[*]}${NC}"
        echo "请安装缺少的依赖后重试"
        exit 1
    fi
    
    echo -e "${GREEN}✅ 系统依赖检查完成${NC}"
}

# 检测当前代理状态
check_proxy_status() {
    echo -e "\n${BLUE}📊 检查当前代理状态...${NC}"
    
    local proxy_stats=$(curl -s --max-time 30 "https://getgoodtape-video-proc.fly.dev/proxy-stats" 2>/dev/null)
    
    if [ $? -eq 0 ] && [ -n "$proxy_stats" ]; then
        echo -e "${GREEN}✅ 代理状态获取成功${NC}"
        
        # 解析成功率
        local success_count=0
        local failure_count=0
        
        if command -v jq &> /dev/null; then
            # 使用 jq 精确解析
            success_count=$(echo "$proxy_stats" | jq '[.proxy_stats[] | .success] | add // 0')
            failure_count=$(echo "$proxy_stats" | jq '[.proxy_stats[] | .failure] | add // 0')
        else
            # 使用 grep 基础解析
            success_count=$(echo "$proxy_stats" | grep -o '"success":[0-9]*' | grep -o '[0-9]*' | awk '{sum+=$1} END {print sum+0}')
            failure_count=$(echo "$proxy_stats" | grep -o '"failure":[0-9]*' | grep -o '[0-9]*' | awk '{sum+=$1} END {print sum+0}')
        fi
        
        local total_attempts=$((success_count + failure_count))
        
        echo "  📈 代理统计:"
        echo "    - 成功: $success_count"
        echo "    - 失败: $failure_count"
        echo "    - 总计: $total_attempts"
        
        if [ "$success_count" -gt 0 ]; then
            local success_rate=$(echo "scale=1; $success_count * 100 / $total_attempts" | bc 2>/dev/null || echo "unknown")
            echo -e "    - 成功率: ${GREEN}${success_rate}%${NC}"
            return 0  # 代理工作正常
        else
            echo -e "    - 成功率: ${RED}0%${NC}"
            return 1  # 代理完全失败
        fi
    else
        echo -e "${RED}❌ 无法获取代理状态${NC}"
        return 2  # 服务不可用
    fi
}

# 检测 VPN 环境
detect_vpn() {
    echo -e "\n${BLUE}🔍 检测 VPN 环境...${NC}"
    
    # 获取当前 IP
    local current_ip=$(curl -s --max-time 10 "https://api.ipify.org" 2>/dev/null)
    
    if [ -n "$current_ip" ]; then
        echo "  当前 IP: $current_ip"
        
        # 检查是否是私有 IP 或 VPN 特征
        if [[ "$current_ip" =~ ^10\. ]] || [[ "$current_ip" =~ ^172\. ]] || [[ "$current_ip" =~ ^192\.168\. ]]; then
            echo -e "  ${YELLOW}⚠️ 检测到私有 IP，可能在 NAT 环境中${NC}"
            return 1
        elif [[ "$current_ip" =~ vpn ]] || [[ "$current_ip" =~ proxy ]]; then
            echo -e "  ${YELLOW}⚠️ IP 地址包含 VPN/代理特征${NC}"
            return 1
        else
            echo -e "  ${GREEN}✅ 看起来是直连环境${NC}"
            return 0
        fi
    else
        echo -e "  ${RED}❌ 无法获取 IP 地址${NC}"
        return 2
    fi
}

# 测试 DNS 解析
test_dns() {
    echo -e "\n${BLUE}🌐 测试 DNS 解析...${NC}"
    
    local domains=("gate.decodo.com" "google.com" "youtube.com")
    local dns_ok=true
    
    for domain in "${domains[@]}"; do
        if nslookup "$domain" > /dev/null 2>&1; then
            local ip=$(nslookup "$domain" 2>/dev/null | grep -A1 "Name:" | tail -1 | awk '{print $2}' | head -1)
            echo -e "  ✅ $domain -> $ip"
        else
            echo -e "  ${RED}❌ $domain -> 解析失败${NC}"
            dns_ok=false
        fi
    done
    
    if [ "$dns_ok" = true ]; then
        echo -e "${GREEN}✅ DNS 解析正常${NC}"
        return 0
    else
        echo -e "${RED}❌ DNS 解析存在问题${NC}"
        return 1
    fi
}

# 生成 VPN 配置建议
generate_vpn_config() {
    local vpn_type=$1
    
    echo -e "\n${BLUE}📋 生成 $vpn_type 配置...${NC}"
    
    case "$vpn_type" in
        "clash")
            cat << 'EOF'
# Clash/ClashX 配置
# 在 config.yaml 的 rules 部分最前面添加：

rules:
  # Decodo 代理直连 - 必须在最前面
  - DOMAIN,gate.decodo.com,DIRECT
  - DOMAIN-SUFFIX,decodo.com,DIRECT
  - IP-CIDR,149.88.96.0/20,DIRECT
  
  # 测试域名
  - DOMAIN,httpbin.org,DIRECT
  - DOMAIN,api.ipify.org,DIRECT
  
  # 其他规则保持不变...
EOF
            ;;
        "surge")
            cat << 'EOF'
# Surge 配置
# 在 [Rule] 部分最前面添加：

[Rule]
DOMAIN,gate.decodo.com,DIRECT
DOMAIN-SUFFIX,decodo.com,DIRECT
IP-CIDR,149.88.96.0/20,DIRECT
DOMAIN,httpbin.org,DIRECT
DOMAIN,api.ipify.org,DIRECT

# 其他规则保持不变...
EOF
            ;;
        "shadowrocket")
            cat << 'EOF'
# Shadowrocket 配置
# 在配置文件的 [Rule] 部分最前面添加：

[Rule]
DOMAIN,gate.decodo.com,DIRECT
DOMAIN-SUFFIX,decodo.com,DIRECT
IP-CIDR,149.88.96.0/20,DIRECT
DOMAIN,httpbin.org,DIRECT
EOF
            ;;
        "system")
            cat << 'EOF'
# 系统环境变量配置
# 添加到 ~/.zshrc 或 ~/.bashrc：

export NO_PROXY="gate.decodo.com,*.decodo.com,149.88.96.0/20"
export no_proxy="gate.decodo.com,*.decodo.com,149.88.96.0/20"

# 然后运行：
source ~/.zshrc  # 或 source ~/.bashrc
EOF
            ;;
        *)
            echo "通用配置规则："
            echo "域名直连: gate.decodo.com, *.decodo.com"
            echo "IP 段直连: 149.88.96.0/20"
            ;;
    esac
}

# 交互式配置选择
interactive_config() {
    echo -e "\n${BLUE}🔧 选择你的 VPN 客户端类型:${NC}"
    echo "1) Clash/ClashX"
    echo "2) Surge"
    echo "3) Shadowrocket"
    echo "4) 系统环境变量"
    echo "5) 其他/通用"
    echo "6) 跳过配置"
    
    read -p "请选择 (1-6): " choice
    
    case $choice in
        1) generate_vpn_config "clash" ;;
        2) generate_vpn_config "surge" ;;
        3) generate_vpn_config "shadowrocket" ;;
        4) generate_vpn_config "system" ;;
        5) generate_vpn_config "generic" ;;
        6) echo "跳过配置生成" ;;
        *) echo "无效选择，显示通用配置"; generate_vpn_config "generic" ;;
    esac
}

# 提供解决方案
provide_solutions() {
    local proxy_status=$1
    local vpn_detected=$2
    local dns_ok=$3
    
    echo -e "\n${BLUE}💡 解决方案建议:${NC}"
    
    if [ "$proxy_status" -eq 0 ]; then
        echo -e "${GREEN}🎉 代理工作正常，无需修复！${NC}"
        return 0
    fi
    
    if [ "$vpn_detected" -eq 1 ] && [ "$proxy_status" -eq 1 ]; then
        echo -e "${YELLOW}🔧 检测到 VPN 冲突，建议解决方案：${NC}"
        echo ""
        echo "1. 【推荐】配置 VPN 分流规则"
        echo "   - 将 Decodo 代理服务器设为直连"
        echo "   - 重启 VPN 客户端使规则生效"
        echo ""
        echo "2. 临时解决方案"
        echo "   - 测试时暂时关闭 VPN"
        echo "   - 或使用系统环境变量绕过"
        echo ""
        echo "3. 长期解决方案"
        echo "   - 考虑更换代理服务商"
        echo "   - 使用支持更好分流的 VPN 客户端"
        
        interactive_config
        
    elif [ "$dns_ok" -eq 1 ]; then
        echo -e "${RED}🔧 DNS 解析问题，建议解决方案：${NC}"
        echo "1. 检查 DNS 设置"
        echo "2. 尝试使用公共 DNS (8.8.8.8, 1.1.1.1)"
        echo "3. 确保 VPN 不拦截 DNS 查询"
        
    else
        echo -e "${RED}🔧 网络连接问题，建议解决方案：${NC}"
        echo "1. 检查网络连接"
        echo "2. 验证代理凭据"
        echo "3. 确认防火墙设置"
        echo "4. 联系网络管理员"
    fi
}

# 验证修复效果
verify_fix() {
    echo -e "\n${BLUE}🧪 验证修复效果...${NC}"
    
    echo "等待 10 秒让配置生效..."
    sleep 10
    
    # 重新检查代理状态
    if check_proxy_status; then
        echo -e "\n${GREEN}🎉 修复成功！代理现在工作正常${NC}"
        return 0
    else
        echo -e "\n${YELLOW}⚠️ 修复可能需要更多时间生效${NC}"
        echo "建议："
        echo "1. 重启 VPN 客户端"
        echo "2. 等待几分钟后重新测试"
        echo "3. 检查配置是否正确应用"
        return 1
    fi
}

# 主函数
main() {
    echo "开始自动诊断和修复..."
    
    # 检查依赖
    check_dependencies
    
    # 检查代理状态
    check_proxy_status
    local proxy_status=$?
    
    # 检测 VPN
    detect_vpn
    local vpn_detected=$?
    
    # 测试 DNS
    test_dns
    local dns_ok=$?
    
    # 提供解决方案
    provide_solutions $proxy_status $vpn_detected $dns_ok
    
    # 如果用户配置了 VPN 规则，验证效果
    if [ "$proxy_status" -eq 1 ] && [ "$vpn_detected" -eq 1 ]; then
        echo -e "\n${BLUE}是否已经配置了 VPN 分流规则？${NC}"
        read -p "输入 y 验证修复效果，或按回车跳过: " verify_choice
        
        if [[ "$verify_choice" =~ ^[Yy]$ ]]; then
            verify_fix
        fi
    fi
    
    echo -e "\n${BLUE}📞 需要更多帮助？${NC}"
    echo "- 运行详细测试: ./test_proxy_fix.sh"
    echo "- 查看完整文档: VPN_PROXY_SOLUTION.md"
    echo "- 检查服务状态: https://getgoodtape-video-proc.fly.dev/proxy-stats"
    
    echo -e "\n${GREEN}诊断完成！${NC}"
}

# 运行主函数
main "$@"