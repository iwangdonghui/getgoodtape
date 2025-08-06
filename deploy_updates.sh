#!/bin/bash

echo "🚀 部署代理修复更新到 Fly.io"
echo "=============================="

# 检查是否在正确的目录
if [ ! -f "video-processor/fly.toml" ]; then
    echo "❌ 请在项目根目录运行此脚本"
    exit 1
fi

# 进入 video-processor 目录
cd video-processor

echo "📁 当前目录: $(pwd)"
echo "📋 应用名称: getgoodtape-video-proc"

# 检查 flyctl 是否安装
if ! command -v flyctl &> /dev/null; then
    echo "❌ flyctl 未安装，请先安装："
    echo "   curl -L https://fly.io/install.sh | sh"
    echo "   或者使用 brew install flyctl"
    exit 1
fi

# 检查是否已登录
echo "🔐 检查 Fly.io 登录状态..."
if ! flyctl auth whoami &> /dev/null; then
    echo "❌ 请先登录 Fly.io："
    echo "   flyctl auth login"
    exit 1
fi

# 显示当前应用状态
echo "📊 当前应用状态："
flyctl status --app getgoodtape-video-proc

echo ""
echo "🔧 准备部署更新..."
echo "更新内容："
echo "  ✅ 代理配置改为使用 IP 地址"
echo "  ✅ 添加强制 IP 代理端点"
echo "  ✅ 优化代理选择逻辑"

read -p "确认部署？(y/N): " confirm
if [[ $confirm != [yY] ]]; then
    echo "❌ 部署已取消"
    exit 0
fi

# 部署应用
echo ""
echo "🚀 开始部署..."
echo "📁 在 video-processor 目录中执行部署..."
flyctl deploy --app getgoodtape-video-proc

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ 部署成功！"
    
    echo ""
    echo "🧪 测试部署结果..."
    
    # 等待服务启动
    echo "⏳ 等待服务启动（30秒）..."
    sleep 30
    
    # 测试健康检查
    echo "🔍 测试健康检查..."
    health_result=$(curl -s --max-time 10 "https://getgoodtape-video-proc.fly.dev/health")
    if echo "$health_result" | grep -q '"status":"healthy"'; then
        echo "✅ 服务健康检查通过"
    else
        echo "⚠️ 服务健康检查异常"
    fi
    
    # 测试代理配置
    echo "🔍 测试代理配置..."
    proxy_result=$(curl -s --max-time 10 "https://getgoodtape-video-proc.fly.dev/proxy-stats")
    if echo "$proxy_result" | grep -q "149.102.253"; then
        echo "✅ IP 代理配置已生效"
    else
        echo "⚠️ 仍使用域名代理，可能需要更多时间"
    fi
    
    # 测试新端点
    echo "🔍 测试新的 IP 代理端点..."
    new_endpoint_result=$(curl -s --max-time 10 "https://getgoodtape-video-proc.fly.dev/convert-with-ip-proxy" \
        -X POST \
        -H "Content-Type: application/json" \
        -d '{"url": "test", "format": "mp3", "quality": "medium"}')
    
    if echo "$new_endpoint_result" | grep -q -v "Not Found"; then
        echo "✅ 新端点已部署"
    else
        echo "⚠️ 新端点尚未生效"
    fi
    
    echo ""
    echo "🎉 部署完成！"
    echo ""
    echo "📋 后续步骤："
    echo "1. 运行 ./monitor_deployment.sh 监控部署状态"
    echo "2. 运行 ./test_mp4_conversion.sh 测试 MP4 转换"
    echo "3. 检查代理统计: curl https://getgoodtape-video-proc.fly.dev/proxy-stats"
    
    echo ""
    echo "🔗 有用的命令："
    echo "  查看日志: flyctl logs --app getgoodtape-video-proc"
    echo "  查看状态: flyctl status --app getgoodtape-video-proc"
    echo "  重启应用: flyctl restart --app getgoodtape-video-proc"
    
else
    echo ""
    echo "❌ 部署失败！"
    echo "请检查错误信息并重试"
    exit 1
fi