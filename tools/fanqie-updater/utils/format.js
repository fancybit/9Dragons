// 番茄小说更新工具 - 格式转换模块

const markdownIt = require('markdown-it');

/**
 * 格式转换类
 */
class FormatConverter {
  /**
   * 构造函数
   */
  constructor() {
    this.md = new markdownIt({
      html: true,
      breaks: true,
      linkify: true
    });
  }

  /**
   * 将Markdown转换为HTML
   * @param {string} markdown Markdown内容
   * @returns {string} HTML内容
   */
  markdownToHtml(markdown) {
    return this.md.render(markdown);
  }

  /**
   * 将Markdown转换为纯文本（去除所有格式）
   * @param {string} markdown Markdown内容
   * @returns {string} 纯文本内容
   */
  markdownToPlainText(markdown) {
    return markdown
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
      .replace(/\n\s*\n/g, '\n')
      // 去除行首行尾空格
      .trim();
  }

  /**
   * 将Markdown转换为番茄小说编辑器格式
   * @param {string} markdown Markdown内容
   * @returns {string} 番茄小说格式内容
   */
  markdownToFanqieFormat(markdown) {
    let content = markdown;

    // 1. 处理标题 - 转换为居中的段落
    content = content.replace(/^(#{1,6})\s+(.*)$/gm, (match, hashes, title) => {
      const level = hashes.length;
      if (level === 1) {
        // 一级标题 - 章节标题
        return `\n\n${title}\n\n`;
      } else {
        // 其他标题 - 转换为普通段落
        return `\n\n${title}\n\n`;
      }
    });

    // 2. 处理段落 - 确保每段之间有换行
    content = content.replace(/\n\s*\n/g, '\n\n');

    // 3. 处理粗体、斜体 - 保留粗体，去除斜体
    content = content.replace(/\*\*(.*?)\*\*/g, '$1'); // 保留内容，去除粗体标记（番茄小说编辑器会自动处理）
    content = content.replace(/\*(.*?)\*/g, '$1'); // 去除斜体标记
    content = content.replace(/__(.*?)__/g, '$1'); // 保留内容，去除粗体标记
    content = content.replace(/_(.*?)_/g, '$1'); // 去除斜体标记

    // 4. 处理链接 - 只保留链接文本
    content = content.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

    // 5. 处理图片 - 移除图片
    content = content.replace(/!\[([^\]]+)\]\([^)]+\)/g, '');

    // 6. 处理代码块 - 转换为普通文本
    content = content.replace(/```[\s\S]*?```/g, (match) => {
      return `\n\n${match.replace(/```/g, '')}\n\n`;
    });

    // 7. 处理行内代码 - 转换为普通文本
    content = content.replace(/`([^`]+)`/g, '$1');

    // 8. 处理分割线 - 转换为换行
    content = content.replace(/---+|===+/g, '\n\n');

    // 9. 处理列表 - 转换为普通段落
    content = content.replace(/^(\s*)([*+-]|\d+\.)\s+(.*)$/gm, '$3\n');

    // 10. 处理引用 - 转换为普通段落
    content = content.replace(/^>\s+(.*)$/gm, '$1\n');

    // 11. 去除多余的换行
    content = content.replace(/\n{3,}/g, '\n\n');

    // 12. 去除行首行尾空格
    return content.trim();
  }

  /**
   * 清理HTML内容（用于从网页复制粘贴的内容）
   * @param {string} html HTML内容
   * @returns {string} 清理后的Markdown内容
   */
  cleanHtmlToMarkdown(html) {
    let content = html;

    // 去除HTML标签，保留内容
    content = content.replace(/<[^>]+>/g, '');
    
    // 替换HTML实体
    content = content
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");

    // 处理换行
    content = content.replace(/\r\n/g, '\n');
    
    // 去除多余空格
    content = content.replace(/\s+/g, ' ');
    
    // 确保段落之间有换行
    content = content.replace(/\.\s+/g, '.\n\n');
    content = content.replace(/！\s+/g, '！\n\n');
    content = content.replace(/？\s+/g, '？\n\n');

    return content.trim();
  }

  /**
   * 生成番茄小说章节导入格式
   * @param {Object} chapter 章节对象
   * @returns {Object} 番茄小说章节格式
   */
  generateFanqieChapter(chapter) {
    return {
      title: chapter.title,
      content: this.markdownToFanqieFormat(chapter.content),
      wordCount: chapter.wordCount,
      isPublished: chapter.isPublished
    };
  }

  /**
   * 批量生成番茄小说章节格式
   * @param {Array} chapters 章节列表
   * @returns {Array} 番茄小说章节格式列表
   */
  batchGenerateFanqieChapters(chapters) {
    return chapters.map(chapter => this.generateFanqieChapter(chapter));
  }
}

module.exports = FormatConverter;