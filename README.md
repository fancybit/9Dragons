# QQ空间说说提取插件

一个用于从QQ空间抓取说说内容并保存为Markdown文件的命令行工具。

## 功能特性

- 支持扫码登录QQ空间
- 自动抓取说说内容，包括文本、图片和点赞数
- 支持按日期范围筛选
- 将提取的内容转换为格式化的Markdown文件
- 提供友好的命令行界面

## 安装

### 前提条件

- Node.js 14.0.0 或更高版本
- npm 或 yarn 包管理器

### 安装步骤

1. 克隆或下载本项目到本地

2. 进入项目目录：
   ```bash
   cd qq-space-exporter
   ```

3. 安装依赖：
   ```bash
   npm install
   ```

   如果遇到Puppeteer安装问题，可以尝试跳过Chrome下载：
   ```bash
   PUPPETEER_SKIP_DOWNLOAD=true npm install
   ```

## 使用方法

### 基本用法

直接运行命令，使用默认配置：

```bash
node src/index.js
```

或使用全局命令（如果已链接）：

```bash
qq-space-exporter
```

### 命令行选项

```
Usage: qq-space-exporter [options]

QQ空间说说提取插件，用于从QQ空间抓取说说内容并保存为Markdown文件

Options:
  -V, --version           output the version number
  -o, --output <path>     输出文件路径 (default: "./qq-space-notes.md")
  -s, --start-date <date> 开始日期 (YYYY-MM-DD)
  -e, --end-date <date>   结束日期 (YYYY-MM-DD)
  --headless              无头模式运行（不显示浏览器窗口） (default: false)
  -h, --help              display help for command
```

### 示例

1. 指定输出文件路径：
   ```bash
   node src/index.js --output ./output/my-notes.md
   ```

2. 按日期范围筛选：
   ```bash
   node src/index.js --start-date 2024-01-01 --end-date 2024-12-31
   ```

3. 使用无头模式：
   ```bash
   node src/index.js --headless
   ```

## 工作流程

1. 启动浏览器并打开QQ空间登录页面
2. 显示二维码供用户扫描登录
3. 登录成功后，自动进入说说页面
4. 滚动加载更多说说内容
5. 提取每条说说的发布时间、内容、图片和点赞数
6. 按日期范围筛选（如果指定了日期）
7. 将提取的内容转换为Markdown格式
8. 保存到指定的文件中

## 项目结构

```
qq-space-exporter/
├── src/
│   ├── cli.js          # 命令行参数解析
│   ├── crawler.js      # 说说内容抓取
│   ├── index.js        # 主入口文件
│   ├── login.js        # 扫码登录功能
│   ├── markdown.js     # Markdown转换
│   └── saver.js        # 文件保存
├── test/
│   └── basic-test.js   # 基本功能测试
├── package.json        # 项目配置
└── README.md           # 使用说明
```

## 技术栈

- **Node.js**：运行环境
- **Puppeteer**：浏览器自动化和网页抓取
- **Commander.js**：命令行界面
- **Markdown**：内容格式转换

## 注意事项

1. 首次使用需要扫码登录QQ空间
2. 登录成功后，请勿关闭浏览器窗口，程序会自动完成抓取
3. 抓取速度取决于网络状况和QQ空间的响应速度
4. 大量抓取可能会触发QQ空间的反爬机制，建议适当控制抓取频率
5. 本工具仅供个人使用，请勿用于商业用途

## 许可证

MIT License

## 更新日志

### v1.0.0 (2025-12-30)
- 初始版本发布
- 实现扫码登录功能
- 支持说说内容抓取
- 支持Markdown格式转换
- 提供命令行界面

## 贡献

欢迎提交Issue和Pull Request！

## 问题反馈

如果在使用过程中遇到问题，请通过以下方式反馈：

- 提交GitHub Issue
- 发送邮件到：[your-email@example.com]

## 免责声明

本工具仅用于学习和个人使用，请勿用于任何违法或侵犯他人权益的行为。使用本工具产生的一切后果由使用者自行承担。
