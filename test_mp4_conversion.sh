#!/bin/bash

echo "🎥 测试 MP4 转换功能"
echo "==================="

# 测试 MP4 转换（这个应该失败，因为需要代理）
echo "1. 测试标准 MP4 转换（预期失败）..."
result1=$(curl -s -X POST "https://getgoodtape-video-proc.fly.dev/convert" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://www.youtube.com/watch?v=jNQXAC9IVRw",
    "format": "mp4",
    "quality": "low"
  }' \
  --max-time 120)

if echo "$result1" | grep -q '"success":true'; then
    echo "  ✅ 意外成功！"
else
    echo "  ❌ 如预期失败"
    error=$(echo "$result1" | grep -o '"error":"[^"]*"' | cut -d'"' -f4)
    echo "    错误: $error"
fi

echo ""
echo "2. 测试 MP3 转换（应该成功）..."
result2=$(curl -s -X POST "https://getgoodtape-video-proc.fly.dev/convert" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://www.youtube.com/watch?v=jNQXAC9IVRw",
    "format": "mp3",
    "quality": "medium"
  }' \
  --max-time 120)

if echo "$result2" | grep -q '"success":true'; then
    echo "  ✅ MP3 转换成功"
    filename=$(echo "$result2" | grep -o '"filename":"[^"]*"' | cut -d'"' -f4)
    echo "    文件: $filename"
else
    echo "  ❌ MP3 转换失败"
fi

echo ""
echo "3. 检查当前代理配置..."
proxy_sample=$(curl -s "https://getgoodtape-video-proc.fly.dev/proxy-stats" | jq -r '.proxy_list_sample[0]' 2>/dev/null)
echo "  当前代理示例: $proxy_sample"

if [[ "$proxy_sample" == *"149.102.253"* ]]; then
    echo "  ✅ 使用 IP 代理"
elif [[ "$proxy_sample" == *"gate.decodo.com"* ]]; then
    echo "  ⚠️ 仍使用域名代理"
else
    echo "  ❓ 代理状态未知"
fi

echo ""
echo "📋 结论:"
echo "- MP3 转换: 正常工作（使用直连或工作的代理）"
echo "- MP4 转换: 需要代理才能绕过 YouTube 限制"
echo "- 代理状态: 需要确保使用 IP 地址而不是域名"

echo ""
echo "💡 建议："
echo "1. 等待服务更新以使用 IP 代理"
echo "2. 或者手动测试 IP 代理是否能下载视频"
echo "3. 考虑添加更多代理服务商作为备用"