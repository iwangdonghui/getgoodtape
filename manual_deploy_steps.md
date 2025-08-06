# 🚀 手动部署步骤

如果你想手动部署，请按以下步骤操作：

## 1. 切换到 video-processor 目录

```bash
cd video-processor
```

## 2. 检查 Fly.io 登录状态

```bash
flyctl auth whoami
```

如果未登录，请先登录：

```bash
flyctl auth login
```

## 3. 检查当前应用状态

```bash
flyctl status --app getgoodtape-video-proc
```

## 4. 部署应用

```bash
flyctl deploy --app getgoodtape-video-proc
```

## 5. 检查部署结果

```bash
# 查看应用状态
flyctl status --app getgoodtape-video-proc

# 查看日志
flyctl logs --app getgoodtape-video-proc

# 测试健康检查
curl https://getgoodtape-video-proc.fly.dev/health
```

## 6. 测试代理配置

```bash
# 回到项目根目录
cd ..

# 运行测试脚本
./test_mp4_conversion.sh
```

---

**注意**: 部署可能需要几分钟时间，请耐心等待。
