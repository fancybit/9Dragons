// 图像生成配置文件
// 支持本地Stable Diffusion和豆包API两种模式

module.exports = {
  // 默认生成模式：'local'（本地Stable Diffusion）或 'api'（豆包API）
  defaultMode: 'local',
  
  // 本地ComfyUI配置
  local: {
    // API地址和端口
    baseUrl: 'http://localhost:8188',
    // API路径
    endpoints: {
      text2img: '/prompt'
    },
    // 默认生成参数
    defaultParams: {
      steps: 50,
      cfg_scale: 7.5,
      width: 1024,
      height: 1024,
      negative_prompt: 'NSFW, 低质量, 模糊, 扭曲, 变形, 错误的解剖结构, 错误的肢体, 文本, 水印'
    },
    // ComfyUI启动信息
    comfyui: {
      path: 'T:\\AI\\comfyui-aki',
      startScript: 'run_nvidia_gpu.bat', // 根据您的GPU类型选择正确的启动脚本
      note: '本机模式时请先启动ComfyUI来生成图'
    }
  },
  
  // 豆包API配置
  api: {
    // API地址
    baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
    // API密钥
    apiKey: 'your-api-key', // 请替换为实际的API密钥
    // 默认生成参数
    defaultParams: {
      model: 'doubao-seedream-4-5-251128',
      size: '1024x1024',
      watermark: false
    }
  },
  
  // 通用配置
  common: {
    // 图像保存路径
    outputDir: './img/generated',
    // 缓存配置
    cache: {
      enabled: true,
      directory: './cache/image-generator'
    },
    // 重试配置
    retry: {
      maxAttempts: 3,
      delayMs: 2000
    }
  }
};