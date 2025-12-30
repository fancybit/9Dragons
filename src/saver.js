/**
 * 文件保存模块
 * 功能：将Markdown内容保存到文件
 */

const fs = require('fs');
const path = require('path');

/**
 * 将Markdown内容保存到文件
 * @param {string} content Markdown内容
 * @param {string} outputPath 输出文件路径
 * @returns {Promise<void>}
 */
async function saveToFile(content, outputPath) {
    try {
        // 确保输出目录存在
        const outputDir = path.dirname(outputPath);
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
        
        // 写入文件
        await fs.promises.writeFile(outputPath, content, 'utf8');
        
        console.log(`文件保存成功：${outputPath}`);
    } catch (error) {
        console.error('保存文件时出错：', error);
        throw error;
    }
}

module.exports = { saveToFile };
