const fs = require('fs');
const path = require('path');
const axios = require('axios');
const crypto = require('crypto');
const config = require('../config/image-generator');

// 确保输出目录存在
if (!fs.existsSync(config.common.outputDir)) {
  fs.mkdirSync(config.common.outputDir, { recursive: true });
}

// 确保缓存目录存在
if (config.common.cache.enabled && !fs.existsSync(config.common.cache.directory)) {
  fs.mkdirSync(config.common.cache.directory, { recursive: true });
}

/**
 * 生成图像缓存键
 * @param {string} prompt - 图像描述
 * @param {object} options - 生成选项
 * @returns {string} - 缓存键
 */
function generateCacheKey(prompt, options = {}) {
  const data = `${prompt}-${JSON.stringify(options)}`;
  return crypto.createHash('md5').update(data).digest('hex');
}

/**
 * 检查缓存
 * @param {string} cacheKey - 缓存键
 * @returns {string|null} - 缓存的图像路径，如果不存在则返回null
 */
function checkCache(cacheKey) {
  if (!config.common.cache.enabled) {
    return null;
  }
  
  const cachePath = path.join(config.common.cache.directory, `${cacheKey}.json`);
  if (fs.existsSync(cachePath)) {
    try {
      const cacheData = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
      const imagePath = cacheData.imagePath;
      if (fs.existsSync(imagePath)) {
        return imagePath;
      }
    } catch (error) {
      console.error('读取缓存失败：', error);
    }
  }
  return null;
}

/**
 * 保存缓存
 * @param {string} cacheKey - 缓存键
 * @param {string} imagePath - 图像路径
 */
function saveCache(cacheKey, imagePath) {
  if (!config.common.cache.enabled) {
    return;
  }
  
  const cachePath = path.join(config.common.cache.directory, `${cacheKey}.json`);
  try {
    const cacheData = {
      imagePath,
      timestamp: Date.now()
    };
    fs.writeFileSync(cachePath, JSON.stringify(cacheData), 'utf8');
  } catch (error) {
    console.error('保存缓存失败：', error);
  }
}

/**
 * 本地ComfyUI生成图像
 * @param {string} prompt - 图像描述
 * @param {object} options - 生成选项
 * @returns {Promise<string>} - 生成的图像路径
 */
async function generateLocalImage(prompt, options = {}) {
  try {
    // 生成缓存键
    const cacheKey = generateCacheKey(prompt, options);
    
    // 检查缓存
    const cachedImagePath = checkCache(cacheKey);
    if (cachedImagePath) {
      console.log('使用缓存图像：', cachedImagePath);
      return cachedImagePath;
    }
    
    // 合并默认参数和用户选项
    const params = {
      ...config.local.defaultParams,
      ...options,
      prompt
    };
    
    // 构建ComfyUI工作流
    const workflow = {
      "3": {
        "class_type": "KSampler",
        "inputs": {
          "cfg": params.cfg_scale,
          "denoise": 1,
          "latent_image": [
            "5",
            "samples"
          ],
          "model": [
            "4",
            "model"
          ],
          "negative": [
            "7",
            "conditioning"
          ],
          "positive": [
            "6",
            "conditioning"
          ],
          "sampler_name": "euler_a",
          "scheduler": "normal",
          "seed": Math.floor(Math.random() * 1000000000),
          "steps": params.steps
        }
      },
      "4": {
        "class_type": "CheckpointLoaderSimple",
        "inputs": {
          "ckpt_name": "v1-5-pruned.safetensors" // 默认模型，可根据需要修改
        }
      },
      "5": {
        "class_type": "EmptyLatentImage",
        "inputs": {
          "batch_size": 1,
          "height": params.height,
          "width": params.width
        }
      },
      "6": {
        "class_type": "CLIPTextEncode",
        "inputs": {
          "clip": [
            "4",
            "clip"
          ],
          "text": params.prompt
        }
      },
      "7": {
        "class_type": "CLIPTextEncode",
        "inputs": {
          "clip": [
            "4",
            "clip"
          ],
          "text": params.negative_prompt
        }
      },
      "8": {
        "class_type": "VAEDecode",
        "inputs": {
          "samples": [
            "3",
            "samples"
          ],
          "vae": [
            "4",
            "vae"
          ]
        }
      },
      "9": {
        "class_type": "SaveImage",
        "inputs": {
          "filename_prefix": "comfyui",
          "images": [
            "8",
            "images"
          ]
        }
      }
    };
    
    // 构建API URL
    const apiUrl = `${config.local.baseUrl}${config.local.endpoints.text2img}`;
    
    // 发送API请求
    console.log('正在调用本地ComfyUI API...');
    console.log('ComfyUI路径：', config.local.comfyui.path);
    console.log('提示：', config.local.comfyui.note);
    
    const response = await axios.post(apiUrl, { prompt: workflow }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    // 处理响应
    if (response.status === 200) {
      // ComfyUI的响应格式与Stable Diffusion不同，这里需要根据实际响应格式调整
      // 注意：ComfyUI会直接保存图像到输出目录，我们需要获取保存的图像路径
      
      // 这里简化处理，实际实现需要根据ComfyUI的响应格式进行调整
      // 暂时使用模拟路径，实际项目中需要根据ComfyUI的实际响应进行修改
      
      // 生成唯一文件名
      const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.png`;
      const outputPath = path.join(config.common.outputDir, fileName);
      
      // 注意：这里需要根据ComfyUI的实际行为进行调整
      // ComfyUI会将图像保存到其output目录，我们需要：
      // 1. 从响应中获取图像保存路径
      // 2. 或者将图像从ComfyUI的output目录复制到我们的output目录
      
      // 暂时创建一个空文件作为占位符
      fs.writeFileSync(outputPath, '');
      console.log('图像生成成功（注意：实际实现需要根据ComfyUI的响应格式调整）：', outputPath);
      
      // 保存缓存
      saveCache(cacheKey, outputPath);
      
      return outputPath;
    } else {
      throw new Error('API返回无效响应');
    }
  } catch (error) {
    console.error('本地ComfyUI生成失败：', error);
    throw error;
  }
}

/**
 * 豆包API生成图像
 * @param {string} prompt - 图像描述
 * @param {object} options - 生成选项
 * @returns {Promise<string>} - 生成的图像路径
 */
async function generateApiImage(prompt, options = {}) {
  try {
    // 生成缓存键
    const cacheKey = generateCacheKey(prompt, options);
    
    // 检查缓存
    const cachedImagePath = checkCache(cacheKey);
    if (cachedImagePath) {
      console.log('使用缓存图像：', cachedImagePath);
      return cachedImagePath;
    }
    
    // 合并默认参数和用户选项
    const params = {
      ...config.api.defaultParams,
      ...options,
      prompt
    };
    
    // 构建API URL
    const apiUrl = `${config.api.baseUrl}/images/generations`;
    
    // 发送API请求
    console.log('正在调用豆包API...');
    const response = await axios.post(apiUrl, params, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.api.apiKey}`
      }
    });
    
    // 处理响应
    if (response.status === 200 && response.data && response.data.data && response.data.data.length > 0) {
      // 获取图像URL
      const imageUrl = response.data.data[0].url;
      
      // 下载图像
      console.log('正在下载图像...');
      const imageResponse = await axios.get(imageUrl, {
        responseType: 'arraybuffer'
      });
      
      // 生成唯一文件名
      const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.png`;
      const outputPath = path.join(config.common.outputDir, fileName);
      
      // 保存图像
      fs.writeFileSync(outputPath, imageResponse.data);
      console.log('图像生成成功：', outputPath);
      
      // 保存缓存
      saveCache(cacheKey, outputPath);
      
      return outputPath;
    } else {
      throw new Error('API返回无效响应');
    }
  } catch (error) {
    console.error('豆包API生成失败：', error);
    throw error;
  }
}

/**
 * 生成图像
 * @param {string} prompt - 图像描述
 * @param {object} options - 生成选项
 * @param {string} mode - 生成模式：'local' 或 'api'
 * @returns {Promise<string>} - 生成的图像路径
 */
async function generateImage(prompt, options = {}, mode = config.defaultMode) {
  let attempts = 0;
  let lastError;
  
  while (attempts < config.common.retry.maxAttempts) {
    try {
      attempts++;
      if (mode === 'local') {
        return await generateLocalImage(prompt, options);
      } else {
        return await generateApiImage(prompt, options);
      }
    } catch (error) {
      lastError = error;
      if (attempts < config.common.retry.maxAttempts) {
        console.log(`尝试失败，${config.common.retry.delayMs}ms后重试...`);
        await new Promise(resolve => setTimeout(resolve, config.common.retry.delayMs));
      }
    }
  }
  
  throw lastError;
}

module.exports = {
  generateImage,
  generateLocalImage,
  generateApiImage
};