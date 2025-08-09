#!/bin/bash

# 🚨 修复超时问题的专用脚本
# 针对Workers到Fly.io的连接超时

set -e

echo "🔧 修复Workers到Fly.io连接超时问题"
echo "=================================="

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

# 1. 诊断当前问题
diagnose_current_issue() {
    print_status "诊断当前问题..."
    
    echo "问题症状："
    echo "- 转换进度卡在60%"
    echo "- Fly.io服务没有收到转换请求"
    echo "- 只有健康检查请求到达Fly.io"
    
    echo ""
    echo "可能原因："
    echo "1. Workers到Fly.io的网络连接超时"
    echo "2. Fly.io服务处理请求时间过长"
    echo "3. Workers的fetch请求配置问题"
    echo "4. Cloudflare Workers的出站连接限制"
}

# 2. 测试直接连接
test_direct_connection() {
    print_status "测试直接连接..."
    
    echo "1. 测试本地到Fly.io的连接..."
    if curl -s -f "$FLYIO_URL/health" > /dev/null; then
        print_success "本地到Fly.io连接正常"
    else
        print_error "本地到Fly.io连接失败"
        return 1
    fi
    
    echo ""
    echo "2. 测试元数据提取（模拟Workers请求）..."
    METADATA_START=$(date +%s)
    METADATA_RESPONSE=$(curl -s -X POST "$FLYIO_URL/extract-metadata" \
        -H "Content-Type: application/json" \
        -H "User-Agent: GetGoodTape-Workers/1.0" \
        -d '{"url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"}' \
        --max-time 30)
    METADATA_END=$(date +%s)
    METADATA_TIME=$((METADATA_END - METADATA_START))
    
    if [[ "$METADATA_RESPONSE" == *"success\":true"* ]]; then
        print_success "元数据提取成功 (${METADATA_TIME}秒)"
        if [ $METADATA_TIME -gt 20 ]; then
            print_warning "响应时间较长，可能导致Workers超时"
        fi
    else
        print_error "元数据提取失败"
        echo "响应: $METADATA_RESPONSE"
    fi
}

# 3. 检查Fly.io配置
check_flyio_config() {
    print_status "检查Fly.io配置..."
    
    echo "当前Fly.io配置："
    if [ -f "video-processor/fly.toml" ]; then
        echo "- 应用名: $(grep 'app =' video-processor/fly.toml | cut -d'"' -f2)"
        echo "- 区域: $(grep 'primary_region' video-processor/fly.toml | cut -d'"' -f2)"
        echo "- 内存: $(grep 'memory_mb' video-processor/fly.toml | cut -d'=' -f2 | tr -d ' ')"
        echo "- CPU: $(grep 'cpus' video-processor/fly.toml | cut -d'=' -f2 | tr -d ' ')"
        
        # 检查超时配置
        if grep -q "timeout" video-processor/fly.toml; then
            echo "- 超时配置: $(grep 'timeout' video-processor/fly.toml)"
        else
            print_warning "没有找到超时配置"
        fi
    else
        print_error "找不到fly.toml配置文件"
    fi
}

# 4. 优化Fly.io配置
optimize_flyio_config() {
    print_status "优化Fly.io配置..."
    
    if [ -f "video-processor/fly.toml" ]; then
        echo "创建优化后的配置..."
        
        # 备份原配置
        cp video-processor/fly.toml video-processor/fly.toml.backup
        
        # 更新配置以增加超时时间和资源
        cat > video-processor/fly.toml << 'EOF'
# Fly.io configuration for video-processor service
app = "getgoodtape-video-proc"
primary_region = "nrt"  # Tokyo region for better Asia connectivity

[build]
  dockerfile = "Dockerfile"

[env]
  PORT = "8000"
  PYTHONUNBUFFERED = "1"
  # R2 Storage configuration
  R2_ENDPOINT = "http://wangdonghuiibt-cloudflare.r2.cloudflarestorage.com"
  R2_BUCKET = "getgoodtape-files"

[http_service]
  internal_port = 8000
  force_https = false
  auto_stop_machines = false
  auto_start_machines = true
  min_machines_running = 2
  processes = ["app"]

  [http_service.concurrency]
    type = "requests"
    hard_limit = 25
    soft_limit = 20

  [[http_service.checks]]
    interval = "30s"
    timeout = "20s"  # 增加健康检查超时
    grace_period = "15s"  # 增加宽限期
    method = "GET"
    path = "/health"

[[vm]]
  cpu_kind = "shared"
  cpus = 2
  memory_mb = 4096  # 增加内存到4GB

[metrics]
  port = 9091
  path = "/metrics"

# Auto-scaling configuration
[scaling]
  min_machines = 2
  max_machines = 8  # 增加最大机器数

# Restart policy
[[restart]]
  policy = "on-failure"
  max_retries = 5  # 增加重试次数
EOF

        print_success "配置已优化"
        echo "主要改进："
        echo "- 增加内存到4GB"
        echo "- 增加健康检查超时到20秒"
        echo "- 增加最小运行机器数到2"
        echo "- 增加最大机器数到8"
        echo "- 降低并发限制以提高稳定性"
    else
        print_error "找不到fly.toml文件"
    fi
}

# 5. 重新部署Fly.io服务
redeploy_flyio() {
    print_status "重新部署Fly.io服务..."
    
    if command -v flyctl &> /dev/null; then
        echo "切换到video-processor目录..."
        cd video-processor
        
        echo "部署更新的配置..."
        flyctl deploy --wait-timeout 300  # 5分钟部署超时
        
        if [ $? -eq 0 ]; then
            print_success "Fly.io服务部署成功"
            
            echo "等待服务稳定..."
            sleep 30
            
            # 验证部署
            if curl -s -f "$FLYIO_URL/health" > /dev/null; then
                print_success "服务验证通过"
            else
                print_warning "服务可能还在启动中"
            fi
        else
            print_error "Fly.io部署失败"
            return 1
        fi
        
        cd ..
    else
        print_error "flyctl未安装，请手动部署"
        echo "运行: cd video-processor && flyctl deploy"
    fi
}

# 6. 测试修复效果
test_fix() {
    print_status "测试修复效果..."
    
    echo "等待服务完全启动..."
    sleep 10
    
    echo "1. 测试健康检查..."
    if curl -s -f "$FLYIO_URL/health" > /dev/null; then
        print_success "健康检查通过"
    else
        print_error "健康检查失败"
        return 1
    fi
    
    echo ""
    echo "2. 测试元数据提取性能..."
    for i in {1..3}; do
        echo "测试 $i/3..."
        START_TIME=$(date +%s)
        RESPONSE=$(curl -s -X POST "$FLYIO_URL/extract-metadata" \
            -H "Content-Type: application/json" \
            -d '{"url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"}' \
            --max-time 25)
        END_TIME=$(date +%s)
        DURATION=$((END_TIME - START_TIME))
        
        if [[ "$RESPONSE" == *"success\":true"* ]]; then
            print_success "测试 $i 成功 (${DURATION}秒)"
        else
            print_error "测试 $i 失败 (${DURATION}秒)"
        fi
        
        sleep 2
    done
    
    echo ""
    echo "3. 启动完整转换测试..."
    CONVERT_RESPONSE=$(curl -s -X POST "$WORKERS_URL/api/convert" \
        -H "Content-Type: application/json" \
        -d '{"url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ", "format": "mp3", "quality": "128"}')
    
    if [[ "$CONVERT_RESPONSE" == *"success\":true"* ]]; then
        JOB_ID=$(echo "$CONVERT_RESPONSE" | grep -o '"jobId":"[^"]*"' | cut -d'"' -f4)
        print_success "转换启动成功，任务ID: $JOB_ID"
        
        echo "监控进度（2分钟）..."
        for i in {1..24}; do  # 24 * 5秒 = 2分钟
            sleep 5
            STATUS_RESPONSE=$(curl -s "$WORKERS_URL/api/status/$JOB_ID")
            PROGRESS=$(echo "$STATUS_RESPONSE" | grep -o '"progress":[0-9]*' | cut -d':' -f2)
            STATUS=$(echo "$STATUS_RESPONSE" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
            
            echo "进度: ${PROGRESS:-0}%, 状态: ${STATUS:-unknown}"
            
            if [[ "$STATUS" == "completed" ]]; then
                print_success "转换完成！问题已修复！"
                return 0
            elif [[ "$STATUS" == "failed" ]]; then
                print_error "转换失败"
                echo "错误信息: $STATUS_RESPONSE"
                return 1
            fi
        done
        
        print_warning "转换仍在进行中，请继续监控"
    else
        print_error "转换启动失败"
        echo "响应: $CONVERT_RESPONSE"
    fi
}

# 7. 监控Fly.io日志
monitor_logs() {
    print_status "监控Fly.io日志..."
    
    if command -v flyctl &> /dev/null; then
        echo "显示最近的日志..."
        flyctl logs --app getgoodtape-video-proc --no-tail | tail -20
        
        echo ""
        echo "如需实时监控，运行："
        echo "flyctl logs --app getgoodtape-video-proc"
    else
        print_warning "flyctl未安装，无法查看日志"
    fi
}

# 主函数
main() {
    echo "开始修复Workers到Fly.io连接超时问题..."
    echo ""
    
    diagnose_current_issue
    echo ""
    
    test_direct_connection
    echo ""
    
    check_flyio_config
    echo ""
    
    read -p "是否要优化Fly.io配置并重新部署？(y/N): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        optimize_flyio_config
        echo ""
        
        redeploy_flyio
        echo ""
        
        test_fix
        echo ""
        
        monitor_logs
    else
        echo "跳过重新部署，仅进行测试..."
        test_fix
    fi
    
    echo ""
    print_status "修复流程完成!"
    echo ""
    echo "如果问题仍然存在："
    echo "1. 检查Fly.io机器资源使用情况"
    echo "2. 考虑增加更多机器实例"
    echo "3. 优化video processor代码性能"
    echo "4. 实施请求队列和重试机制"
}

# 运行主函数
main "$@"