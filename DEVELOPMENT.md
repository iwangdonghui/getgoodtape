# GetGoodTape 本地开发指南

## 🚀 快速开始

### 1. 安装依赖

```bash
npm run install:all
```

### 2. 启动开发环境

```bash
npm run dev:all
```

这将启动：

- **前端服务器**: http://localhost:3000 (或下一个可用端口)
- **Workers API**: http://localhost:8789

### 3. 验证环境健康状态

```bash
# 测试API健康状态
npm run test:health

# 测试前端页面加载
npm run test:frontend

# 运行所有测试
npm run test:all
```

## 🔧 开发环境配置

### 服务器端口

- **Next.js 前端**: 3000 (如果被占用会自动使用下一个可用端口)
- **Cloudflare Workers**: 8789
- **API代理**: 通过前端的 `/api/*` 路由

### 环境变量

开发环境会自动检测 `NODE_ENV=development` 并：

- 将API请求代理到本地Workers (localhost:8789)
- 启用详细的错误日志
- 使用本地开发配置

## 🧪 测试和验证

### API健康检查

运行 `npm run test:health` 会测试：

✅ **基础连接**

- 前端服务器可访问性
- Workers API服务器可访问性

✅ **API端点**

- 健康检查 (`/api/health`)
- 平台列表 (`/api/platforms`)
- URL验证 (`/api/validate`)

### 前端集成测试

运行 `npm run test:frontend` 会测试：

✅ **页面加载**

- 主页无React错误
- 应用页面无React错误
- 检测常见的渲染问题

### 手动测试URL验证

1. 打开浏览器访问 http://localhost:3000/app
2. 输入有效的YouTube URL，如：`https://www.youtube.com/watch?v=dQw4w9WgXcQ`
3. 应该看到绿色的"✓"和"YouTube video detected"消息
4. 输入无效URL应该显示红色错误消息

## 🐛 故障排除

### 端口冲突

如果遇到端口被占用的错误：

```bash
# 查找占用端口的进程
lsof -i :8789

# 杀掉进程 (替换PID)
kill <PID>
```

### Workers无法启动

1. 确保已安装所有依赖：`cd workers && npm install`
2. 检查wrangler配置：`workers/wrangler.toml`
3. 尝试单独启动Workers：`cd workers && npm run dev`

### API代理错误

如果前端无法连接到Workers：

1. 确认Workers在端口8789运行
2. 检查 `app/api/*/route.ts` 文件中的WORKERS_URL配置
3. 验证CORS设置允许localhost

## 📁 项目结构

```
getgoodtape/
├── app/                    # Next.js 应用
│   ├── api/               # API路由 (代理到Workers)
│   └── app/               # 主应用页面
├── workers/               # Cloudflare Workers API
│   ├── src/               # Workers源码
│   └── wrangler.toml      # Workers配置
├── components/            # React组件
├── lib/                   # 共享库
├── scripts/               # 开发脚本
│   ├── dev.sh            # 启动开发环境
│   └── test-local-api.js  # API健康检查
└── package.json           # 项目配置
```

## 🔄 开发工作流

### 日常开发

1. `npm run dev:all` - 启动开发环境
2. `npm run test:health` - 验证API健康状态
3. 进行代码修改
4. 浏览器会自动刷新前端更改
5. Workers更改需要重启 (Ctrl+C 然后重新运行 `npm run dev:all`)

### 代码质量

```bash
# 检查代码格式
npm run lint

# 自动修复格式问题
npm run lint:fix

# 格式化代码
npm run format

# 类型检查
npm run type-check
```

## 🌐 生产环境差异

### 开发环境

- API请求代理到 `localhost:8789`
- 详细错误日志
- 热重载
- 无需Cloudflare账户

### 生产环境

- API请求直接到Cloudflare Workers
- 简化错误消息
- 需要Cloudflare D1、R2、KV配置

## 📝 注意事项

1. **URL验证修复**: 已修复"Objects are not valid as a React child"错误
2. **类型安全**: 统一了API响应类型定义
3. **错误处理**: 改进了错误显示逻辑
4. **本地开发**: 支持完整的本地开发和测试
5. **UI重设计**: 全新的/app页面设计，包含：
   - 响应式导航栏
   - 大标题Hero区域
   - 改进的表单设计
   - 支持平台展示
   - 品牌特点区域
   - Footer置底布局

## 🆘 获取帮助

如果遇到问题：

1. 运行 `npm run test:health` 诊断问题
2. 检查浏览器控制台错误
3. 查看终端日志输出
4. 确认所有服务器都在运行
