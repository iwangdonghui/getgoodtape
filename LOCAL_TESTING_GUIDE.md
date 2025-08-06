# 🧪 GetGoodTape 本地测试指南

## 📋 概述

这个指南将帮助你在本地环境中测试 GetGoodTape 的所有功能，包括视频转换、代理配置和存储功能。

## 🚀 快速开始

### 1. 启动本地服务

```bash
./start_local.sh
```

这个脚本会：

- ✅ 检查 Python 和依赖项
- ✅ 安装必要的 Python 包
- ✅ 检查环境变量配置
- ✅ 启动 FastAPI 服务在端口 8000

### 2. 运行自动化测试

```bash
./test_all_local.sh
```

这个脚本会：

- ✅ 自动启动本地服务
- ✅ 运行完整的功能测试套件
- ✅ 生成详细的测试报告
- ✅ 自动清理资源

### 3. 运行交互式测试

```bash
./test_manual.sh
```

这个脚本提供交互式菜单，让你可以：

- 🏥 测试健康检查
- 🔄 检查代理状态
- 📋 测试视频元数据提取
- 🎵 测试 MP3 转换
- 🎥 测试 MP4 转换
- 🌐 测试 IP 代理端点

## 📦 依赖要求

### 系统依赖

- Python 3.8+
- pip3
- curl
- FFmpeg（用于视频处理）

### Python 依赖

所有 Python 依赖都在 `video-processor/requirements.txt` 中定义，启动脚本会自动安装。

## 🔧 环境配置

### 必需的环境变量

在 `video-processor/.env` 文件中配置：

```bash
# Decodo 代理配置
RESIDENTIAL_PROXY_USER=your_username
RESIDENTIAL_PROXY_PASS=your_password
RESIDENTIAL_PROXY_ENDPOINT=gate.decodo.com:10001

# YouTube API（可选）
YOUTUBE_API_KEY=your_api_key

# R2 存储配置（可选）
R2_ACCESS_KEY=your_access_key
R2_SECRET_KEY=your_secret_key
R2_ENDPOINT=your_r2_endpoint
R2_BUCKET=your_bucket_name
```

### 可选配置

```bash
# 其他代理服务商（备用）
SMARTPROXY_USER=your_smartproxy_user
SMARTPROXY_PASS=your_smartproxy_pass

BRIGHTDATA_USER=your_brightdata_user
BRIGHTDATA_PASS=your_brightdata_pass
```

## 🧪 测试功能

### 1. 基础功能测试

#### 健康检查

```bash
curl http://localhost:8000/health
```

预期响应：

```json
{
  "status": "healthy",
  "service": "video-processor",
  "version": "1.0.1",
  "dependencies": {
    "yt-dlp": true,
    "ffmpeg": true,
    "python": true
  }
}
```

#### 代理状态

```bash
curl http://localhost:8000/proxy-stats
```

### 2. 视频转换测试

#### MP3 转换

```bash
curl -X POST http://localhost:8000/convert \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://www.youtube.com/watch?v=jNQXAC9IVRw",
    "format": "mp3",
    "quality": "medium"
  }'
```

#### MP4 转换

```bash
curl -X POST http://localhost:8000/convert \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://www.youtube.com/watch?v=jNQXAC9IVRw",
    "format": "mp4",
    "quality": "low"
  }'
```

### 3. 高级功能测试

#### IP 代理转换

```bash
curl -X POST http://localhost:8000/convert-with-ip-proxy \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://www.youtube.com/watch?v=jNQXAC9IVRw",
    "format": "mp3",
    "quality": "medium"
  }'
```

#### 视频元数据提取

```bash
curl -X POST http://localhost:8000/extract-metadata \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.youtube.com/watch?v=jNQXAC9IVRw"}'
```

## 📊 测试结果分析

### 成功指标

- ✅ 健康检查返回 `"status": "healthy"`
- ✅ 代理配置显示 IP 地址（如 `149.102.253.x`）
- ✅ MP3/MP4 转换返回 `"success": true`
- ✅ 生成的文件大小 > 0

### 常见问题

#### 1. 代理连接失败

**症状**: 代理成功率为 0%
**解决方案**:

- 检查 VPN 分流规则
- 确认代理凭据正确
- 验证网络连接

#### 2. YouTube 访问被阻止

**症状**: 出现 "Sign in to confirm you're not a bot" 错误
**解决方案**:

- 确保代理正常工作
- 尝试不同的代理端点
- 使用 IP 代理端点

#### 3. FFmpeg 错误

**症状**: 转换过程中出现 FFmpeg 相关错误
**解决方案**:

- 确保 FFmpeg 已安装
- 检查系统路径配置

## 🔗 有用的端点

### API 文档

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

### 监控端点

- 健康检查: http://localhost:8000/health
- 代理状态: http://localhost:8000/proxy-stats
- 服务器 IP: http://localhost:8000/server-ip

### 测试端点

- R2 存储测试: http://localhost:8000/test-r2
- 代理测试: http://localhost:8000/test-all-proxies
- VPN 冲突诊断: http://localhost:8000/diagnose-vpn-conflict

## 🛠️ 故障排除

### 查看日志

```bash
# 如果使用 test_all_local.sh
tail -f local_service.log

# 如果手动启动服务
# 日志会直接显示在终端
```

### 重启服务

```bash
# 停止服务 (Ctrl+C)
# 然后重新运行
./start_local.sh
```

### 清理临时文件

```bash
# 清理转换生成的临时文件
rm -f /tmp/*_watch_*.mp3
rm -f /tmp/*_watch_*.mp4
```

## 📈 性能基准

### 预期性能指标

- **MP3 转换**: 30-60 秒（19 秒视频）
- **MP4 转换**: 60-120 秒（19 秒视频）
- **元数据提取**: 5-15 秒
- **健康检查**: < 1 秒

### 文件大小参考

- **MP3 (medium)**: ~300KB（19 秒视频）
- **MP4 (low)**: ~3MB（19 秒视频）

---

**提示**: 如果遇到问题，请先检查网络连接和 VPN 配置，然后查看服务日志获取详细错误信息。
