const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function loadConfig(configPath) {
  try {
    if (fs.existsSync(configPath)) {
      const data = fs.readFileSync(configPath, 'utf8');
      return JSON.parse(data);
    }
    return {};
  } catch (e) {
    console.error(`Failed to load config: ${e}`);
    return {};
  }
}

function saveConfig(config, configPath) {
  try {
    ensureDirectory(path.dirname(configPath));
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.error(`Failed to save config: ${e}`);
    return false;
  }
}

function calculateHash(filePath, algorithm = 'md5') {
  try {
    const hash = crypto.createHash(algorithm);
    const stream = fs.createReadStream(filePath, { highWaterMark: 8192 });
    
    return new Promise((resolve, reject) => {
      stream.on('data', (chunk) => {
        hash.update(chunk);
      });
      stream.on('end', () => {
        resolve(hash.digest('hex'));
      });
      stream.on('error', (err) => {
        reject(err);
      });
    });
  } catch (e) {
    console.error(`Failed to calculate hash: ${e}`);
    return null;
  }
}

function ensureDirectory(directory) {
  try {
    if (!fs.existsSync(directory)) {
      fs.mkdirSync(directory, { recursive: true });
    }
    return true;
  } catch (e) {
    console.error(`Failed to create directory: ${e}`);
    return false;
  }
}

function getFileSize(filePath) {
  try {
    const stats = fs.statSync(filePath);
    return stats.size;
  } catch (e) {
    console.error(`Failed to get file size: ${e}`);
    return 0;
  }
}

function formatSize(sizeBytes) {
  for (const unit of ['B', 'KB', 'MB', 'GB', 'TB']) {
    if (sizeBytes < 1024.0) {
      return `${sizeBytes.toFixed(2)} ${unit}`;
    }
    sizeBytes /= 1024.0;
  }
  return `${sizeBytes.toFixed(2)} PB`;
}

function getModelTypeFromExtension(filename) {
  const ext = path.extname(filename).toLowerCase();
  
  const modelTypes = {
    '.safetensors': 'checkpoint',
    '.ckpt': 'checkpoint',
    '.vae': 'vae',
    '.pt': 'model',
    '.pth': 'model',
    '.onnx': 'onnx',
    '.tensorrt': 'tensorrt',
    '.controlnet': 'controlnet',
    '.lora': 'lora',
    '.lycoris': 'lycoris',
    '.embedding': 'embedding',
    '.textualinversion': 'textualinversion'
  };
  
  return modelTypes[ext] || 'unknown';
}

function validateModelPath(modelPath) {
  return fs.existsSync(modelPath) && fs.statSync(modelPath).isFile();
}

function sanitizeFilename(filename) {
  const invalidChars = '<>:"/\\|?*';
  for (const char of invalidChars) {
    filename = filename.replace(char, '_');
  }
  return filename;
}

function getRelativePath(filePath, basePath) {
  try {
    return path.relative(basePath, filePath);
  } catch (e) {
    return filePath;
  }
}

module.exports = {
  loadConfig,
  saveConfig,
  calculateHash,
  ensureDirectory,
  getFileSize,
  formatSize,
  getModelTypeFromExtension,
  validateModelPath,
  sanitizeFilename,
  getRelativePath
};