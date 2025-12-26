// 番茄小说更新工具 - 章节管理模块

const fs = require('fs');
const path = require('path');
const chalk = require('chalk').default;

/**
 * 章节管理类
 */
class ChapterManager {
  /**
   * 构造函数
   * @param {Object} config 配置对象
   */
  constructor(config) {
    this.config = config;
    this.chapterPath = path.join(__dirname, '../', config.directories.chapterPath);
    this.chapters = [];
    this.updateLogPath = path.join(__dirname, '../', config.directories.updateLogPath);
    this.updateLog = this.readUpdateLog();
  }

  /**
   * 清理章节目录，删除docx文件和docx文件夹
   */
  cleanChapterDirectory() {
    try {
      if (!fs.existsSync(this.chapterPath)) {
        return;
      }

      // 获取目录下的所有文件和文件夹
      const items = fs.readdirSync(this.chapterPath);
      
      items.forEach(item => {
        const itemPath = path.join(this.chapterPath, item);
        const stats = fs.statSync(itemPath);
        
        if (stats.isFile() && path.extname(item) === '.docx') {
          // 删除docx文件
          fs.unlinkSync(itemPath);
          console.log(chalk.yellow('已删除docx文件：'), item);
        } else if (stats.isDirectory() && item.toLowerCase() === 'docx') {
          // 删除docx文件夹
          this.deleteDirectory(itemPath);
          console.log(chalk.yellow('已删除docx文件夹：'), item);
        }
      });
    } catch (error) {
      console.error(chalk.red('清理章节目录失败：'), error.message);
    }
  }

  /**
   * 递归删除目录
   * @param {string} dirPath 目录路径
   */
  deleteDirectory(dirPath) {
    if (fs.existsSync(dirPath)) {
      const files = fs.readdirSync(dirPath);
      files.forEach(file => {
        const filePath = path.join(dirPath, file);
        if (fs.statSync(filePath).isDirectory()) {
          this.deleteDirectory(filePath);
        } else {
          fs.unlinkSync(filePath);
        }
      });
      fs.rmdirSync(dirPath);
    }
  }

  /**
   * 读取章节文件
   * @returns {Array} 章节列表
   */
  readChapters() {
    try {
      // 检查章节目录是否存在
      if (!fs.existsSync(this.chapterPath)) {
        console.error(chalk.red('章节目录不存在：'), this.chapterPath);
        return [];
      }

      // 清理章节目录，删除docx文件和docx文件夹
      this.cleanChapterDirectory();

      // 读取目录下的所有Markdown文件
      const files = fs.readdirSync(this.chapterPath)
        .filter(file => path.extname(file) === '.md')
        .sort((a, b) => this.compareChapterFiles(a, b));

      // 解析每个章节文件
      const chapters = files.map(file => {
        const filePath = path.join(this.chapterPath, file);
        const content = fs.readFileSync(filePath, 'utf8');
        const stats = fs.statSync(filePath);

        // 提取章节标题
        const titleMatch = content.match(/^#+\s*(.*)$/m);
        const title = titleMatch ? titleMatch[1] : file.replace('.md', '');

        // 统计字数（去除Markdown格式）
        const wordCount = this.countWords(content);

        // 检查章节是否已发布
        const isPublished = this.updateLog.publishedChapters.includes(file);

        return {
          id: files.indexOf(file) + 1,
          filename: file,
          title: title,
          wordCount: wordCount,
          filePath: filePath,
          content: content,
          createdAt: stats.birthtime,
          updatedAt: stats.mtime,
          isPublished: isPublished,
          status: isPublished ? '已发布' : '未发布'
        };
      });

      this.chapters = chapters;
      return chapters;
    } catch (error) {
      console.error(chalk.red('读取章节文件失败：'), error.message);
      return [];
    }
  }

  /**
   * 比较章节文件顺序
   * @param {string} a 文件名a
   * @param {string} b 文件名b
   * @returns {number} 比较结果
   */
  compareChapterFiles(a, b) {
    // 提取章节号
    const getChapterNum = (filename) => {
      const match = filename.match(/第(\d+)章/);
      return match ? parseInt(match[1], 10) : 0;
    };

    const numA = getChapterNum(a);
    const numB = getChapterNum(b);

    return numA - numB;
  }

  /**
   * 统计字数（去除Markdown格式）
   * @param {string} content 章节内容
   * @returns {number} 字数统计
   */
  countWords(content) {
    // 去除Markdown格式
    const plainText = content
      // 去除标题标记
      .replace(/#{1,6}\s+/g, '')
      // 去除粗体、斜体等格式标记
      .replace(/\*\*|\*|_+/g, '')
      // 去除链接
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      // 去除图片
      .replace(/!\[([^\]]+)\]\([^)]+\)/g, '')
      // 去除代码块
      .replace(/```[\s\S]*?```/g, '')
      // 去除行内代码
      .replace(/`[^`]+`/g, '')
      // 去除分割线
      .replace(/---+|===+/g, '')
      // 去除HTML标签
      .replace(/<[^>]+>/g, '')
      // 去除空白行
      .replace(/\n\s*\n/g, '\n');

    // 统计字数
    return plainText.length;
  }

  /**
   * 获取单个章节
   * @param {number} id 章节ID
   * @returns {Object|null} 章节对象
   */
  getChapter(id) {
    if (!this.chapters.length) {
      this.readChapters();
    }

    return this.chapters.find(chapter => chapter.id === id) || null;
  }

  /**
   * 根据文件名获取章节
   * @param {string} filename 文件名
   * @returns {Object|null} 章节对象
   */
  getChapterByFilename(filename) {
    if (!this.chapters.length) {
      this.readChapters();
    }

    return this.chapters.find(chapter => chapter.filename === filename) || null;
  }

  /**
   * 获取未发布章节
   * @returns {Array} 未发布章节列表
   */
  getUnpublishedChapters() {
    if (!this.chapters.length) {
      this.readChapters();
    }

    return this.chapters.filter(chapter => !chapter.isPublished);
  }

  /**
   * 获取已发布章节
   * @returns {Array} 已发布章节列表
   */
  getPublishedChapters() {
    if (!this.chapters.length) {
      this.readChapters();
    }

    return this.chapters.filter(chapter => chapter.isPublished);
  }

  /**
   * 读取更新日志
   * @returns {Object} 更新日志
   */
  readUpdateLog() {
    try {
      if (fs.existsSync(this.updateLogPath)) {
        const logData = fs.readFileSync(this.updateLogPath, 'utf8');
        return JSON.parse(logData);
      } else {
        // 如果更新日志不存在，创建默认日志
        const defaultLog = {
          publishedChapters: [],
          updateHistory: []
        };
        fs.writeFileSync(this.updateLogPath, JSON.stringify(defaultLog, null, 2), 'utf8');
        return defaultLog;
      }
    } catch (error) {
      console.error(chalk.red('读取更新日志失败：'), error.message);
      return {
        publishedChapters: [],
        updateHistory: []
      };
    }
  }

  /**
   * 写入更新日志
   */
  writeUpdateLog() {
    try {
      fs.writeFileSync(this.updateLogPath, JSON.stringify(this.updateLog, null, 2), 'utf8');
      console.log(chalk.green('更新日志已保存'));
    } catch (error) {
      console.error(chalk.red('写入更新日志失败：'), error.message);
    }
  }

  /**
   * 标记章节为已发布
   * @param {number} id 章节ID
   */
  markAsPublished(id) {
    const chapter = this.getChapter(id);
    if (chapter && !chapter.isPublished) {
      chapter.isPublished = true;
      chapter.status = '已发布';
      
      // 更新更新日志
      if (!this.updateLog.publishedChapters.includes(chapter.filename)) {
        this.updateLog.publishedChapters.push(chapter.filename);
        
        // 添加更新记录
        this.updateLog.updateHistory.push({
          chapterId: chapter.id,
          chapterTitle: chapter.title,
          filename: chapter.filename,
          publishTime: new Date().toISOString(),
          wordCount: chapter.wordCount
        });
        
        this.writeUpdateLog();
        console.log(chalk.green(`章节已标记为已发布：${chapter.title}`));
      }
    }
  }

  /**
   * 标记章节为未发布
   * @param {number} id 章节ID
   */
  markAsUnpublished(id) {
    const chapter = this.getChapter(id);
    if (chapter && chapter.isPublished) {
      chapter.isPublished = false;
      chapter.status = '未发布';
      
      // 更新更新日志
      const index = this.updateLog.publishedChapters.indexOf(chapter.filename);
      if (index > -1) {
        this.updateLog.publishedChapters.splice(index, 1);
        this.writeUpdateLog();
        console.log(chalk.green(`章节已标记为未发布：${chapter.title}`));
      }
    }
  }

  /**
   * 批量标记章节为已发布
   * @param {Array} ids 章节ID列表
   */
  batchMarkAsPublished(ids) {
    ids.forEach(id => this.markAsPublished(id));
  }

  /**
   * 生成章节列表报告
   */
  generateReport() {
    if (!this.chapters.length) {
      this.readChapters();
    }

    console.log(chalk.cyan('=== 章节列表报告 ==='));
    console.log(chalk.yellow(`小说名称：${this.config.novel.name}`));
    console.log(chalk.yellow(`总章节数：${this.chapters.length}`));
    
    const publishedCount = this.getPublishedChapters().length;
    const unpublishedCount = this.getUnpublishedChapters().length;
    console.log(chalk.yellow(`已发布章节：${publishedCount}`));
    console.log(chalk.yellow(`未发布章节：${unpublishedCount}`));
    
    console.log(chalk.cyan('\n章节详情：'));
    this.chapters.forEach(chapter => {
      const statusColor = chapter.isPublished ? chalk.green : chalk.red;
      console.log(`[${chapter.id}] ${chapter.title} - ${statusColor(chapter.status)} - 字数：${chapter.wordCount}`);
    });
    
    if (unpublishedCount > 0) {
      console.log(chalk.cyan('\n未发布章节：'));
      this.getUnpublishedChapters().forEach(chapter => {
        console.log(`[${chapter.id}] ${chapter.title} - 字数：${chapter.wordCount}`);
      });
    }
  }

  /**
   * 生成更新日志报告
   */
  generateUpdateLogReport() {
    console.log(chalk.cyan('=== 更新日志报告 ==='));
    console.log(chalk.yellow(`小说名称：${this.config.novel.name}`));
    console.log(chalk.yellow(`总更新次数：${this.updateLog.updateHistory.length}`));
    
    if (this.updateLog.updateHistory.length > 0) {
      console.log(chalk.cyan('\n最近更新记录：'));
      const recentUpdates = this.updateLog.updateHistory
        .sort((a, b) => new Date(b.publishTime) - new Date(a.publishTime))
        .slice(0, 10);
      
      recentUpdates.forEach(update => {
        const publishDate = new Date(update.publishTime).toLocaleString();
        console.log(`${publishDate} - [${update.chapterId}] ${update.chapterTitle} - 字数：${update.wordCount}`);
      });
    }
  }
}

module.exports = ChapterManager;