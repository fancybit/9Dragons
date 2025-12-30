/**
 * 插件基本功能测试
 */

console.log('开始测试QQ空间内容提取插件...');

// 测试模块加载
console.log('\n1. 测试模块加载...');
try {
    const { parseCLI } = require('../src/cli');
    const { convertToMarkdown, convertNotesToMarkdown, convertArticlesToMarkdown } = require('../src/markdown');
    const { crawlQQSpace } = require('../src/crawler');
    
    console.log('✅ 模块加载成功！');
    
    // 测试命令行参数解析
    console.log('\n2. 测试命令行参数解析...');
    
    // 测试说说提取参数
    process.argv = ['node', 'test.js', '--output', 'test.md', '--start-date', '2024-01-01', '--end-date', '2024-12-31'];
    
    const noteOptions = parseCLI();
    console.log('✅ 说说提取命令行参数解析成功：');
    console.log('   输出路径：', noteOptions.output);
    console.log('   提取类型：', noteOptions.type);
    console.log('   开始日期：', noteOptions.startDate);
    console.log('   结束日期：', noteOptions.endDate);
    
    // 测试文章提取参数
    process.argv = ['node', 'test.js', '--type', 'articles', '--output', 'articles.md'];
    
    const articleOptions = parseCLI();
    console.log('✅ 文章提取命令行参数解析成功：');
    console.log('   输出路径：', articleOptions.output);
    console.log('   提取类型：', articleOptions.type);
    
    // 测试Markdown转换 - 说说
    console.log('\n3. 测试说说Markdown转换...');
    
    const testNoteList = [
        {
            publishTime: '2024-01-01 12:00:00',
            content: '这是一条测试说说',
            images: ['https://example.com/image1.jpg', 'https://example.com/image2.jpg'],
            likeCount: '10'
        },
        {
            publishTime: '2024-02-01 14:30:00',
            content: '这是另一条测试说说，没有图片',
            images: [],
            likeCount: '5'
        }
    ];
    
    const noteMarkdownContent = convertNotesToMarkdown(testNoteList);
    console.log('✅ 说说Markdown转换成功！');
    console.log('\n转换结果预览：');
    console.log(noteMarkdownContent.substring(0, 200) + '...');
    
    // 测试Markdown转换 - 文章
    console.log('\n4. 测试文章Markdown转换...');
    
    const testArticleList = [
        {
            title: '测试文章标题',
            publishTime: '2024-01-01 12:00:00',
            content: '这是一篇测试文章的完整内容',
            summary: '这是一篇测试文章的摘要',
            images: ['https://example.com/image1.jpg', 'https://example.com/image2.jpg'],
            link: 'https://example.com/article1'
        },
        {
            title: '另一篇测试文章',
            publishTime: '2024-02-01 14:30:00',
            content: '这是另一篇测试文章的完整内容',
            images: [],
            link: 'https://example.com/article2'
        }
    ];
    
    const articleMarkdownContent = convertArticlesToMarkdown(testArticleList);
    console.log('✅ 文章Markdown转换成功！');
    console.log('\n转换结果预览：');
    console.log(articleMarkdownContent.substring(0, 200) + '...');
    
    // 测试通用转换函数
    console.log('\n5. 测试通用Markdown转换函数...');
    
    // 测试说说转换
    const generalNoteContent = convertToMarkdown(testNoteList, 'notes');
    console.log('✅ 通用函数说说转换成功！');
    
    // 测试文章转换
    const generalArticleContent = convertToMarkdown(testArticleList, 'articles');
    console.log('✅ 通用函数文章转换成功！');
    
    console.log('\n✅ 所有基本功能测试通过！');
    
} catch (error) {
    console.error('❌ 测试失败：', error.message);
    console.error('错误堆栈：', error.stack);
    process.exit(1);
}
