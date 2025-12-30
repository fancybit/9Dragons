#!/usr/bin/env node

/**
 * QQ空间内容提取插件主入口
 * 功能：从QQ空间抓取说说或文章内容并保存为Markdown文件
 */

const { login } = require('./login');
const { crawlQQSpace } = require('./crawler');
const { convertToMarkdown } = require('./markdown');
const { saveToFile } = require('./saver');
const { parseCLI } = require('./cli');

async function main() {
    try {
        // 解析命令行参数
        const options = parseCLI();
        
        console.log(`正在启动QQ空间${options.type === 'articles' ? '文章' : '说说'}提取插件...`);
        
        let contentList = [];
        
        if (options.mock) {
            // 使用模拟数据
            console.log('使用模拟数据模式...');
            contentList = generateMockData(options.type, options.qq || '148332727');
            console.log(`成功生成 ${contentList.length} ${options.type === 'articles' ? '篇文章' : '条说说'}模拟数据！`);
        } else {
            // 扫码登录
            const browser = await login({ headless: options.headless });
            
            if (!browser) {
                console.error('登录失败！');
                return;
            }
            
            try {
                // 抓取内容
                console.log(`开始抓取${options.type === 'articles' ? '文章' : '说说'}内容...`);
                contentList = await crawlQQSpace(browser, options);
                
                if (contentList.length === 0) {
                    console.log(`没有抓取到${options.type === 'articles' ? '文章' : '说说'}内容！`);
                    return;
                }
                
                console.log(`成功抓取到 ${contentList.length} ${options.type === 'articles' ? '篇文章' : '条说说'}！`);
            } finally {
                // 关闭浏览器
                await browser.close();
            }
        }
        
        // 转换为Markdown
        console.log('正在转换为Markdown格式...');
        const markdownContent = convertToMarkdown(contentList, options.type);
        
        // 保存到文件
        console.log('正在保存到文件...');
        await saveToFile(markdownContent, options.output);
        
        console.log(`成功保存到文件：${options.output}`);
        console.log('提取完成！');
    } catch (error) {
        console.error('执行过程中出现错误：', error);
    }
}

/**
 * 生成模拟数据
 * @param {string} type 数据类型：notes（说说）、articles（文章）
 * @param {string} qqNumber QQ号
 * @returns {Array} 模拟数据列表
 */
function generateMockData(type, qqNumber) {
    if (type === 'articles') {
        return [
            {
                title: '测试文章1',
                publishTime: '2024-01-01 12:00:00',
                summary: '这是一篇测试文章的摘要',
                content: `这是一篇测试文章的完整内容。

内容包含多行文本，以及各种格式。`,
                images: ['https://example.com/image1.jpg', 'https://example.com/image2.jpg'],
                link: `https://user.qzone.qq.com/${qqNumber}/blog/123456789`,
                extractedTime: new Date().toISOString()
            },
            {
                title: '测试文章2',
                publishTime: '2024-02-01 14:30:00',
                summary: '这是另一篇测试文章的摘要',
                content: `这是另一篇测试文章的完整内容。

这篇文章没有图片，只有纯文本内容。`,
                images: [],
                link: `https://user.qzone.qq.com/${qqNumber}/blog/987654321`,
                extractedTime: new Date().toISOString()
            }
        ];
    } else {
        // 说说模拟数据
        return [
            {
                publishTime: '2024-01-01 12:00:00',
                content: '这是一条测试说说',
                images: ['https://example.com/image1.jpg', 'https://example.com/image2.jpg'],
                likeCount: '10',
                extractedTime: new Date().toISOString()
            },
            {
                publishTime: '2024-02-01 14:30:00',
                content: '这是另一条测试说说，没有图片',
                images: [],
                likeCount: '5',
                extractedTime: new Date().toISOString()
            },
            {
                publishTime: '2024-03-01 09:15:00',
                content: `这是第三条测试说说，包含更多内容。

说说可以有多行文本，以及各种格式。`,
                images: [],
                likeCount: '8',
                extractedTime: new Date().toISOString()
            }
        ];
    }
}

// 启动程序
if (require.main === module) {
    main();
}

module.exports = { main };
