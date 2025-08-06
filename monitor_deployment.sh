#!/bin/bash

echo "🚀 监控 Fly.io 部署状态"
echo "======================"

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

check_deployment_status() {
    echo -e "${BLUE}📡 检查服务状态...${NC}"
    
    # 检查健康状态
    health_status=$(curl -s --max-time 10 "https://getgoodtape-video-proc.fly.dev/health" 2>/dev/null)
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ 服务在线${NC}"
        
        # 检查版本（如果有版本信息）
        version=$(echo "$health_status" | jq -r '.version' 2>/dev/null)
        if [ "$version" != "null" ] && [ -n "$version" ]; then
            echo "  版本: $version"
        fi
        
        return 0
    else
        echo -e "${RED}❌ 服务离线或重启中${NC}"
        return 1
    fi
}

check_proxy_config() {
    echo -e "${BLUE}🔍 检查代理配置...${NC}"
    
    proxy_stats=$(curl -s --max-time 10 "https://getgoodtape-video-proc.fly.dev/proxy-stats" 2>/dev/null)
    
    if [ $? -eq 0 ]; then
        # 检查是否使用 IP 代理
        if echo "$proxy_stats" | grep -q "149.102.253"; then
            echo -e "${GREEN}✅ 检测到 IP 代理配置${NC}"
            
            # 显示代理示例
            proxy_sample=$(echo "$proxy_stats" | jq -r '.proxy_list_sample[0]' 2>/dev/null)
            echo "  代理示例: $(echo "$proxy_sample" | sed 's/:VWo_9unscw6dpAl57T@/:***@/')"
            return 0
        else
            echo -e "${YELLOW}⚠️ 仍使用域名代理${NC}"
            proxy_sample=$(echo "$proxy_stats" | jq -r '.proxy_list_sample[0]' 2>/dev/null)
            echo "  当前代理: $(echo "$proxy_sample" | sed 's/:VWo_9unscw6dpAl57T@/:***@/')"
            return 1
        fi
    else
        echo -e "${RED}❌ 无法获取代理状态${NC}"
        return 2
    fi
}

test_new_endpoint() {
    echo -e "${BLUE}🧪 测试新的 IP 代理端点...${NC}"
    
    result=$(curl -s --max-time 30 -X POST "https://getgoodtape-video-proc.fly.dev/convert-with-ip-proxy" \
        -H "Content-Type: application/json" \
        -d '{
            "url": "https://www.youtube.com/watch?v=jNQXAC9IVRw",
            "format": "mp3",
            "quality": "medium"
        }' 2>/dev/null)
    
    if echo "$result" | grep -q '"success":true'; then
        echo -e "${GREEN}✅ 新端点工作正常${NC}"
        return 0
    elif echo "$result" | grep -q "Not Found"; then
        echo -e "${YELLOW}⚠️ 新端点尚未部署${NC}"
        return 1
    else
        echo -e "${RED}❌ 新端点测试失败${NC}"
        return 2
    fi
}

test_mp4_conversion() {
    echo -e "${BLUE}🎥 测试 MP4 转换功能...${NC}"
    
    result=$(curl -s --max-time 120 -X POST "https://getgoodtape-video-proc.fly.dev/convert" \
        -H "Content-Type: application/json" \
        -d '{
            "url": "https://www.youtube.com/watch?v=jNQXAC9IVRw",
            "format": "mp4",
            "quality": "low"
        }' 2>/dev/null)
    
    if echo "$result" | grep -q '"success":true'; then
        echo -e "${GREEN}🎉 MP4 转换成功！代理修复生效！${NC}"
        filename=$(echo "$result" | jq -r '.result.filename' 2>/dev/null)
        echo "  文件: $filename"
        return 0
    elif echo "$result" | grep -q "Sign in to confirm"; then
        echo -e "${YELLOW}⚠️ 仍被 YouTube 阻止，代理未生效${NC}"
        return 1
    else
        echo -e "${RED}❌ MP4 转换失败${NC}"
        error=$(echo "$result" | jq -r '.error' 2>/dev/null)
        echo "  错误: $error"
        return 2
    fi
}

# 主监控循环
monitor_deployment() {
    local check_count=0
    local max_checks=20  # 最多检查 20 次（约 10 分钟）
    
    echo "开始监控部署状态..."
    echo "按 Ctrl+C 停止监控"
    echo ""
    
    while [ $check_count -lt $max_checks ]; do
        check_count=$((check_count + 1))
        echo -e "${BLUE}📊 检查 #$check_count ($(date '+%H:%M:%S'))${NC}"
        
        # 检查服务状态
        if check_deployment_status; then
            
            # 检查代理配置
            if check_proxy_config; then
                echo -e "${GREEN}🎯 IP 代理配置已生效！${NC}"
                
                # 测试新端点
                test_new_endpoint
                
                # 测试 MP4 转换
                if test_mp4_conversion; then
                    echo ""
                    echo -e "${GREEN}🎉 部署成功！所有功能正常工作！${NC}"
                    echo "✅ 服务在线"
                    echo "✅ IP 代理配置生效"
                    echo "✅ MP4 转换功能恢复"
                    break
                fi
            fi
        fi
        
        echo ""
        if [ $check_count -lt $max_checks ]; then
            echo "等待 30 秒后重新检查..."
            sleep 30
        fi
    done
    
    if [ $check_count -eq $max_checks ]; then
        echo -e "${YELLOW}⏰ 监控超时，请手动检查部署状态${NC}"
    fi
}

# 显示当前状态
echo "当前时间: $(date)"
echo ""

# 开始监控
monitor_deployment

echo ""
echo "监控完成！"