// 番茄小说更新工具配置模块

const fs = require('fs');
const path = require('path');
const inquirer = require('inquirer').default;
const chalk = require('chalk').default;

// 默认配置
const defaultConfig = {
  // 小说基本信息
  novel: {
    name: '九龙修真记',
    author: '九王爷',
    category: '玄幻',
    description: '大明万历年间，九王爷朱常澜从闲散王爷觉醒为雪灵猫后裔玄玉真人，开启九命历练的故事。'
  },
  // 目录配置
  directories: {
    chapterPath: '../../md/章节/正传', // 章节文件路径
    updateLogPath: './update-log.json', // 更新日志路径
    configPath: './config.json', // 配置文件路径
    exportPath: './exports' // 导出文件路径
  },
  // 番茄作家后台配置
  fanqie: {
    writerId: '', // 作家ID（可选，用于记录）
    bookId: '' // 书籍ID（可选，用于记录）
  }
};

/**
 * 读取配置文件
 * @returns {Object} 配置对象
 */
function readConfig() {
  const configPath = path.join(__dirname, defaultConfig.directories.configPath);
  try {
    if (fs.existsSync(configPath)) {
      const configData = fs.readFileSync(configPath, 'utf8');
      return JSON.parse(configData);
    } else {
      // 如果配置文件不存在，使用默认配置
      writeConfig(defaultConfig);
      return defaultConfig;
    }
  } catch (error) {
    console.error(chalk.red('读取配置文件失败：'), error.message);
    return defaultConfig;
  }
}

/**
 * 写入配置文件
 * @param {Object} config 配置对象
 */
function writeConfig(config) {
  const configPath = path.join(__dirname, defaultConfig.directories.configPath);
  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
    console.log(chalk.green('配置文件已保存'));
  } catch (error) {
    console.error(chalk.red('写入配置文件失败：'), error.message);
  }
}

/**
 * 初始化配置
 */
async function initConfig() {
  console.log(chalk.cyan('=== 初始化番茄小说更新工具配置 ==='));
  
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'novelName',
      message: '请输入小说名称：',
      default: defaultConfig.novel.name
    },
    {
      type: 'input',
      name: 'novelAuthor',
      message: '请输入作者名称：',
      default: defaultConfig.novel.author
    },
    {
      type: 'list',
      name: 'novelCategory',
      message: '请选择小说分类：',
      choices: ['玄幻', '奇幻', '武侠', '仙侠', '都市', '言情', '历史', '科幻', '游戏', '悬疑'],
      default: defaultConfig.novel.category
    },
    {
      type: 'input',
      name: 'novelDescription',
      message: '请输入小说简介：',
      default: defaultConfig.novel.description
    },
    {
      type: 'input',
      name: 'chapterPath',
      message: '请输入章节文件路径（相对路径）：',
      default: defaultConfig.directories.chapterPath
    },
    {
      type: 'input',
      name: 'writerId',
      message: '请输入番茄作家ID（可选）：',
      default: defaultConfig.fanqie.writerId
    },
    {
      type: 'input',
      name: 'bookId',
      message: '请输入番茄书籍ID（可选）：',
      default: defaultConfig.fanqie.bookId
    }
  ]);

  // 更新配置
  const config = {
    novel: {
      name: answers.novelName,
      author: answers.novelAuthor,
      category: answers.novelCategory,
      description: answers.novelDescription
    },
    directories: {
      chapterPath: answers.chapterPath,
      updateLogPath: defaultConfig.directories.updateLogPath,
      configPath: defaultConfig.directories.configPath
    },
    fanqie: {
      writerId: answers.writerId,
      bookId: answers.bookId
    }
  };

  writeConfig(config);
  return config;
}

/**
 * 更新配置
 */
async function updateConfig() {
  const currentConfig = readConfig();
  
  console.log(chalk.cyan('=== 更新番茄小说更新工具配置 ==='));
  console.log(chalk.yellow('当前配置：'));
  console.log(JSON.stringify(currentConfig, null, 2));
  
  const answers = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'updateNovel',
      message: '是否更新小说基本信息？',
      default: false
    },
    {
      type: 'confirm',
      name: 'updateDirectories',
      message: '是否更新目录配置？',
      default: false
    },
    {
      type: 'confirm',
      name: 'updateFanqie',
      message: '是否更新番茄作家配置？',
      default: false
    }
  ]);

  // 更新小说信息
  if (answers.updateNovel) {
    const novelAnswers = await inquirer.prompt([
      {
        type: 'input',
        name: 'name',
        message: '请输入小说名称：',
        default: currentConfig.novel.name
      },
      {
        type: 'input',
        name: 'author',
        message: '请输入作者名称：',
        default: currentConfig.novel.author
      },
      {
        type: 'list',
        name: 'category',
        message: '请选择小说分类：',
        choices: ['玄幻', '奇幻', '武侠', '仙侠', '都市', '言情', '历史', '科幻', '游戏', '悬疑'],
        default: currentConfig.novel.category
      },
      {
        type: 'input',
        name: 'description',
        message: '请输入小说简介：',
        default: currentConfig.novel.description
      }
    ]);
    currentConfig.novel = novelAnswers;
  }

  // 更新目录配置
  if (answers.updateDirectories) {
    const dirAnswers = await inquirer.prompt([
      {
        type: 'input',
        name: 'chapterPath',
        message: '请输入章节文件路径（相对路径）：',
        default: currentConfig.directories.chapterPath
      }
    ]);
    currentConfig.directories.chapterPath = dirAnswers.chapterPath;
  }

  // 更新番茄作家配置
  if (answers.updateFanqie) {
    const fanqieAnswers = await inquirer.prompt([
      {
        type: 'input',
        name: 'writerId',
        message: '请输入番茄作家ID：',
        default: currentConfig.fanqie.writerId
      },
      {
        type: 'input',
        name: 'bookId',
        message: '请输入番茄书籍ID：',
        default: currentConfig.fanqie.bookId
      }
    ]);
    currentConfig.fanqie = fanqieAnswers;
  }

  writeConfig(currentConfig);
  return currentConfig;
}

module.exports = {
  readConfig,
  writeConfig,
  initConfig,
  updateConfig,
  defaultConfig
};
