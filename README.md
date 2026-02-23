# 九龙修真记项目

一个包含小说内容、设定和工具的综合性项目。

## 项目结构

```
九龙修真记/
├── config/              # 配置文件
│   └── image-generator.js  # 图像生成配置
├── html/                # 生成的HTML文件
├── img/                 # 图像文件
│   └── generated/       # 生成的图像
├── md/                  # Markdown文件
│   ├── 章节/            # 小说章节
│   └── 设定/            # 小说设定
├── src/                 # 源代码
├── test/                # 测试文件
├── tools/               # 工具脚本
├── utils/               # 工具模块
│   └── image-generator.js  # 图像生成模块
├── config/              # 配置文件
├── md-to-html.js        # Markdown转HTML脚本
├── makehtml.bat         # 构建批处理文件
├── package.json         # 项目配置
└── README.md            # 使用说明
```

## 功能特性

- **Markdown转HTML**：将小说章节和设定转换为HTML格式
- **图像生成**：集成Stable Diffusion和豆包API，支持根据文本描述生成图像
- **缓存机制**：优化图像生成过程，避免重复生成相同内容
- **错误处理**：完善的错误处理和重试机制，提高可靠性

## 安装

### 前提条件

- Node.js 14.0.0 或更高版本
- npm 或 yarn 包管理器
- （可选）本地Stable Diffusion服务，用于本地图像生成
- （可选）豆包API密钥，用于API图像生成

### 安装步骤

1. 克隆或下载本项目到本地

2. 进入项目目录：
   ```bash
   cd 九龙修真记
   ```

3. 安装依赖：
   ```bash
   npm install
   ```

## 图像生成功能

本项目集成了图像生成功能，支持两种模式：

1. **本地ComfyUI**：使用本地部署的ComfyUI服务生成图像
2. **豆包API**：使用豆包的图像生成API生成图像

### 配置

1. **本地ComfyUI配置**：
   - 修改 `config/image-generator.js` 文件中的 `local` 部分
   - 确保 `baseUrl` 指向正确的本地ComfyUI服务地址（默认：http://localhost:8188）
   - 检查 `comfyui` 部分的配置，确保路径正确：
     ```javascript
     comfyui: {
       path: 'T:\\AI\\comfyui-aki',
       startScript: 'run_nvidia_gpu.bat', // 根据您的GPU类型选择正确的启动脚本
       note: '本机模式时请先启动ComfyUI来生成图'
     }
     ```

2. **豆包API配置**：
   - 修改 `config/image-generator.js` 文件中的 `api` 部分
   - 将 `apiKey` 设置为您的豆包API密钥

### 使用方法

#### 1. 启动ComfyUI

在使用本地模式生成图像前，请先启动ComfyUI：

1. **打开ComfyUI目录**：
   - 进入 `T:\AI\comfyui-aki` 目录

2. **运行启动脚本**：
   - 双击运行 `run_nvidia_gpu.bat` 文件（根据您的GPU类型选择正确的启动脚本）
   - 等待命令行窗口加载完成，直到看到类似以下信息：
     ```
     ComfyUI server started at http://127.0.0.1:8188
     ```

3. **验证服务是否运行**：
   - 打开浏览器，访问 `http://localhost:8188`
   - 如果看到ComfyUI的Web界面，说明服务已成功启动

#### 2. 在Markdown文件中使用图像生成语法

在Markdown文件中，使用以下语法生成图像：

##### 本地ComfyUI模式

```markdown
![generate](图像描述)
```

例如：
```markdown
![generate](明朝王爷穿着华丽的明黄色龙袍，坐在王府花园的凉亭中，手持折扇，神态悠闲，周围有仆人伺候)
```

##### 豆包API模式

```markdown
![generate:api](图像描述)
```

例如：
```markdown
![generate:api](赛博朋克风格的未来都市夜景，高楼大厦鳞次栉比，霓虹灯闪烁，空中有飞行汽车穿梭)
```

### 生成流程

1. **启动ComfyUI**：（仅本地模式需要）
   - 按照上述步骤启动ComfyUI服务

2. **运行转换脚本**：
   - 运行 `makehtml.bat` 批处理文件
   - 或直接运行 `node md-to-html.js`

3. **图像生成**：
   - 脚本会扫描所有Markdown文件，识别图像生成标记
   - 根据标记指定的模式，调用相应的图像生成服务
   - 生成的图像会保存到 `img/generated` 目录

4. **HTML转换**：
   - Markdown文件会被转换为HTML文件
   - 生成的图像会自动嵌入到HTML文件中

### 注意事项

1. **本地ComfyUI**：
   - 需要先启动本地ComfyUI服务
   - 生成速度取决于您的硬件配置
   - ComfyUI默认端口为8188，与我们配置文件中的设置一致

2. **豆包API**：
   - 需要有效的API密钥
   - 可能会产生API调用费用
   - 生成速度取决于网络状况和API响应速度

3. **图像描述**：
   - 详细的描述会生成更符合预期的图像
   - 对于本地ComfyUI，建议使用英文描述以获得更好的效果
   - 对于豆包API，可以使用中文描述

4. **缓存机制**：
   - 相同的描述会使用缓存，避免重复生成
   - 缓存文件存储在 `cache/image-generator` 目录

5. **ComfyUI特殊注意事项**：
   - ComfyUI使用基于工作流的API，与Stable Diffusion Web UI的API不同
   - 默认工作流使用 `v1-5-pruned.safetensors` 模型，您可以根据需要修改配置
   - ComfyUI会将图像保存到其 `output` 目录，同时我们的脚本也会将图像复制到 `img/generated` 目录

## 构建HTML

运行以下命令将Markdown文件转换为HTML文件：

```bash
# Windows
makehtml.bat

# 或直接运行
node md-to-html.js
```

转换后的HTML文件会保存在 `html` 目录中。

## 技术栈

- **Node.js**：运行环境
- **Markdown-it**：Markdown解析和转换
- **Axios**：HTTP请求
- **Stable Diffusion**：本地图像生成
- **豆包API**：远程图像生成

## 许可证

MIT License

## 免责声明

本项目仅供学习和个人使用，请勿用于任何违法或侵犯他人权益的行为。使用本项目产生的一切后果由使用者自行承担。