#!/bin/bash

echo "🚀 启动 GetGoodTape 本地开发环境"
echo "================================"

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# 检查依赖
check_dependencies() {
    echo -e "${BLUE}🔍 检查依赖...${NC}"
    
    # 检查 Python
    if ! command -v python3 &> /dev/null; then
        echo -e "${RED}❌ Python 3 未安装${NC}"
        exit 1
    fi
    
    # 检查 pip
    if ! command -v pip3 &> /dev/null; then
        echo -e "${RED}❌ pip3 未安装${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ 依赖检查通过${NC}"
}

# 安装 Python 依赖
install_python_deps() {
    echo -e "\n${BLUE}📦 安装 Python 依赖...${NC}"
    
    cd video-processor
    
    if [ ! -f "requirements.txt" ]; then
        echo -e "${RED}❌ requirements.txt 不存在${NC}"
        exit 1
    fi
    
    echo "安装依赖包..."
    pip3 install -r requirements.txt
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Python 依赖安装完成${NC}"
    else
        echo -e "${RED}❌ Python 依赖安装失败${NC}"
        exit 1
    fi
    
    cd ..
}

# 检查环境变量
check_env_vars() {
    echo -e "\n${BLUE}🔧 检查环境变量...${NC}"
    
    cd video-processor
    
    if [ -f ".env" ]; then
        echo -e "${GREEN}✅ 找到 .env 文件${NC}"
        
        # 检查关键环境变量
        source .env
        
        if [ -n "$RESIDENTIAL_PROXY_USER" ]; then
            echo "  ✅ 代理用户名已配置"
        else
            echo -e "  ${YELLOW}⚠️ 代理用户名未配置${NC}"
        fi
        
        if [ -n "$RESIDENTIAL_PROXY_PASS" ]; then
            echo "  ✅ 代理密码已配置"
        else
            echo -e "  ${YELLOW}⚠️ 代理密码未配置${NC}"
        fi
        
        if [ -n "$R2_ACCESS_KEY" ]; then
            echo "  ✅ R2 访问密钥已配置"
        else
            echo -e "  ${YELLOW}⚠️ R2 访问密钥未配置${NC}"
        fi
        
    else
        echo -e "${YELLOW}⚠️ .env 文件不存在，将使用默认配置${NC}"
        echo "  如需完整功能，请创建 .env 文件并配置相关变量"
    fi
    
    cd ..
}

# 启动服务
start_service() {
    echo -e "\n${BLUE}🚀 启动 FastAPI 服务...${NC}"
    
    cd video-processor
    
    echo "启动服务在端口 8000..."
    echo "按 Ctrl+C 停止服务"
    echo ""
    echo -e "${GREEN}服务将在以下地址可用:${NC}"
    echo "  健康检查: http://localhost:8000/health"
    echo "  API 文档: http://localhost:8000/docs"
    echo "  代理状态: http://localhost:8000/proxy-stats"
    echo ""
    
    # 启动服务
    python3 main.py
}

# 主函数
main() {
    echo "开始时间: $(date)"
    echo ""
    
    # 检查依赖
    check_dependencies
    
    # 安装 Python 依赖
    install_python_deps
    
    # 检查环境变量
    check_env_vars
    
    echo -e "\n${GREEN}🎉 准备就绪！${NC}"
    echo ""
    
    # 启动服务
    start_service
}

# 运行主函数
main "$@"