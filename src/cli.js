/**
 * 命令行界面模块
 * 功能：解析命令行参数
 */

const { Command } = require('commander');

/**
 * 解析命令行参数
 * @returns {Object} 解析后的配置选项
 */
function parseCLI() {
    const program = new Command();
    
    program
        .name('qq-space-exporter')
        .description('QQ空间内容提取插件，用于从QQ空间抓取说说或文章内容并保存为Markdown文件')
        .version('1.0.0');
    
    program
        .option('-o, --output <path>', '输出文件路径', './qq-space-output.md')
        .option('-t, --type <type>', '提取类型，可选值：notes（说说）、articles（文章）', 'notes')
        .option('-q, --qq <number>', 'QQ号')
        .option('-s, --start-date <date>', '开始日期 (YYYY-MM-DD)')
        .option('-e, --end-date <date>', '结束日期 (YYYY-MM-DD)')
        .option('--headless', '无头模式运行（不显示浏览器窗口）', false)
        .option('--mock', '使用模拟数据（用于测试）', false);
    
    // 解析命令行参数
    program.parse(process.argv);
    
    return program.opts();
}

module.exports = { parseCLI };
