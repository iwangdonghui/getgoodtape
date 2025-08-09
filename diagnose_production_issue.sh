#!/bin/bash

# 🚨 生产环境问题诊断脚本
# 专门用于排查60%进度卡住的问题

set -e

echo "🔍 GetGoodTape 生产环境问题诊断"
echo "================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 1. 检查video processor服务状态
check_video_processor() {
    print_status "检查video processor服务状态..."
    
    PROCESSOR_URL="https://getgoodtape-video-proc.fly.dev"
    
    echo "测试基础连接..."
    if curl -s -f "$PROCESSOR_URL/" > /dev/null 2>&1; then
        print_success "Video processor基础连接正常"
    else
        print_error "Video processor基础连接失败"
        echo "响应头信息:"
        curl -s -I "$PROCESSOR_URL/" | head -10
    fi
    
    echo ""
    echo "测试健康检查端点..."
    if curl -s -f "$PROCESSOR_URL/health" > /dev/null 2>&1; then
        print_success "Health端点正常"
        echo "Health响应:"
        curl -s "$PROCESSOR_URL/health" | head -5
    else
        print_error "Health端点失败"
        echo "响应头信息:"
        curl -s -I "$PROCESSOR_URL/health" | head -10
    fi
    
    echo ""
    echo "测试根路径..."
    ROOT_RESPONSE=$(curl -s "$PROCESSOR_URL/")
    if [[ "$ROOT_RESPONSE" == *"GetGoodTape"* ]] || [[ "$ROOT_RESPONSE" == *"FastAPI"* ]]; then
        print_success "根路径响应正常"
    else
        print_error "根路径响应异常: $ROOT_RESPONSE"
    fi
}

# 2. 检查Cloudflare Workers状态
check_workers_api() {
    print_status "检查Cloudflare Workers API状态..."
    
    WORKERS_URL="https://getgoodtape-api-production.wangdonghuiibt-cloudflare.workers.dev"
    
    echo "测试Workers健康检查..."
    if curl -s -f "$WORKERS_URL/health" > /dev/null 2>&1; then
        print_success "Workers API健康检查正常"
        echo "Health响应:"
        curl -s "$WORKERS_URL/health"
    else
        print_error "Workers API健康检查失败"
    fi
    
    echo ""
    echo "测试平台信息端点..."
    if curl -s -f "$WORKERS_URL/api/platforms" > /dev/null 2>&1; then
        print_success "平台信息端点正常"
    else
        print_error "平台信息端点失败"
    fi
}

# 3. 测试完整转换流程
test_conversion_flow() {
    print_status "测试完整转换流程..."
    
    WORKERS_URL="https://getgoodtape-api-production.wangdonghuiibt-cloudflare.workers.dev"
    TEST_URL="https://www.youtube.com/watch?v=dQw4w9WgXcQ"  # Rick Roll - 经典测试视频
    
    echo "1. 测试URL验证..."
    VALIDATE_RESPONSE=$(curl -s -X POST "$WORKERS_URL/api/validate" \
        -H "Content-Type: application/json" \
        -d "{\"url\": \"$TEST_URL\"}")
    
    if [[ "$VALIDATE_RESPONSE" == *"isValid\":true"* ]]; then
        print_success "URL验证正常"
    else
        print_error "URL验证失败"
        echo "验证响应: $VALIDATE_RESPONSE"
        return 1
    fi
    
    echo ""
    echo "2. 测试转换启动..."
    CONVERT_RESPONSE=$(curl -s -X POST "$WORKERS_URL/api/convert" \
        -H "Content-Type: application/json" \
        -d "{\"url\": \"$TEST_URL\", \"format\": \"mp3\", \"quality\": \"128\"}")
    
    if [[ "$CONVERT_RESPONSE" == *"success\":true"* ]]; then
        print_success "转换启动正常"
        JOB_ID=$(echo "$CONVERT_RESPONSE" | grep -o '"jobId":"[^"]*"' | cut -d'"' -f4)
        echo "任务ID: $JOB_ID"
        
        if [[ -n "$JOB_ID" ]]; then
            echo ""
            echo "3. 监控转换进度..."
            for i in {1..10}; do
                sleep 2
                STATUS_RESPONSE=$(curl -s "$WORKERS_URL/api/status/$JOB_ID")
                PROGRESS=$(echo "$STATUS_RESPONSE" | grep -o '"progress":[0-9]*' | cut -d':' -f2)
                STATUS=$(echo "$STATUS_RESPONSE" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
                
                echo "进度: ${PROGRESS:-0}%, 状态: ${STATUS:-unknown}"
                
                if [[ "$STATUS" == "completed" ]]; then
                    print_success "转换完成!"
                    break
                elif [[ "$STATUS" == "failed" ]]; then
                    print_error "转换失败!"
                    echo "错误响应: $STATUS_RESPONSE"
                    break
                elif [[ "$PROGRESS" == "60" ]] && [[ $i -gt 5 ]]; then
                    print_error "检测到60%进度卡住问题!"
                    echo "状态响应: $STATUS_RESPONSE"
                    break
                fi
            done
        fi
    else
        print_error "转换启动失败"
        echo "转换响应: $CONVERT_RESPONSE"
    fi
}

# 4. 检查网络连接
check_network_connectivity() {
    print_status "检查网络连接..."
    
    echo "测试从Workers到video processor的连接..."
    
    # 模拟Workers调用video processor
    PROCESSOR_URL="https://getgoodtape-video-proc.fly.dev"
    
    echo "测试元数据提取端点..."
    METADATA_RESPONSE=$(curl -s -X POST "$PROCESSOR_URL/extract-metadata" \
        -H "Content-Type: application/json" \
        -d '{"url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"}' \
        --max-time 30)
    
    if [[ "$METADATA_RESPONSE" == *"success"* ]]; then
        print_success "元数据提取端点正常"
    else
        print_error "元数据提取端点失败"
        echo "响应: $METADATA_RESPONSE"
    fi
    
    echo ""
    echo "测试转换端点..."
    CONVERT_RESPONSE=$(curl -s -X POST "$PROCESSOR_URL/convert" \
        -H "Content-Type: application/json" \
        -d '{"url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ", "format": "mp3", "quality": "128"}' \
        --max-time 30)
    
    if [[ "$CONVERT_RESPONSE" == *"success"* ]]; then
        print_success "转换端点正常"
    else
        print_error "转换端点失败"
        echo "响应: $CONVERT_RESPONSE"
    fi
}

# 5. 生成修复建议
generate_fix_suggestions() {
    print_status "生成修复建议..."
    
    echo ""
    echo "🔧 修复建议:"
    echo "============"
    
    echo "1. Video Processor服务问题:"
    echo "   - 检查Render服务是否正常运行"
    echo "   - 查看Render部署日志"
    echo "   - 确认环境变量配置正确"
    echo "   - 重新部署video processor服务"
    
    echo ""
    echo "2. 网络连接问题:"
    echo "   - 检查Cloudflare Workers到Render的网络连接"
    echo "   - 确认PROCESSING_SERVICE_URL环境变量正确"
    echo "   - 检查防火墙和安全组设置"
    
    echo ""
    echo "3. 超时问题:"
    echo "   - 增加请求超时时间"
    echo "   - 优化video processor性能"
    echo "   - 添加更多错误处理和重试逻辑"
    
    echo ""
    echo "4. 立即修复步骤:"
    echo "   a) 重启Render服务"
    echo "   b) 检查video processor日志"
    echo "   c) 更新Workers环境变量"
    echo "   d) 重新部署Workers"
}

# 主函数
main() {
    echo "开始诊断生产环境问题..."
    echo ""
    
    check_video_processor
    echo ""
    
    check_workers_api
    echo ""
    
    check_network_connectivity
    echo ""
    
    test_conversion_flow
    echo ""
    
    generate_fix_suggestions
    
    echo ""
    print_status "诊断完成!"
}

# 运行主函数
main "$@"