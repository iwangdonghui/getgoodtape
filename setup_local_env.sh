#!/bin/bash

echo "🚀 设置 GetGoodTape 本地开发环境"
echo "================================"

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# 创建虚拟环境
setup_venv() {
    echo -e "${BLUE}📦 设置 Python 虚拟环境...${NC}"
    
    cd video-processor
    
    if [ ! -d "venv" ]; then
        echo "创建虚拟环境..."
        python3 -m venv venv
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✅ 虚拟环境创建成功${NC}"
        else
            echo -e "${RED}❌ 虚拟环境创建失败${NC}"
            exit 1
        fi
    else
        echo -e "${GREEN}✅ 虚拟环境已存在${NC}"
    fi
    
    # 激活虚拟环境
    echo "激活虚拟环境..."
    source venv/bin/activate
    
    # 安装依赖
    echo "安装 Python 依赖..."
    pip install -r requirements.txt
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ 依赖安装成功${NC}"
    else
        echo -e "${RED}❌ 依赖安装失败${NC}"
        exit 1
    fi
    
    cd ..
}

# 启动服务
start_service() {
    echo -e "\n${BLUE}🚀 启动本地服务...${NC}"
    
    cd video-processor
    
    # 激活虚拟环境并启动服务
    source venv/bin/activate
    
    echo "启动 FastAPI 服务在端口 8000..."
    echo "按 Ctrl+C 停止服务"
    echo ""
    echo -e "${GREEN}服务地址:${NC}"
    echo "  健康检查: http://localhost:8000/health"
    echo "  API 文档: http://localhost:8000/docs"
    echo "  代理状态: http://localhost:8000/proxy-stats"
    echo ""
    
    python main.py
}

# 主函数
main() {
    setup_venv
    start_service
}

main "$@"