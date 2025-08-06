#!/bin/bash

echo "🧪 GetGoodTape 本地功能测试套件"
echo "================================"

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 测试计数器
total_tests=0
passed_tests=0
failed_tests=0

# 测试结果记录
test_results=()

# 测试函数
run_test() {
    local test_name="$1"
    local test_command="$2"
    local expected_pattern="$3"
    local timeout="${4:-30}"
    
    total_tests=$((total_tests + 1))
    echo -e "\n${BLUE}🧪 测试 $total_tests: $test_name${NC}"
    echo "命令: $test_command"
    
    # 运行测试
    result=$(timeout $timeout bash -c "$test_command" 2>&1)
    exit_code=$?
    
    if [ $exit_code -eq 0 ] && echo "$result" | grep -q "$expected_pattern"; then
        echo -e "${GREEN}✅ 通过${NC}"
        passed_tests=$((passed_tests + 1))
        test_results+=("✅ $test_name")
    else
        echo -e "${RED}❌ 失败${NC}"
        failed_tests=$((failed_tests + 1))
        test_results+=("❌ $test_name")
        
        # 显示错误信息
        if [ $exit_code -eq 124 ]; then
            echo "  错误: 测试超时 (${timeout}s)"
        else
            echo "  错误信息: $(echo "$result" | head -3)"
        fi
    fi
}

# 检查依赖
check_dependencies() {
    echo -e "${BLUE}🔍 检查依赖项...${NC}"
    
    local deps=("curl" "python3" "pip3")
    local missing_deps=()
    
    for dep in "${deps[@]}"; do
        if ! command -v "$dep" &> /dev/null; then
            missing_deps+=("$dep")
        fi
    done
    
    if [ ${#missing_deps[@]} -gt 0 ]; then
        echo -e "${RED}❌ 缺少依赖: ${missing_deps[*]}${NC}"
        echo "请安装缺少的依赖后重试"
        exit 1
    fi
    
    echo -e "${GREEN}✅ 所有依赖项已安装${NC}"
}

# 启动本地服务
start_local_service() {
    echo -e "\n${BLUE}🚀 启动本地服务...${NC}"
    
    # 检查是否已有服务在运行
    if curl -s http://localhost:8000/health > /dev/null 2>&1; then
        echo -e "${GREEN}✅ 本地服务已在运行${NC}"
        return 0
    fi
    
    # 检查 video-processor 目录
    if [ ! -d "video-processor" ]; then
        echo -e "${RED}❌ video-processor 目录不存在${NC}"
        return 1
    fi
    
    # 启动服务
    echo "启动 FastAPI 服务..."
    cd video-processor
    
    # 检查 Python 依赖
    if [ ! -f "requirements.txt" ]; then
        echo -e "${RED}❌ requirements.txt 不存在${NC}"
        cd ..
        return 1
    fi
    
    # 安装依赖（如果需要）
    echo "检查 Python 依赖..."
    pip3 install -r requirements.txt > /dev/null 2>&1
    
    # 后台启动服务
    echo "在后台启动服务..."
    nohup python3 main.py > ../local_service.log 2>&1 &
    SERVICE_PID=$!
    
    cd ..
    
    # 等待服务启动
    echo "等待服务启动..."
    for i in {1..30}; do
        if curl -s http://localhost:8000/health > /dev/null 2>&1; then
            echo -e "${GREEN}✅ 本地服务启动成功 (PID: $SERVICE_PID)${NC}"
            echo $SERVICE_PID > local_service.pid
            return 0
        fi
        sleep 1
    done
    
    echo -e "${RED}❌ 本地服务启动失败${NC}"
    return 1
}

# 停止本地服务
stop_local_service() {
    echo -e "\n${BLUE}🛑 停止本地服务...${NC}"
    
    if [ -f "local_service.pid" ]; then
        SERVICE_PID=$(cat local_service.pid)
        if kill -0 $SERVICE_PID 2>/dev/null; then
            kill $SERVICE_PID
            echo -e "${GREEN}✅ 本地服务已停止${NC}"
        fi
        rm -f local_service.pid
    fi
}

# 运行所有测试
run_all_tests() {
    echo -e "\n${BLUE}🧪 开始功能测试...${NC}"
    
    # 1. 健康检查测试
    run_test "服务健康检查" \
        "curl -s http://localhost:8000/health" \
        '"status":"healthy"' \
        10
    
    # 2. 代理状态测试
    run_test "代理状态检查" \
        "curl -s http://localhost:8000/proxy-stats" \
        '"success":true' \
        10
    
    # 3. 视频元数据提取测试
    run_test "视频元数据提取" \
        "curl -s -X POST http://localhost:8000/extract-metadata -H 'Content-Type: application/json' -d '{\"url\": \"https://www.youtube.com/watch?v=jNQXAC9IVRw\"}'" \
        '"success":true' \
        30
    
    # 4. MP3 转换测试
    run_test "MP3 转换功能" \
        "curl -s -X POST http://localhost:8000/convert -H 'Content-Type: application/json' -d '{\"url\": \"https://www.youtube.com/watch?v=jNQXAC9IVRw\", \"format\": \"mp3\", \"quality\": \"medium\"}'" \
        '"success":true' \
        120
    
    # 5. MP4 转换测试
    run_test "MP4 转换功能" \
        "curl -s -X POST http://localhost:8000/convert -H 'Content-Type: application/json' -d '{\"url\": \"https://www.youtube.com/watch?v=jNQXAC9IVRw\", \"format\": \"mp4\", \"quality\": \"low\"}'" \
        '"success":true' \
        180
    
    # 6. IP 代理端点测试
    run_test "IP 代理转换端点" \
        "curl -s -X POST http://localhost:8000/convert-with-ip-proxy -H 'Content-Type: application/json' -d '{\"url\": \"https://www.youtube.com/watch?v=jNQXAC9IVRw\", \"format\": \"mp3\", \"quality\": \"medium\"}'" \
        '"success":true' \
        120
    
    # 7. 代理测试端点
    run_test "代理连接测试" \
        "curl -s http://localhost:8000/test-all-proxies" \
        '"success":true' \
        60
    
    # 8. R2 存储测试
    run_test "R2 存储连接测试" \
        "curl -s http://localhost:8000/test-r2" \
        '"status":"success"' \
        30
}

# 生成测试报告
generate_report() {
    echo -e "\n${BLUE}📊 测试报告${NC}"
    echo "=" * 50
    
    echo "总测试数: $total_tests"
    echo -e "通过: ${GREEN}$passed_tests${NC}"
    echo -e "失败: ${RED}$failed_tests${NC}"
    
    if [ $failed_tests -eq 0 ]; then
        echo -e "\n${GREEN}🎉 所有测试通过！${NC}"
    else
        echo -e "\n${YELLOW}⚠️ 有 $failed_tests 个测试失败${NC}"
    fi
    
    echo -e "\n${BLUE}详细结果:${NC}"
    for result in "${test_results[@]}"; do
        echo "  $result"
    done
    
    # 保存报告
    {
        echo "GetGoodTape 本地测试报告"
        echo "========================"
        echo "测试时间: $(date)"
        echo "总测试数: $total_tests"
        echo "通过: $passed_tests"
        echo "失败: $failed_tests"
        echo ""
        echo "详细结果:"
        for result in "${test_results[@]}"; do
            echo "  $result"
        done
    } > test_report.txt
    
    echo -e "\n📄 详细报告已保存到 test_report.txt"
}

# 清理函数
cleanup() {
    echo -e "\n${BLUE}🧹 清理资源...${NC}"
    stop_local_service
    
    # 清理临时文件
    rm -f local_service.log
    
    echo -e "${GREEN}✅ 清理完成${NC}"
}

# 信号处理
trap cleanup EXIT INT TERM

# 主函数
main() {
    echo "开始时间: $(date)"
    echo ""
    
    # 检查依赖
    check_dependencies
    
    # 启动本地服务
    if ! start_local_service; then
        echo -e "${RED}❌ 无法启动本地服务，测试终止${NC}"
        exit 1
    fi
    
    # 运行测试
    run_all_tests
    
    # 生成报告
    generate_report
    
    # 显示日志（如果有错误）
    if [ $failed_tests -gt 0 ] && [ -f "local_service.log" ]; then
        echo -e "\n${BLUE}📋 服务日志 (最后20行):${NC}"
        tail -20 local_service.log
    fi
    
    echo -e "\n${BLUE}🔗 有用的命令:${NC}"
    echo "  查看完整日志: tail -f local_service.log"
    echo "  手动测试健康检查: curl http://localhost:8000/health"
    echo "  查看代理状态: curl http://localhost:8000/proxy-stats"
    echo "  停止服务: kill \$(cat local_service.pid)"
}

# 运行主函数
main "$@"