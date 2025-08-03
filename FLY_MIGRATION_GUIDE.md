# Fly.io 迁移指南

## 迁移准备

### 1. 安装 Fly.io CLI

```bash
curl -L https://fly.io/install.sh | sh
```

### 2. 登录 Fly.io

```bash
flyctl auth login
```

### 3. 准备环境变量

从Railway控制台获取以下环境变量：

- `YOUTUBE_API_KEY`
- `RESIDENTIAL_PROXY_USER` (Decodo用户名)
- `RESIDENTIAL_PROXY_PASS` (Decodo密码)
- `RESIDENTIAL_PROXY_ENDPOINT` (Decodo端点)

## 迁移步骤

### 步骤1：部署到Fly.io

```bash
cd video-processor
export YOUTUBE_API_KEY="your_youtube_api_key"
export RESIDENTIAL_PROXY_USER="your_decodo_user"
export RESIDENTIAL_PROXY_PASS="your_decodo_pass"
export RESIDENTIAL_PROXY_ENDPOINT="gate.decodo.com:10001"

./deploy-fly.sh
```

### 步骤2：验证部署

```bash
# 检查健康状态
curl https://getgoodtape-video-processor.fly.dev/health

# 测试元数据提取
curl -X POST "https://getgoodtape-video-processor.fly.dev/extract-metadata" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"}'

# 测试视频转换
curl -X POST "https://getgoodtape-video-processor.fly.dev/convert" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "format": "mp3",
    "quality": "128"
  }'
```

### 步骤3：更新Workers配置

修改 `workers/.dev.vars` 和生产环境变量：

```
PROCESSING_SERVICE_URL=https://getgoodtape-video-processor.fly.dev
```

### 步骤4：DNS和域名配置（可选）

如果需要自定义域名：

```bash
flyctl certs create your-domain.com -a getgoodtape-video-processor
```

## 成本对比

### Fly.io方案

- 基础服务: $8-15/月 (1GB RAM)
- 静态IP: $2/月
- Decodo代理: $75/月
- **总计**: $85-92/月

### 当前Railway方案

- Railway: $5-20/月
- Decodo代理: $75/月
- **总计**: $80-95/月

## 优势

✅ 更好的全球网络覆盖
✅ 更稳定的平台
✅ 静态IP避免代理认证问题
✅ 更好的监控和日志
✅ 自动扩缩容

## 回滚计划

如果Fly.io有问题，可以快速回滚到Railway：

1. 保持Railway服务运行
2. 测试Fly.io稳定性
3. 确认无误后关闭Railway

## 监控和维护

```bash
# 查看应用状态
flyctl status -a getgoodtape-video-processor

# 查看日志
flyctl logs -a getgoodtape-video-processor

# 查看静态IP
flyctl ips list -a getgoodtape-video-processor

# 扩容
flyctl scale count 2 -a getgoodtape-video-processor

# 更新环境变量
flyctl secrets set NEW_VAR="value" -a getgoodtape-video-processor
```
