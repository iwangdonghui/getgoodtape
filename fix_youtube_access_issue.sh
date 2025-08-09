#!/bin/bash

# 🚨 修复YouTube访问限制问题
# 这是导致60%卡住的根本原因

set -e

echo "🔧 修复YouTube访问限制问题"
echo "=========================="

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

# 配置
FLYIO_URL="https://getgoodtape-video-proc.fly.dev"
WORKERS_URL="https://getgoodtape-api-production.wangdonghuiibt-cloudflare.workers.dev"

# 1. 诊断YouTube访问问题
diagnose_youtube_issue() {
    print_status "诊断YouTube访问问题..."
    
    echo "测试YouTube访问..."
    YOUTUBE_RESPONSE=$(curl -s -X POST "$FLYIO_URL/extract-metadata" \
        -H "Content-Type: application/json" \
        -d '{"url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"}' \
        --max-time 15)
    
    if [[ "$YOUTUBE_RESPONSE" == *"success\":false"* ]]; then
        print_error "YouTube访问被限制"
        echo "错误信息: $(echo "$YOUTUBE_RESPONSE" | jq -r '.error')"
        
        if [[ "$YOUTUBE_RESPONSE" == *"restricted"* ]]; then
            echo ""
            echo "这是导致60%卡住的根本原因："
            echo "1. Workers调用Fly.io的/convert端点"
            echo "2. Fly.io尝试访问YouTube但被限制"
            echo "3. 请求超时或失败"
            echo "4. Workers一直等待响应，卡在60%"
        fi
    else
        print_success "YouTube访问正常"
    fi
}

# 2. 测试其他平台
test_other_platforms() {
    print_status "测试其他平台..."
    
    # 测试TikTok
    echo "测试TikTok..."
    TIKTOK_RESPONSE=$(curl -s -X POST "$FLYIO_URL/extract-metadata" \
        -H "Content-Type: application/json" \
        -d '{"url": "https://www.tiktok.com/@username/video/1234567890"}' \
        --max-time 15)
    
    if [[ "$TIKTOK_RESPONSE" == *"success\":true"* ]]; then
        print_success "TikTok访问正常"
    else
        print_warning "TikTok访问可能有问题"
    fi
    
    # 测试Twitter/X
    echo "测试Twitter/X..."
    TWITTER_RESPONSE=$(curl -s -X POST "$FLYIO_URL/extract-metadata" \
        -H "Content-Type: application/json" \
        -d '{"url": "https://x.com/username/status/1234567890"}' \
        --max-time 15)
    
    if [[ "$TWITTER_RESPONSE" == *"success\":true"* ]]; then
        print_success "Twitter/X访问正常"
    else
        print_warning "Twitter/X访问可能有问题"
    fi
}

# 3. 检查代理配置
check_proxy_config() {
    print_status "检查代理配置..."
    
    echo "检查Fly.io环境变量..."
    if command -v flyctl &> /dev/null; then
        flyctl secrets list --app getgoodtape-video-proc
    else
        print_warning "flyctl未安装，无法检查secrets"
    fi
    
    echo ""
    echo "检查代理相关文件..."
    if [ -f "video-processor/proxy_config.py" ]; then
        echo "找到proxy_config.py"
        grep -n "RESIDENTIAL_PROXY" video-processor/proxy_config.py | head -5
    fi
    
    if [ -f "video-processor/smart_proxy_fallback.py" ]; then
        echo "找到smart_proxy_fallback.py"
    fi
}

# 4. 启用代理解决方案
enable_proxy_solution() {
    print_status "启用代理解决方案..."
    
    echo "设置代理环境变量..."
    if command -v flyctl &> /dev/null; then
        # 设置代理相关的环境变量
        echo "设置住宅代理配置..."
        
        # 这些是示例值，实际使用时需要替换为真实的代理配置
        read -p "请输入住宅代理用户名: " PROXY_USER
        read -s -p "请输入住宅代理密码: " PROXY_PASS
        echo
        read -p "请输入代理端点 (例如: gate.decodo.com:8080): " PROXY_ENDPOINT
        
        if [[ -n "$PROXY_USER" && -n "$PROXY_PASS" && -n "$PROXY_ENDPOINT" ]]; then
            flyctl secrets set RESIDENTIAL_PROXY_USER="$PROXY_USER" --app getgoodtape-video-proc
            flyctl secrets set RESIDENTIAL_PROXY_PASS="$PROXY_PASS" --app getgoodtape-video-proc
            flyctl secrets set RESIDENTIAL_PROXY_ENDPOINT="$PROXY_ENDPOINT" --app getgoodtape-video-proc
            
            print_success "代理配置已设置"
        else
            print_warning "跳过代理配置"
        fi
    else
        print_error "flyctl未安装，无法设置secrets"
        echo "请手动运行:"
        echo "flyctl secrets set RESIDENTIAL_PROXY_USER=your_user --app getgoodtape-video-proc"
        echo "flyctl secrets set RESIDENTIAL_PROXY_PASS=your_pass --app getgoodtape-video-proc"
        echo "flyctl secrets set RESIDENTIAL_PROXY_ENDPOINT=your_endpoint --app getgoodtape-video-proc"
    fi
}

# 5. 实施YouTube绕过策略
implement_youtube_bypass() {
    print_status "实施YouTube绕过策略..."
    
    echo "检查是否有YouTube绕过端点..."
    BYPASS_RESPONSE=$(curl -s -X POST "$FLYIO_URL/youtube-bypass" \
        -H "Content-Type: application/json" \
        -d '{"url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"}' \
        --max-time 15)
    
    if [[ "$BYPASS_RESPONSE" == *"success\":true"* ]]; then
        print_success "YouTube绕过策略可用"
        echo "绕过策略: $(echo "$BYPASS_RESPONSE" | jq -r '.strategy')"
    else
        print_warning "YouTube绕过策略不可用或失败"
        echo "响应: $BYPASS_RESPONSE"
    fi
}

# 6. 重新部署并测试
redeploy_and_test() {
    print_status "重新部署并测试..."
    
    if command -v flyctl &> /dev/null; then
        echo "重新部署Fly.io应用..."
        cd video-processor
        flyctl deploy --wait-timeout 300
        cd ..
        
        echo "等待服务稳定..."
        sleep 30
        
        # 测试修复效果
        echo "测试YouTube访问..."
        FIXED_RESPONSE=$(curl -s -X POST "$FLYIO_URL/extract-metadata" \
            -H "Content-Type: application/json" \
            -d '{"url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"}' \
            --max-time 20)
        
        if [[ "$FIXED_RESPONSE" == *"success\":true"* ]]; then
            print_success "YouTube访问修复成功!"
            
            # 测试完整转换流程
            echo ""
            echo "测试完整转换流程..."
            test_full_conversion
        else
            print_error "YouTube访问仍然失败"
            echo "响应: $FIXED_RESPONSE"
        fi
    else
        print_error "flyctl未安装，请手动部署"
    fi
}

# 7. 测试完整转换流程
test_full_conversion() {
    print_status "测试完整转换流程..."
    
    echo "启动转换任务..."
    CONVERT_RESPONSE=$(curl -s -X POST "$WORKERS_URL/api/convert" \
        -H "Content-Type: application/json" \
        -d '{"url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ", "format": "mp3", "quality": "128"}')
    
    if [[ "$CONVERT_RESPONSE" == *"success\":true"* ]]; then
        JOB_ID=$(echo "$CONVERT_RESPONSE" | grep -o '"jobId":"[^"]*"' | cut -d'"' -f4)
        print_success "转换启动成功，任务ID: $JOB_ID"
        
        echo "监控转换进度..."
        for i in {1..30}; do  # 30 * 5秒 = 2.5分钟
            sleep 5
            STATUS_RESPONSE=$(curl -s "$WORKERS_URL/api/status/$JOB_ID")
            PROGRESS=$(echo "$STATUS_RESPONSE" | grep -o '"progress":[0-9]*' | cut -d':' -f2)
            STATUS=$(echo "$STATUS_RESPONSE" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
            
            echo "进度: ${PROGRESS:-0}%, 状态: ${STATUS:-unknown}"
            
            if [[ "$STATUS" == "completed" ]]; then
                print_success "🎉 转换完成！60%卡住问题已解决！"
                return 0
            elif [[ "$STATUS" == "failed" ]]; then
                print_error "转换失败"
                echo "错误信息: $STATUS_RESPONSE"
                return 1
            elif [[ "$PROGRESS" == "60" ]] && [[ $i -gt 10 ]]; then
                print_warning "仍然卡在60%，可能需要更多时间或其他解决方案"
            fi
        done
        
        print_warning "转换超时，但可能仍在进行中"
    else
        print_error "转换启动失败"
        echo "响应: $CONVERT_RESPONSE"
    fi
}

# 8. 提供替代解决方案
provide_alternatives() {
    print_status "提供替代解决方案..."
    
    echo ""
    echo "如果YouTube访问仍然受限，考虑以下解决方案："
    echo ""
    echo "1. 🌐 使用代理服务"
    echo "   - 住宅代理 (推荐)"
    echo "   - 数据中心代理"
    echo "   - 轮换代理池"
    echo ""
    echo "2. 🔄 更换服务器位置"
    echo "   - 尝试不同的Fly.io区域"
    echo "   - 使用多区域部署"
    echo ""
    echo "3. 🛠️ 技术绕过"
    echo "   - 使用不同的User-Agent"
    echo "   - 实施请求头轮换"
    echo "   - 使用YouTube API (有配额限制)"
    echo ""
    echo "4. 📱 专注其他平台"
    echo "   - TikTok, Instagram, Twitter/X"
    echo "   - 这些平台通常限制较少"
    echo ""
    echo "5. 🔧 架构调整"
    echo "   - 使用多个处理服务器"
    echo "   - 实施智能路由"
    echo "   - 添加失败重试机制"
}

# 主函数
main() {
    echo "开始修复YouTube访问限制问题..."
    echo "这是导致60%进度卡住的根本原因"
    echo ""
    
    diagnose_youtube_issue
    echo ""
    
    test_other_platforms
    echo ""
    
    check_proxy_config
    echo ""
    
    read -p "是否要配置代理解决方案？(y/N): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        enable_proxy_solution
        echo ""
        
        implement_youtube_bypass
        echo ""
        
        redeploy_and_test
    else
        echo "跳过代理配置..."
        implement_youtube_bypass
        echo ""
        
        test_full_conversion
    fi
    
    echo ""
    provide_alternatives
    
    echo ""
    print_status "修复流程完成!"
    echo ""
    echo "📋 总结："
    echo "- 60%卡住的根本原因是YouTube访问限制"
    echo "- 需要配置代理或使用绕过策略"
    echo "- 考虑专注于其他平台以获得更好的稳定性"
}

# 运行主函数
main "$@"