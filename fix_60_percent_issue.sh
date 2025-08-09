#!/bin/bash

# 🚨 修复60%进度卡住问题的专用脚本
# 针对Fly.io video processor服务

set -e

echo "🔧 修复60%进度卡住问题"
echo "======================"

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
WORKERS_URL="https://getgoodtape-api-production.wangdonghuiibt-cloudflare.workers.dev"
FLYIO_URL="https://getgoodtape-video-proc.fly.dev"
TEST_URL="https://www.youtube.com/watch?v=dQw4w9WgXcQ"

# 1. 验证服务状态
verify_services() {
    print_status "验证服务状态..."
    
    echo "检查Fly.io video processor..."
    if curl -s -f "$FLYIO_URL/health" > /dev/null; then
        print_success "Fly.io服务正常"
        echo "Health响应:"
        curl -s "$FLYIO_URL/health" | jq .
    else
        print_error "Fly.io服务异常"
        return 1
    fi
    
    echo ""
    echo "检查Cloudflare Workers..."
    if curl -s -f "$WORKERS_URL/health" > /dev/null; then
        print_success "Workers服务正常"
        echo "Health响应:"
        curl -s "$WORKERS_URL/health" | jq .
    else
        print_error "Workers服务异常"
        return 1
    fi
}

# 2. 测试网络连接
test_network_connection() {
    print_status "测试网络连接..."
    
    echo "测试Workers到Fly.io的连接..."
    
    # 测试元数据提取（应该很快）
    echo "1. 测试元数据提取..."
    METADATA_START=$(date +%s)
    METADATA_RESPONSE=$(curl -s -X POST "$FLYIO_URL/extract-metadata" \
        -H "Content-Type: application/json" \
        -d "{\"url\": \"$TEST_URL\"}" \
        --max-time 30)
    METADATA_END=$(date +%s)
    METADATA_TIME=$((METADATA_END - METADATA_START))
    
    if [[ "$METADATA_RESPONSE" == *"success\":true"* ]]; then
        print_success "元数据提取成功 (${METADATA_TIME}秒)"
    else
        print_error "元数据提取失败"
        echo "响应: $METADATA_RESPONSE"
        return 1
    fi
    
    echo ""
    echo "2. 测试转换端点连接（不等待完成）..."
    # 只测试连接，不等待完成
    timeout 5 curl -s -X POST "$FLYIO_URL/convert" \
        -H "Content-Type: application/json" \
        -d "{\"url\": \"$TEST_URL\", \"format\": \"mp3\", \"quality\": \"128\"}" \
        > /dev/null 2>&1
    
    if [ $? -eq 124 ]; then
        print_success "转换端点连接正常（超时是预期的）"
    else
        print_warning "转换端点可能有问题"
    fi
}

# 3. 分析60%卡住的原因
analyze_stuck_issue() {
    print_status "分析60%卡住的原因..."
    
    echo "根据代码分析，60%进度对应的步骤是："
    echo "- 40%: 开始转换"
    echo "- 60%: 正在下载和转换视频"
    echo "- 80%: 上传完成，正在最终化"
    
    echo ""
    echo "可能的原因："
    echo "1. Fly.io转换服务超时（5分钟限制）"
    echo "2. 网络连接在转换过程中断开"
    echo "3. R2上传过程失败"
    echo "4. Workers等待转换响应超时"
    
    echo ""
    echo "检查Fly.io服务日志..."
    if command -v flyctl &> /dev/null; then
        print_status "获取最近的Fly.io日志..."
        flyctl logs --app getgoodtape-video-proc -n 50 | tail -20
    else
        print_warning "flyctl未安装，无法查看日志"
        echo "请手动运行: flyctl logs --app getgoodtape-video-proc"
    fi
}

# 4. 实施修复措施
implement_fixes() {
    print_status "实施修复措施..."
    
    echo "1. 重启Fly.io服务..."
    if command -v flyctl &> /dev/null; then
        flyctl restart --app getgoodtape-video-proc
        print_success "Fly.io服务已重启"
        
        # 等待服务恢复
        echo "等待服务恢复..."
        sleep 10
        
        # 验证服务恢复
        if curl -s -f "$FLYIO_URL/health" > /dev/null; then
            print_success "服务恢复正常"
        else
            print_error "服务恢复失败"
        fi
    else
        print_warning "flyctl未安装，请手动重启服务"
        echo "运行: flyctl restart --app getgoodtape-video-proc"
    fi
    
    echo ""
    echo "2. 清理可能的卡住任务..."
    # 这里可以添加清理逻辑，比如重置数据库中的processing状态
    
    echo ""
    echo "3. 优化建议："
    echo "   - 增加转换超时时间"
    echo "   - 添加更多进度更新点"
    echo "   - 实现转换任务的自动重试"
    echo "   - 添加更详细的错误日志"
}

# 5. 测试修复效果
test_fix_effectiveness() {
    print_status "测试修复效果..."
    
    echo "启动一个完整的转换测试..."
    
    # 1. URL验证
    echo "1. 验证URL..."
    VALIDATE_RESPONSE=$(curl -s -X POST "$WORKERS_URL/api/validate" \
        -H "Content-Type: application/json" \
        -d "{\"url\": \"$TEST_URL\"}")
    
    if [[ "$VALIDATE_RESPONSE" == *"isValid\":true"* ]]; then
        print_success "URL验证通过"
    else
        print_error "URL验证失败"
        echo "响应: $VALIDATE_RESPONSE"
        return 1
    fi
    
    # 2. 启动转换
    echo ""
    echo "2. 启动转换..."
    CONVERT_RESPONSE=$(curl -s -X POST "$WORKERS_URL/api/convert" \
        -H "Content-Type: application/json" \
        -d "{\"url\": \"$TEST_URL\", \"format\": \"mp3\", \"quality\": \"128\"}")
    
    if [[ "$CONVERT_RESPONSE" == *"success\":true"* ]]; then
        JOB_ID=$(echo "$CONVERT_RESPONSE" | grep -o '"jobId":"[^"]*"' | cut -d'"' -f4)
        print_success "转换启动成功，任务ID: $JOB_ID"
        
        # 3. 监控进度
        echo ""
        echo "3. 监控转换进度（最多3分钟）..."
        
        for i in {1..36}; do  # 36 * 5秒 = 3分钟
            sleep 5
            STATUS_RESPONSE=$(curl -s "$WORKERS_URL/api/status/$JOB_ID")
            PROGRESS=$(echo "$STATUS_RESPONSE" | grep -o '"progress":[0-9]*' | cut -d':' -f2)
            STATUS=$(echo "$STATUS_RESPONSE" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
            
            echo "进度: ${PROGRESS:-0}%, 状态: ${STATUS:-unknown}"
            
            if [[ "$STATUS" == "completed" ]]; then
                print_success "转换完成!"
                echo "最终响应: $STATUS_RESPONSE"
                return 0
            elif [[ "$STATUS" == "failed" ]]; then
                print_error "转换失败!"
                echo "错误响应: $STATUS_RESPONSE"
                return 1
            elif [[ "$PROGRESS" == "60" ]] && [[ $i -gt 12 ]]; then
                print_error "检测到60%卡住问题仍然存在!"
                echo "当前响应: $STATUS_RESPONSE"
                return 1
            fi
        done
        
        print_warning "转换超时，但可能仍在进行中"
        echo "最后状态: $STATUS_RESPONSE"
    else
        print_error "转换启动失败"
        echo "响应: $CONVERT_RESPONSE"
        return 1
    fi
}

# 6. 生成详细报告
generate_report() {
    print_status "生成问题报告..."
    
    REPORT_FILE="60_percent_issue_report_$(date +%Y%m%d_%H%M%S).txt"
    
    cat > "$REPORT_FILE" << EOF
GetGoodTape 60%进度卡住问题报告
生成时间: $(date)
========================================

服务状态:
- Fly.io URL: $FLYIO_URL
- Workers URL: $WORKERS_URL

问题描述:
转换进度在60%处卡住，对应代码中的"正在下载和转换视频"步骤。

可能原因:
1. Fly.io服务在转换过程中超时或崩溃
2. 网络连接在长时间转换过程中断开
3. R2存储上传失败
4. Workers等待响应超时

修复措施:
1. 重启Fly.io服务
2. 检查服务日志
3. 优化超时配置
4. 添加更多错误处理

建议的代码改进:
1. 在conversion-service.ts中增加更多进度更新点
2. 实现转换任务的自动重试机制
3. 添加更详细的错误日志和监控
4. 考虑将长时间转换任务分解为更小的步骤

EOF

    print_success "报告已生成: $REPORT_FILE"
}

# 主函数
main() {
    echo "开始修复60%进度卡住问题..."
    echo ""
    
    if verify_services; then
        echo ""
        test_network_connection
        echo ""
        analyze_stuck_issue
        echo ""
        implement_fixes
        echo ""
        test_fix_effectiveness
        echo ""
        generate_report
    else
        print_error "服务验证失败，请先检查服务状态"
        exit 1
    fi
    
    echo ""
    print_status "修复流程完成!"
    echo ""
    echo "如果问题仍然存在，请："
    echo "1. 查看生成的报告文件"
    echo "2. 检查Fly.io日志: flyctl logs --app getgoodtape-video-proc"
    echo "3. 考虑增加转换服务的资源配置"
    echo "4. 实施建议的代码改进"
}

# 运行主函数
main "$@"