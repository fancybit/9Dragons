#!/usr/bin/env node

/**
 * 九龙修真记 - 番茄小说同步更新脚本
 * 用于快速同步md正传内容到番茄小说平台
 */

const fs = require('fs');
const path = require('path');

// 工具目录路径
const toolsPath = path.join(__dirname, 'tools', 'fanqie-updater');

// 从工具目录加载依赖
const chalk = require(path.join(toolsPath, 'node_modules', 'chalk')).default;
const inquirer = require(path.join(toolsPath, 'node_modules', 'inquirer')).default;

// 导入工具模块
const configModule = require(path.join(toolsPath, 'config'));
const ChapterManager = require(path.join(toolsPath, 'utils', 'chapter'));
const FormatConverter = require(path.join(toolsPath, 'utils', 'format'));
const UpdateManager = require(path.join(toolsPath, 'utils', 'update'));

/**
 * 番茄小说同步更新类
 */
class FanqieSyncUpdater {
  constructor() {
    this.config = null;
    this.chapterManager = null;
    this.formatConverter = null;
    this.updateManager = null;
    this.init();
  }

  /**
   * 读取账号配置
   * @returns {Object} 账号配置对象
   */
  readAccountConfig() {
    const accountPath = path.join(__dirname, 'account.txt');
    const accountConfig = {
      username: '',
      password: '',
      writer_id: '',
      book_id: ''
    };
    
    try {
      if (fs.existsSync(accountPath)) {
        const content = fs.readFileSync(accountPath, 'utf8');
        const lines = content.split('\n');
        
        lines.forEach(line => {
          // 跳过注释和空行
          if (line.trim().startsWith('#') || line.trim() === '') {
            return;
          }
          
          // 解析键值对
          const [key, value] = line.split('=').map(item => item.trim());
          if (key && value && accountConfig.hasOwnProperty(key)) {
            accountConfig[key] = value;
          }
        });
        
        console.log(chalk.green('✓ 账号配置加载完成'));
      } else {
        console.log(chalk.yellow('⚠ 账号配置文件不存在，将使用默认配置'));
      }
    } catch (error) {
      console.error(chalk.red('✗ 读取账号配置失败：'), error.message);
    }
    
    return accountConfig;
  }

  /**
   * 初始化
   */
  init() {
    console.log(chalk.cyan('=== 九龙修真记 - 番茄小说同步更新 ==='));
    
    // 初始化配置
    this.config = configModule.readConfig();
    
    // 读取账号配置
    this.accountConfig = this.readAccountConfig();
    
    // 合并账号配置到主配置
    this.config.fanqie.username = this.accountConfig.username;
    this.config.fanqie.password = this.accountConfig.password;
    this.config.fanqie.writerId = this.accountConfig.writer_id;
    this.config.fanqie.bookId = this.accountConfig.book_id;
    
    // 初始化工具实例
    this.formatConverter = new FormatConverter();
    this.chapterManager = new ChapterManager(this.config);
    this.updateManager = new UpdateManager(this.config, this.chapterManager, this.formatConverter);
    
    console.log(chalk.green('✓ 配置加载完成'));
    console.log(chalk.green('✓ 工具实例初始化完成'));
    console.log(chalk.yellow(`小说：${this.config.novel.name} - 作者：${this.config.novel.author}`));
    
    // 显示部分账号信息（隐藏敏感内容）
    if (this.accountConfig.username) {
      console.log(chalk.yellow(`账号：${this.accountConfig.username}${this.accountConfig.writer_id ? ` (作家ID：${this.accountConfig.writer_id})` : ''}`));
    }
    
    console.log('');
  }

  /**
   * 执行同步更新
   */
  async runSync() {
    try {
      // 验证账号配置
      this.validateAccountConfig();
      
      console.log(chalk.cyan('1. 生成更新报告...'));
      this.updateManager.displayUpdateReport();
      console.log('');

      const pendingChapters = this.updateManager.getPendingUpdateChapters();
      
      if (pendingChapters.length === 0) {
        console.log(chalk.yellow('✓ 没有待更新章节'));
        
        // 询问用户是否要重置所有章节为未发布状态
        inquirer
          .prompt([
            {
              type: 'confirm',
              name: 'resetAll',
              message: '是否要重置所有章节为未发布状态，防止漏掉章节更新？',
              default: false
            }
          ])
          .then(answers => {
            if (answers.resetAll) {
              console.log('');
              console.log(chalk.cyan('正在重置所有章节状态...'));
              this.resetAllChapters();
              console.log('');
              console.log(chalk.yellow('请重新运行脚本以处理所有章节'));
            }
            process.exit(0);
          })
          .catch(error => {
            console.error(chalk.red('询问失败：'), error.message);
            process.exit(1);
          });
        return;
      }

      console.log(chalk.cyan(`2. 准备导出 ${pendingChapters.length} 个待更新章节...`));
      
      // 自动导出所有待更新章节
      const exportResult = this.updateManager.batchExportPendingUpdates();
      
      if (!exportResult) {
        console.log(chalk.red('✗ 导出失败'));
        process.exit(1);
      }

      console.log('');
      console.log(chalk.cyan('3. 调用番茄小说RESTful API...'));
      
      try {
        // 尝试调用番茄小说API上传章节
        await this.callFanqieAPI(pendingChapters, exportResult);
        
        console.log(chalk.green('✓ 成功调用番茄小说API上传章节'));
      } catch (apiError) {
        console.log(chalk.yellow('⚠ 番茄小说API调用失败：'), apiError.message);
        console.log(chalk.yellow('   番茄小说目前没有公开API，建议手动上传章节'));
        console.log(chalk.yellow('   导出文件位置：'), exportResult.txtFilePath);
        
        // 自动打开导出的文本文件，方便用户复制
        console.log(chalk.green(`\n✓ 正在自动打开导出的纯文本文件...`));
        this.openFile(exportResult.txtFilePath);
      }

      console.log('');
      console.log(chalk.cyan('4. 标记章节为已发布...'));
      
      // 自动标记所有导出的章节为已发布
      const chapterIds = pendingChapters.map(chapter => chapter.id);
      const updateResult = this.updateManager.updateChapters(chapterIds);
      
      if (updateResult.success.length > 0) {
        console.log(chalk.green(`✓ 成功标记 ${updateResult.success.length} 个章节为已发布`));
      }
      
      if (updateResult.failed.length > 0) {
        console.log(chalk.red(`✗ 失败 ${updateResult.failed.length} 个章节`));
        updateResult.failed.forEach(failed => {
          console.log(chalk.red(`  - 章节 ${failed.id}：${failed.error}`));
        });
      }

      console.log('');
      console.log(chalk.cyan('=== 同步更新完成 ==='));
      console.log(chalk.green('✓ 所有待更新章节已自动处理'));
      
      process.exit(0);
    } catch (error) {
      console.error(chalk.red('同步更新失败：'), error.message);
      console.error(error.stack);
      process.exit(1);
    }
  }

  /**
   * 调用番茄小说RESTful API
   * @param {Array} chapters 章节列表
   * @param {Object} exportResult 导出结果
   */
  async callFanqieAPI(chapters, exportResult) {
    // 模拟调用番茄小说API的逻辑
    const axios = require('axios');
    
    // 番茄小说API基础URL（假设，实际不存在）
    const FANQIE_API_BASE = 'https://api-writer.toutiao.com';
    
    console.log(chalk.blue('   正在准备API请求...'));
    
    // 1. 登录获取token
    console.log(chalk.blue('   1. 尝试登录番茄小说作家平台...'));
    
    // 实际调用会失败，所以这里抛出错误
    throw new Error('番茄小说目前没有公开的RESTful API，请手动上传章节内容');
    
    // 以下是假设API存在的情况下的代码
    /*
    const loginResponse = await axios.post(`${FANQIE_API_BASE}/auth/login`, {
      username: this.accountConfig.username,
      password: this.accountConfig.password
    });
    
    const token = loginResponse.data.data.token;
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
    
    // 2. 上传章节
    console.log(chalk.blue(`   2. 正在上传 ${chapters.length} 个章节...`));
    
    for (const chapter of chapters) {
      await axios.post(`${FANQIE_API_BASE}/books/${this.accountConfig.book_id}/chapters`, {
        title: chapter.title,
        content: chapter.content,
        word_count: chapter.wordCount
      }, { headers });
      
      console.log(chalk.green(`      ✓ 成功上传章节：${chapter.title}`));
    }
    
    return true;
    */
  }

  /**
   * 自动打开文件
   * @param {string} filePath 文件路径
   */
  openFile(filePath) {
    try {
      // 根据不同操作系统选择打开方式
      const isWindows = process.platform === 'win32';
      const isMac = process.platform === 'darwin';
      const isLinux = process.platform === 'linux';
      
      let command;
      if (isWindows) {
        command = `start "" "${filePath}"`;
      } else if (isMac) {
        command = `open "${filePath}"`;
      } else if (isLinux) {
        command = `xdg-open "${filePath}"`;
      } else {
        console.log(chalk.yellow(`无法自动打开文件，请手动打开：${filePath}`));
        return;
      }
      
      // 执行命令打开文件
      require('child_process').exec(command);
      console.log(chalk.green(`✓ 文件已自动打开：${filePath}`));
    } catch (error) {
      console.log(chalk.yellow(`无法自动打开文件，请手动打开：${filePath}`));
      console.log(chalk.yellow(`错误信息：${error.message}`));
    }
  }

  /**
   * 验证账号配置
   */
  validateAccountConfig() {
    // 检查必要的账号配置（目前番茄小说没有公开API，所以账号信息仅用于记录）
    const hasAccountConfig = this.accountConfig.username || this.accountConfig.writer_id || this.accountConfig.book_id;
    
    if (hasAccountConfig) {
      console.log(chalk.blue('📋 账号配置信息：'));
      if (this.accountConfig.username) {
        console.log(chalk.blue(`  - 用户名：${this.accountConfig.username}`));
      }
      if (this.accountConfig.writer_id) {
        console.log(chalk.blue(`  - 作家ID：${this.accountConfig.writer_id}`));
      }
      if (this.accountConfig.book_id) {
        console.log(chalk.blue(`  - 书籍ID：${this.accountConfig.book_id}`));
      }
      console.log('');
    } else {
      console.log(chalk.yellow('⚠ 注意：未配置番茄小说账号信息'));
      console.log(chalk.yellow('   请在account.txt中配置账号信息，以便更好地管理章节发布'));
      console.log('');
    }
  }

  /**
   * 重置所有章节状态为未发布
   */
  resetAllChapters() {
    try {
      // 重置更新日志
      this.updateManager.chapterManager.updateLog.publishedChapters = [];
      this.updateManager.chapterManager.writeUpdateLog();
      
      console.log(chalk.green('✓ 所有章节已标记为未发布状态'));
      console.log(chalk.yellow('更新日志已重置，所有章节将作为待更新章节处理'));
      
      // 重新读取章节列表，确认状态更新
      const chapters = this.updateManager.chapterManager.readChapters();
      console.log(chalk.green(`共${chapters.length}个章节，现在都将作为待更新章节`));
    } catch (error) {
      console.error(chalk.red('重置章节状态失败：'), error.message);
      process.exit(1);
    }
  }

  /**
   * 显示帮助信息
   */
  showHelp() {
    console.log(chalk.cyan('=== 九龙修真记 - 番茄小说同步更新脚本 ==='));
    console.log('');
    console.log(chalk.yellow('使用方法：'));
    console.log('  node update.js          # 执行完整同步更新流程');
    console.log('  node update.js --help   # 显示帮助信息');
    console.log('  node update.js --report # 仅生成更新报告');
    console.log('  node update.js --export # 仅导出待更新章节');
    console.log('  node update.js --reset  # 重置所有章节为未发布状态');
    console.log('');
    console.log(chalk.yellow('功能说明：'));
    console.log('  - 自动生成更新报告');
    console.log('  - 导出待更新章节为番茄小说格式');
    console.log('  - 标记章节为已发布状态');
    console.log('  - 生成多种格式导出文件（纯文本、JSON、HTML）');
    console.log('  - 重置所有章节为未发布状态');
    console.log('');
  }
}

// 解析命令行参数
const args = process.argv.slice(2);
const updater = new FanqieSyncUpdater();

// 根据参数执行不同操作
if (args.includes('--help') || args.includes('-h')) {
  updater.showHelp();
} else if (args.includes('--report')) {
  updater.updateManager.displayUpdateReport();
} else if (args.includes('--export')) {
  updater.updateManager.batchExportPendingUpdates();
} else if (args.includes('--reset')) {
  updater.resetAllChapters();
} else {
  // 默认执行完整同步流程
  updater.runSync();
}