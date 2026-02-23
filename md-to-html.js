const fs = require('fs');
const path = require('path');
const markdownit = require('markdown-it');
const { generateImage } = require('./utils/image-generator');

// 初始化markdown-it实例
const md = markdownit({
    html: true,
    breaks: true,
    linkify: true
});

// 源目录和目标目录
const srcDir = path.join(__dirname, 'md');
const destDir = path.join(__dirname, 'html');

/**
 * 预处理Markdown内容，生成图像
 * @param {string} content - Markdown内容
 * @returns {Promise<string>} - 预处理后的Markdown内容
 */
async function preprocessMarkdown(content) {
    // 匹配图像生成标记，格式：![generate](描述文本) 或 ![generate:api](描述文本)
    const generateImageRegex = /!\[(generate(:\w+)?)\]\(([^)]+)\)/g;
    let match;
    let processedContent = content;
    
    while ((match = generateImageRegex.exec(content)) !== null) {
        const fullMatch = match[0];
        const mode = match[2] ? match[2].substring(1) : 'local'; // 提取模式：local 或 api
        const prompt = match[3];
        
        try {
            // 生成图像
            console.log(`正在生成图像：${prompt} (模式：${mode})`);
            const imagePath = await generateImage(prompt, {}, mode);
            
            // 计算相对路径
            const relativePath = path.relative(path.dirname(destDir), imagePath);
            
            // 替换标记为实际图像引用
            processedContent = processedContent.replace(
                fullMatch,
                `![${prompt}](${relativePath})`
            );
        } catch (error) {
            console.error(`生成图像失败（${prompt}）：`, error);
            // 生成失败时，保留原始标记
        }
    }
    
    return processedContent;
}

/**
 * 遍历目录并转换文件
 * @param {string} src - 源目录
 * @param {string} dest - 目标目录
 * @returns {Promise<void>}
 */
async function convertMdToHtml(src, dest) {
    // 确保目标目录存在
    if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
    }

    // 读取源目录中的文件
    const files = fs.readdirSync(src);

    for (const file of files) {
        const srcPath = path.join(src, file);
        const destPath = path.join(dest, file.replace('.md', '.html'));

        // 检查是否是目录
        if (fs.statSync(srcPath).isDirectory()) {
            // 递归处理子目录
            await convertMdToHtml(srcPath, destPath);
        } else if (file.endsWith('.md')) {
            try {
                // 读取markdown文件
                const mdContent = fs.readFileSync(srcPath, 'utf8');
                
                // 预处理Markdown内容，生成图像
                const processedContent = await preprocessMarkdown(mdContent);
                
                // 转换为html
                const htmlContent = md.render(processedContent);
                
                // 创建完整的html文件
                const fullHtml = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${file.replace('.md', '')}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f9f9f9;
        }
        h1, h2, h3, h4, h5, h6 {
            color: #2c3e50;
            margin-top: 30px;
        }
        h1 {
            border-bottom: 2px solid #3498db;
            padding-bottom: 10px;
        }
        p {
            margin: 15px 0;
        }
        ul, ol {
            margin: 15px 0;
            padding-left: 30px;
        }
        li {
            margin: 5px 0;
        }
        blockquote {
            border-left: 4px solid #3498db;
            margin: 20px 0;
            padding: 10px 20px;
            background-color: #f0f8ff;
            font-style: italic;
        }
        code {
            background-color: #f0f0f0;
            padding: 2px 4px;
            border-radius: 3px;
            font-family: 'Courier New', Courier, monospace;
        }
        pre {
            background-color: #f0f0f0;
            padding: 15px;
            border-radius: 5px;
            overflow-x: auto;
        }
        pre code {
            background-color: transparent;
            padding: 0;
        }
        img {
            max-width: 100%;
            height: auto;
            display: block;
            margin: 20px auto;
        }
        a {
            color: #3498db;
            text-decoration: none;
        }
        a:hover {
            text-decoration: underline;
        }
        hr {
            border: 0;
            border-top: 1px solid #eee;
            margin: 30px 0;
        }
    </style>
</head>
<body>
    ${htmlContent}
</body>
</html>`;
            
            // 写入html文件
            fs.writeFileSync(destPath, fullHtml, 'utf8');
            console.log(`转换完成: ${srcPath} -> ${destPath}`);
        } catch (error) {
            console.error(`处理文件失败：${srcPath}`, error);
        }
    }
}

/**
 * 开始转换
 */
async function startConversion() {
    console.log('开始转换markdown文件为html...');
    try {
        await convertMdToHtml(srcDir, destDir);
        console.log('转换完成！所有markdown文件已转换为html格式。');
    } catch (error) {
        console.error('转换过程中发生错误：', error);
    }
}

// 开始转换
startConversion();