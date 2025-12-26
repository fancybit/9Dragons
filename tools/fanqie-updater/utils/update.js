// 番茄小说更新工具 - 更新管理模块

const fs = require('fs');
const path = require('path');
const chalk = require('chalk').default;

/**
 * 更新管理类
 */
class UpdateManager {
  /**
   * 构造函数
   * @param {Object} config 配置对象
   * @param {ChapterManager} chapterManager 章节管理实例
   * @param {FormatConverter} formatConverter 格式转换实例
   */
  constructor(config, chapterManager, formatConverter) {
    this.config = config;
    this.chapterManager = chapterManager;
    this.formatConverter = formatConverter;
    this.exportPath = path.join(__dirname, '../', config.directories.exportPath);
  }

  /**
   * 初始化导出目录
   */
  initExportDirectory() {
    if (!fs.existsSync(this.exportPath)) {
      fs.mkdirSync(this.exportPath, { recursive: true });
      console.log(chalk.green('导出目录已创建：'), this.exportPath);
    }
  }

  /**
   * 获取待更新章节
   * @returns {Array} 待更新章节列表
   */
  getPendingUpdateChapters() {
    return this.chapterManager.getUnpublishedChapters();
  }

  /**
   * 导出章节为番茄小说格式
   * @param {Array} chapters 章节列表
   * @returns {Object} 导出结果
   */
  exportChaptersForFanqie(chapters) {
    this.initExportDirectory();

    const exportData = {
      novelName: this.config.novel.name,
      author: this.config.novel.author,
      exportTime: new Date().toISOString(),
      chapters: chapters.map(chapter => {
        return {
          id: chapter.id,
          title: chapter.title,
          wordCount: chapter.wordCount,
          content: this.formatConverter.markdownToFanqieFormat(chapter.content),
          rawContent: chapter.content
        };
      })
    };

    // 导出为JSON文件
    const jsonFileName = `fanqie-export-${Date.now()}.json`;
    const jsonFilePath = path.join(this.exportPath, jsonFileName);
    fs.writeFileSync(jsonFilePath, JSON.stringify(exportData, null, 2), 'utf8');

    // 导出为纯文本文件（方便复制到番茄编辑器）
    const txtFileName = `fanqie-export-${Date.now()}.txt`;
    const txtFilePath = path.join(this.exportPath, txtFileName);
    let txtContent = '';
    
    exportData.chapters.forEach(chapter => {
      txtContent += `\n\n${chapter.title}\n\n`;
      txtContent += `${chapter.content}\n\n`;
      txtContent += `--- 章节结束 ---\n\n`;
    });
    
    fs.writeFileSync(txtFilePath, txtContent, 'utf8');

    // 导出为HTML文件（预览用）
    const htmlFileName = `fanqie-export-${Date.now()}.html`;
    const htmlFilePath = path.join(this.exportPath, htmlFileName);
    let htmlContent = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${exportData.novelName} - 番茄小说导出</title>
  <style>
    body {
      font-family: 'Microsoft YaHei', sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      line-height: 1.6;
      color: #333;
    }
    h1 {
      text-align: center;
      color: #2c3e50;
      margin-bottom: 30px;
    }
    .chapter {
      margin-bottom: 40px;
      padding-bottom: 20px;
      border-bottom: 1px solid #eee;
    }
    .chapter-title {
      font-size: 24px;
      font-weight: bold;
      text-align: center;
      margin-bottom: 20px;
      color: #34495e;
    }
    .chapter-content {
      font-size: 16px;
      line-height: 1.8;
    }
    .chapter-meta {
      text-align: right;
      font-size: 14px;
      color: #7f8c8d;
      margin-top: 10px;
    }
    .export-info {
      background-color: #f8f9fa;
      padding: 15px;
      border-radius: 5px;
      margin-bottom: 30px;
      font-size: 14px;
      color: #6c757d;
    }
  </style>
</head>
<body>
  <div class="export-info">
    <strong>小说名称：</strong>${exportData.novelName}<br>
    <strong>作者：</strong>${exportData.author}<br>
    <strong>导出时间：</strong>${new Date(exportData.exportTime).toLocaleString()}
  </div>
`;
    
    exportData.chapters.forEach(chapter => {
      htmlContent += `
    <div class="chapter">
      <h2 class="chapter-title">${chapter.title}</h2>
      <div class="chapter-content">${this.formatConverter.markdownToHtml(chapter.rawContent)}</div>
      <div class="chapter-meta">字数：${chapter.wordCount} | 章节ID：${chapter.id}</div>
    </div>
`;
    });
    
    htmlContent += `
</body>
</html>
`;
    
    fs.writeFileSync(htmlFilePath, htmlContent, 'utf8');

    return {
      success: true,
      chaptersCount: chapters.length,
      jsonFilePath: jsonFilePath,
      txtFilePath: txtFilePath,
      htmlFilePath: htmlFilePath,
      totalWordCount: chapters.reduce((sum, chapter) => sum + chapter.wordCount, 0)
    };
  }

  /**
   * 更新小说章节（标记为已发布）
   * @param {Array} chapterIds 章节ID列表
   * @returns {Object} 更新结果
   */
  updateChapters(chapterIds) {
    const results = {
      success: [],
      failed: []
    };

    chapterIds.forEach(id => {
      try {
        this.chapterManager.markAsPublished(id);
        results.success.push(id);
      } catch (error) {
        results.failed.push({
          id: id,
          error: error.message
        });
      }
    });

    return results;
  }

  /**
   * 生成更新报告
   * @returns {Object} 更新报告
   */
  generateUpdateReport() {
    const allChapters = this.chapterManager.readChapters();
    const pendingChapters = this.getPendingUpdateChapters();
    const publishedChapters = this.chapterManager.getPublishedChapters();

    return {
      novelName: this.config.novel.name,
      author: this.config.novel.author,
      reportTime: new Date().toISOString(),
      totalChapters: allChapters.length,
      publishedChapters: publishedChapters.length,
      pendingChapters: pendingChapters.length,
      totalWordCount: allChapters.reduce((sum, chapter) => sum + chapter.wordCount, 0),
      pendingWordCount: pendingChapters.reduce((sum, chapter) => sum + chapter.wordCount, 0),
      pendingChaptersList: pendingChapters.map(chapter => ({
        id: chapter.id,
        title: chapter.title,
        wordCount: chapter.wordCount,
        updatedAt: chapter.updatedAt
      }))
    };
  }

  /**
   * 显示更新报告
   */
  displayUpdateReport() {
    const report = this.generateUpdateReport();
    
    console.log(chalk.cyan('=== 更新报告 ==='));
    console.log(chalk.yellow(`小说名称：${report.novelName}`));
    console.log(chalk.yellow(`作者：${report.author}`));
    console.log(chalk.yellow(`报告时间：${new Date(report.reportTime).toLocaleString()}`));
    console.log(chalk.yellow(`总章节数：${report.totalChapters}`));
    console.log(chalk.yellow(`已发布章节：${report.publishedChapters}`));
    console.log(chalk.yellow(`待更新章节：${report.pendingChapters}`));
    console.log(chalk.yellow(`总字数：${report.totalWordCount}`));
    console.log(chalk.yellow(`待更新字数：${report.pendingWordCount}`));
    
    if (report.pendingChapters > 0) {
      console.log(chalk.cyan('\n待更新章节列表：'));
      report.pendingChaptersList.forEach(chapter => {
        console.log(`[${chapter.id}] ${chapter.title} - 字数：${chapter.wordCount} - 更新时间：${new Date(chapter.updatedAt).toLocaleString()}`);
      });
    }
  }

  /**
   * 批量导出待更新章节
   * @returns {Object} 导出结果
   */
  batchExportPendingUpdates() {
    const pendingChapters = this.getPendingUpdateChapters();
    
    if (pendingChapters.length === 0) {
      console.log(chalk.yellow('没有待更新章节'));
      return null;
    }
    
    console.log(chalk.cyan(`准备导出 ${pendingChapters.length} 个待更新章节`));
    const exportResult = this.exportChaptersForFanqie(pendingChapters);
    
    console.log(chalk.green('\n=== 导出完成 ==='));
    console.log(chalk.yellow(`导出章节数：${exportResult.chaptersCount}`));
    console.log(chalk.yellow(`总字数：${exportResult.totalWordCount}`));
    console.log(chalk.yellow(`JSON文件：${exportResult.jsonFilePath}`));
    console.log(chalk.yellow(`纯文本文件：${exportResult.txtFilePath}`));
    console.log(chalk.yellow(`HTML预览文件：${exportResult.htmlFilePath}`));
    
    return exportResult;
  }

  /**
   * 导出单个章节
   * @param {number} chapterId 章节ID
   * @returns {Object|null} 导出结果
   */
  exportSingleChapter(chapterId) {
    const chapter = this.chapterManager.getChapter(chapterId);
    
    if (!chapter) {
      console.log(chalk.red(`章节ID ${chapterId} 不存在`));
      return null;
    }
    
    const exportResult = this.exportChaptersForFanqie([chapter]);
    
    console.log(chalk.green('\n=== 章节导出完成 ==='));
    console.log(chalk.yellow(`章节：${chapter.title}`));
    console.log(chalk.yellow(`字数：${chapter.wordCount}`));
    console.log(chalk.yellow(`JSON文件：${exportResult.jsonFilePath}`));
    console.log(chalk.yellow(`纯文本文件：${exportResult.txtFilePath}`));
    console.log(chalk.yellow(`HTML预览文件：${exportResult.htmlFilePath}`));
    
    return exportResult;
  }
}

module.exports = UpdateManager;