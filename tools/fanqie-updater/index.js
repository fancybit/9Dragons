#!/usr/bin/env node

// 番茄小说更新工具 - 主程序

const fs = require('fs');
const path = require('path');
const inquirer = require('inquirer').default;
const chalk = require('chalk').default;

// 导入配置模块
const configModule = require('./config');

// 导入工具类
const ChapterManager = require('./utils/chapter');
const FormatConverter = require('./utils/format');
const UpdateManager = require('./utils/update');

/**
 * 主程序类
 */
class FanqieUpdater {
  constructor() {
    this.config = null;
    this.chapterManager = null;
    this.formatConverter = null;
    this.updateManager = null;
    this.init();
  }

  /**
   * 初始化程序
   */
  init() {
    console.log(chalk.cyan('=== 番茄小说更新工具 ==='));
    console.log(chalk.yellow(`小说名称：${configModule.readConfig().novel.name}`));
    console.log(chalk.yellow(`作者：${configModule.readConfig().novel.author}`));
    console.log(chalk.grey('------------------------'));

    // 初始化配置
    this.config = configModule.readConfig();
    
    // 初始化工具实例
    this.formatConverter = new FormatConverter();
    this.chapterManager = new ChapterManager(this.config);
    this.updateManager = new UpdateManager(this.config, this.chapterManager, this.formatConverter);

    // 启动命令行交互
    this.startInteractiveCLI();
  }

  /**
   * 启动交互式命令行界面
   */
  startInteractiveCLI() {
    inquirer
      .prompt([
        {
          type: 'list',
          name: 'command',
          message: '请选择操作：',
          choices: [
            {
              name: '查看更新报告',
              value: 'viewReport'
            },
            {
              name: '导出待更新章节',
              value: 'exportPending'
            },
            {
              name: '导出指定章节',
              value: 'exportSpecific'
            },
            {
              name: '标记章节为已发布',
              value: 'markPublished'
            },
            {
              name: '标记章节为未发布',
              value: 'markUnpublished'
            },
            {
              name: '查看章节列表',
              value: 'viewChapters'
            },
            {
              name: '查看更新日志',
              value: 'viewUpdateLog'
            },
            {
              name: '修改配置',
              value: 'modifyConfig'
            },
            {
              name: '退出',
              value: 'exit'
            }
          ]
        }
      ])
      .then(answers => {
        this.handleCommand(answers.command);
      })
      .catch(error => {
        console.error(chalk.red('命令执行出错：'), error.message);
        this.startInteractiveCLI();
      });
  }

  /**
   * 处理命令
   * @param {string} command 命令名称
   */
  handleCommand(command) {
    switch (command) {
      case 'viewReport':
        this.handleViewReport();
        break;
      case 'exportPending':
        this.handleExportPending();
        break;
      case 'exportSpecific':
        this.handleExportSpecific();
        break;
      case 'markPublished':
        this.handleMarkPublished();
        break;
      case 'markUnpublished':
        this.handleMarkUnpublished();
        break;
      case 'viewChapters':
        this.handleViewChapters();
        break;
      case 'viewUpdateLog':
        this.handleViewUpdateLog();
        break;
      case 'modifyConfig':
        this.handleModifyConfig();
        break;
      case 'exit':
        this.handleExit();
        break;
      default:
        console.log(chalk.red('未知命令'));
        this.startInteractiveCLI();
    }
  }

  /**
   * 处理查看更新报告命令
   */
  handleViewReport() {
    console.log('\n');
    this.updateManager.displayUpdateReport();
    console.log('\n');
    this.startInteractiveCLI();
  }

  /**
   * 处理导出待更新章节命令
   */
  handleExportPending() {
    console.log('\n');
    this.updateManager.batchExportPendingUpdates();
    console.log('\n');
    this.startInteractiveCLI();
  }

  /**
   * 处理导出指定章节命令
   */
  handleExportSpecific() {
    const chapters = this.chapterManager.readChapters();
    
    if (chapters.length === 0) {
      console.log(chalk.red('没有找到章节文件'));
      this.startInteractiveCLI();
      return;
    }

    inquirer
      .prompt([
        {
          type: 'checkbox',
          name: 'chapterIds',
          message: '请选择要导出的章节：',
          choices: chapters.map(chapter => ({
            name: `[${chapter.id}] ${chapter.title} - ${chapter.status} - 字数：${chapter.wordCount}`,
            value: chapter.id
          }))
        }
      ])
      .then(answers => {
        if (answers.chapterIds.length === 0) {
          console.log(chalk.yellow('没有选择任何章节'));
          this.startInteractiveCLI();
          return;
        }

        const selectedChapters = chapters.filter(chapter => answers.chapterIds.includes(chapter.id));
        this.updateManager.exportChaptersForFanqie(selectedChapters);
        console.log('\n');
        this.startInteractiveCLI();
      })
      .catch(error => {
        console.error(chalk.red('命令执行出错：'), error.message);
        this.startInteractiveCLI();
      });
  }

  /**
   * 处理标记章节为已发布命令
   */
  handleMarkPublished() {
    const chapters = this.chapterManager.readChapters();
    const unpublishedChapters = this.chapterManager.getUnpublishedChapters();
    
    if (unpublishedChapters.length === 0) {
      console.log(chalk.yellow('没有未发布章节'));
      this.startInteractiveCLI();
      return;
    }

    inquirer
      .prompt([
        {
          type: 'checkbox',
          name: 'chapterIds',
          message: '请选择要标记为已发布的章节：',
          choices: unpublishedChapters.map(chapter => ({
            name: `[${chapter.id}] ${chapter.title} - 字数：${chapter.wordCount}`,
            value: chapter.id
          }))
        }
      ])
      .then(answers => {
        if (answers.chapterIds.length === 0) {
          console.log(chalk.yellow('没有选择任何章节'));
          this.startInteractiveCLI();
          return;
        }

        answers.chapterIds.forEach(id => {
          this.chapterManager.markAsPublished(id);
        });
        console.log('\n');
        this.startInteractiveCLI();
      })
      .catch(error => {
        console.error(chalk.red('命令执行出错：'), error.message);
        this.startInteractiveCLI();
      });
  }

  /**
   * 处理标记章节为未发布命令
   */
  handleMarkUnpublished() {
    const chapters = this.chapterManager.readChapters();
    const publishedChapters = this.chapterManager.getPublishedChapters();
    
    if (publishedChapters.length === 0) {
      console.log(chalk.yellow('没有已发布章节'));
      this.startInteractiveCLI();
      return;
    }

    inquirer
      .prompt([
        {
          type: 'checkbox',
          name: 'chapterIds',
          message: '请选择要标记为未发布的章节：',
          choices: publishedChapters.map(chapter => ({
            name: `[${chapter.id}] ${chapter.title} - 字数：${chapter.wordCount}`,
            value: chapter.id
          }))
        }
      ])
      .then(answers => {
        if (answers.chapterIds.length === 0) {
          console.log(chalk.yellow('没有选择任何章节'));
          this.startInteractiveCLI();
          return;
        }

        answers.chapterIds.forEach(id => {
          this.chapterManager.markAsUnpublished(id);
        });
        console.log('\n');
        this.startInteractiveCLI();
      })
      .catch(error => {
        console.error(chalk.red('命令执行出错：'), error.message);
        this.startInteractiveCLI();
      });
  }

  /**
   * 处理查看章节列表命令
   */
  handleViewChapters() {
    console.log('\n');
    this.chapterManager.generateReport();
    console.log('\n');
    this.startInteractiveCLI();
  }

  /**
   * 处理查看更新日志命令
   */
  handleViewUpdateLog() {
    console.log('\n');
    this.chapterManager.generateUpdateLogReport();
    console.log('\n');
    this.startInteractiveCLI();
  }

  /**
   * 处理修改配置命令
   */
  handleModifyConfig() {
    inquirer
      .prompt([
        {
          type: 'input',
          name: 'novelName',
          message: '小说名称：',
          default: this.config.novel.name
        },
        {
          type: 'input',
          name: 'author',
          message: '作者名称：',
          default: this.config.novel.author
        },
        {
          type: 'input',
          name: 'chapterPath',
          message: '章节目录路径：',
          default: this.config.directories.chapterPath
        }
      ])
      .then(answers => {
        const newConfig = {
          ...this.config,
          novel: {
            ...this.config.novel,
            name: answers.novelName,
            author: answers.author
          },
          directories: {
            ...this.config.directories,
            chapterPath: answers.chapterPath
          }
        };

        configModule.writeConfig(newConfig);
        console.log(chalk.green('配置已更新'));
        
        // 重新初始化配置和工具实例
        this.init();
      })
      .catch(error => {
        console.error(chalk.red('配置修改出错：'), error.message);
        this.startInteractiveCLI();
      });
  }

  /**
   * 处理退出命令
   */
  handleExit() {
    console.log(chalk.cyan('=== 感谢使用番茄小说更新工具 ==='));
    process.exit(0);
  }
}

// 启动程序
new FanqieUpdater();