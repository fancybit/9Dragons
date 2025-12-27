const fs = require('fs');
const path = require('path');
const markdownit = require('markdown-it');

// 初始化markdown-it实例
const md = markdownit({
    html: true,
    breaks: true,
    linkify: true
});

// 源目录和目标目录
const srcDir = path.join(__dirname, 'md');
const destDir = path.join(__dirname, 'html');

// 遍历目录并转换文件
function convertMdToHtml(src, dest) {
    // 确保目标目录存在
    if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
    }

    // 读取源目录中的文件
    const files = fs.readdirSync(src);

    files.forEach(file => {
        const srcPath = path.join(src, file);
        const destPath = path.join(dest, file.replace('.md', '.html'));

        // 检查是否是目录
        if (fs.statSync(srcPath).isDirectory()) {
            // 递归处理子目录
            convertMdToHtml(srcPath, destPath);
        } else if (file.endsWith('.md')) {
            // 转换markdown文件为html
            const mdContent = fs.readFileSync(srcPath, 'utf8');
            const htmlContent = md.render(mdContent);
            
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
        }
    });
}

// 开始转换
console.log('开始转换markdown文件为html...');
convertMdToHtml(srcDir, destDir);
console.log('转换完成！所有markdown文件已转换为html格式。');
