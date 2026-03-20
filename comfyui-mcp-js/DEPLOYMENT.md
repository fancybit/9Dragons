# ComfyUI MCP 部署指南

本指南说明如何将 ComfyUI MCP (Model Control Panel) 部署到 Trae 可调用的位置。

## 1. 项目结构

```
comfyui-mcp-js/
├── config/           # 配置文件目录
├── models/           # 模型存储目录
├── src/              # 源代码目录
│   ├── api_server.js   # API 服务器
│   ├── downloader.js   # 模型下载器
│   ├── main.js         # 主类
│   ├── model_manager.js # 模型管理器
│   └── utils.js         # 工具函数
├── index.js          # 主入口点（Trae 调用接口）
├── package.json      # 项目配置和依赖
└── DEPLOYMENT.md     # 部署指南
```

## 2. 安装依赖

1. 确保已安装 Node.js (推荐 v16+)
2. 进入项目目录：
   ```bash
   cd comfyui-mcp-js
   ```
3. 安装依赖：
   ```bash
   npm install
   ```

## 3. 配置 MCP

配置文件位于 `config/config.json`，默认配置如下：

```json
{
  "model_dir": "./models",
  "api_port": 8188,
  "api_host": "localhost",
  "download_timeout": 3600000,
  "max_concurrent_downloads": 2,
  "repositories": {
    "huggingface": "https://huggingface.co",
    "civitai": "https://civitai.com",
    "liblib": "https://www.liblib.ai"
  }
}
```

## 4. 启动 MCP

### 方法 1: 直接启动

```bash
npm start
```

### 方法 2: 作为服务启动（推荐）

可以使用 PM2 等进程管理器将 MCP 作为后台服务运行：

1. 安装 PM2：

   ```bash
   npm install -g pm2
   ```
2. 启动 MCP：

   ```bash
   pm2 start index.js --name "comfyui-mcp"
   ```
3. 设置开机自启：

   ```bash
   pm2 save
   pm2 startup
   ```

## 5. Trae 调用 MCP

### 方法 1: 通过 API 调用

MCP 启动后，Trae 可以通过 HTTP API 调用 MCP 的功能：

- API 地址：`http://localhost:8188/api`
- 主要端点：
  - `GET /api/models` - 获取模型列表
  - `POST /api/download` - 下载模型
  - `GET /api/search` - 搜索模型
  - `GET /api/health` - 健康检查

### 方法 2: 通过 Node.js 模块调用

Trae 可以直接作为 Node.js 模块导入 MCP：

```javascript
// 在 Trae 代码中
const { startMCP, getMCP } = require('./path/to/comfyui-mcp-js');

async function useMCP() {
  // 启动 MCP
  await startMCP();
  
  // 获取 MCP 实例
  const mcp = getMCP();
  
  // 使用 MCP 功能
  const models = mcp.getModels();
  console.log('Models:', models);
  
  // 下载模型
  const downloadId = await mcp.downloadModel('https://www.liblib.ai/model-detail/12345/model-name', 'checkpoint');
  console.log('Download ID:', downloadId);
}

useMCP();
```

## 6. 部署到服务器

### 本地部署

1. 按照上述步骤安装和启动 MCP
2. 确保防火墙允许 8188 端口访问
3. Trae 可以通过 `http://localhost:8188/api` 访问 MCP

### 远程服务器部署

1. 将项目文件上传到远程服务器
2. 安装 Node.js 和依赖
3. 配置 `config/config.json` 中的 `api_host` 为 `0.0.0.0`
4. 启动 MCP 服务
5. 配置服务器防火墙，开放 8188 端口
6. Trae 可以通过 `http://服务器IP:8188/api` 访问 MCP

## 7. 测试 MCP 功能

### 健康检查

```bash
curl http://localhost:8188/api/health
```

预期响应：

```json
{"status":"ok","timestamp":"2024-01-01T00:00:00.000Z"}
```

### 搜索模型（测试 liblib 支持）

```bash
curl "http://localhost:8188/api/search?query=stable diffusion&source=liblib"
```

### 下载模型

```bash
curl -X POST http://localhost:8188/api/download \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.liblib.ai/model-detail/12345/model-name", "model_type": "checkpoint"}'
```

## 8. 故障排除

### 端口被占用

如果 8188 端口被占用，可以修改 `config/config.json` 中的 `api_port` 配置。

### 依赖安装失败

确保网络连接正常，或使用国内镜像：

```bash
npm install --registry=https://registry.npmmirror.com
```

### API 访问失败

- 检查 MCP 是否正在运行
- 检查防火墙设置
- 检查 API 地址是否正确

## 9. 常见问题

### Q: Trae 无法连接到 MCP

**A:** 确保：

1. MCP 服务正在运行
2. 网络连接正常
3. 端口配置正确
4. 防火墙允许访问

### Q: 模型下载失败

**A:** 检查：

1. 网络连接是否正常
2. 模型 URL 是否正确
3. 目标目录权限是否足够
4. 下载超时设置是否合理

### Q: 如何更新 MCP

**A:** 只需替换源代码文件，然后重启服务即可。

## 10. 总结

通过本指南，您可以：

1. 成功部署 ComfyUI MCP
2. 让 Trae 通过 API 或模块方式调用 MCP
3. 利用 MCP 的模型管理和下载功能
4. 支持 Hugging Face、Civitai 和 liblib 三个平台的模型

---

**注意：** 本部署指南适用于 JavaScript 版本的 ComfyUI MCP，与 Python 版本的部署方式不同。
