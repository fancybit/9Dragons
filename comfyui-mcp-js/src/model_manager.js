const fs = require('fs');
const path = require('path');
const { v5: uuidv5 } = require('uuid');
const { loadConfig, saveConfig, ensureDirectory, getFileSize, formatSize, getModelTypeFromExtension, validateModelPath, calculateHash, sanitizeFilename } = require('./utils');

class ModelManager {
  constructor(config) {
    this.config = config;
    this.modelDir = config.model_dir || path.join(__dirname, '..', 'models');
    this.metadataFile = path.join(this.modelDir, 'metadata.json');
    this.models = {};
    this.modelTypes = {
      checkpoint: path.join(this.modelDir, 'checkpoints'),
      vae: path.join(this.modelDir, 'vae'),
      lora: path.join(this.modelDir, 'lora'),
      controlnet: path.join(this.modelDir, 'controlnet'),
      embedding: path.join(this.modelDir, 'embeddings'),
      lycoris: path.join(this.modelDir, 'lycoris'),
      onnx: path.join(this.modelDir, 'onnx'),
      tensorrt: path.join(this.modelDir, 'tensorrt'),
      other: path.join(this.modelDir, 'other')
    };
  }

  initialize() {
    try {
      for (const [modelType, modelPath] of Object.entries(this.modelTypes)) {
        ensureDirectory(modelPath);
      }

      this._loadMetadata();
      this.scanModels();

      console.log(`Model manager initialized with ${Object.keys(this.models).length} models`);
      return true;
    } catch (e) {
      console.error(`Failed to initialize model manager: ${e}`);
      return false;
    }
  }

  _loadMetadata() {
    try {
      if (fs.existsSync(this.metadataFile)) {
        const data = fs.readFileSync(this.metadataFile, 'utf8');
        this.models = JSON.parse(data);
        console.log(`Loaded metadata for ${Object.keys(this.models).length} models`);
      }
    } catch (e) {
      console.error(`Failed to load metadata: ${e}`);
      this.models = {};
    }
  }

  _saveMetadata() {
    try {
      ensureDirectory(path.dirname(this.metadataFile));
      fs.writeFileSync(this.metadataFile, JSON.stringify(this.models, null, 2), 'utf8');
      console.log(`Saved metadata for ${Object.keys(this.models).length} models`);
      return true;
    } catch (e) {
      console.error(`Failed to save metadata: ${e}`);
      return false;
    }
  }

  scanModels() {
    try {
      let newModels = 0;

      for (const [modelType, modelPath] of Object.entries(this.modelTypes)) {
        if (fs.existsSync(modelPath)) {
          const files = this._getFilesRecursive(modelPath);
          for (const file of files) {
            const modelId = this._getModelId(file);
            if (!this.models[modelId]) {
              const metadata = this._extractMetadata(file, modelType);
              this.models[modelId] = metadata;
              newModels++;
            }
          }
        }
      }

      if (newModels > 0) {
        this._saveMetadata();
        console.log(`Found ${newModels} new models during scan`);
      }

      return newModels;
    } catch (e) {
      console.error(`Failed to scan models: ${e}`);
      return 0;
    }
  }

  _getFilesRecursive(directory) {
    const files = [];
    const items = fs.readdirSync(directory, { withFileTypes: true });
    
    for (const item of items) {
      const fullPath = path.join(directory, item.name);
      if (item.isDirectory()) {
        files.push(...this._getFilesRecursive(fullPath));
      } else if (item.isFile()) {
        files.push(fullPath);
      }
    }
    
    return files;
  }

  _getModelId(modelPath) {
    try {
      const stats = fs.statSync(modelPath);
      const modTime = stats.mtime.getTime();
      const idStr = `${modelPath}_${modTime}`;
      return uuidv5(idStr, uuidv5.URL);
    } catch (e) {
      console.error(`Failed to get model ID: ${e}`);
      return uuidv5(modelPath, uuidv5.URL);
    }
  }

  async _extractMetadata(modelPath, modelType) {
    try {
      const filename = path.basename(modelPath);
      const size = getFileSize(modelPath);
      const hash = await calculateHash(modelPath);

      return {
        id: this._getModelId(modelPath),
        name: path.parse(filename).name,
        filename: filename,
        path: modelPath,
        type: modelType,
        size: size,
        size_human: formatSize(size),
        hash: hash,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        tags: [],
        description: '',
        version: '1.0.0',
        author: '',
        source: 'local'
      };
    } catch (e) {
      console.error(`Failed to extract metadata: ${e}`);
      return {
        id: this._getModelId(modelPath),
        name: path.basename(modelPath),
        path: modelPath,
        type: modelType,
        size: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        tags: [],
        description: '',
        version: '1.0.0',
        author: '',
        source: 'local'
      };
    }
  }

  getModels(modelType = null) {
    try {
      if (modelType) {
        return Object.values(this.models).filter(model => model.type === modelType);
      }
      return Object.values(this.models);
    } catch (e) {
      console.error(`Failed to get models: ${e}`);
      return [];
    }
  }

  getModel(modelId) {
    try {
      return this.models[modelId];
    } catch (e) {
      console.error(`Failed to get model: ${e}`);
      return null;
    }
  }

  async addModel(modelPath, modelType, metadata = null) {
    try {
      if (!validateModelPath(modelPath)) {
        console.error(`Invalid model path: ${modelPath}`);
        return false;
      }

      if (!modelType) {
        modelType = getModelTypeFromExtension(modelPath);
        if (modelType === 'unknown') {
          modelType = 'other';
        }
      }

      const targetDir = this.modelTypes[modelType] || this.modelTypes.other;
      ensureDirectory(targetDir);

      const filename = path.basename(modelPath);
      const sanitizedFilename = sanitizeFilename(filename);
      const targetPath = path.join(targetDir, sanitizedFilename);

      fs.copyFileSync(modelPath, targetPath);

      const modelId = this._getModelId(targetPath);
      const modelMetadata = await this._extractMetadata(targetPath, modelType);

      if (metadata) {
        Object.assign(modelMetadata, metadata);
      }

      this.models[modelId] = modelMetadata;
      this._saveMetadata();

      console.log(`Added model: ${modelMetadata.name} (${modelType})`);
      return modelMetadata;
    } catch (e) {
      console.error(`Failed to add model: ${e}`);
      return false;
    }
  }

  removeModel(modelId) {
    try {
      if (!this.models[modelId]) {
        console.error(`Model not found: ${modelId}`);
        return false;
      }

      const modelInfo = this.models[modelId];
      const modelPath = modelInfo.path;

      if (fs.existsSync(modelPath)) {
        fs.unlinkSync(modelPath);
        console.log(`Removed model file: ${modelPath}`);
      }

      delete this.models[modelId];
      this._saveMetadata();

      console.log(`Removed model: ${modelInfo.name}`);
      return true;
    } catch (e) {
      console.error(`Failed to remove model: ${e}`);
      return false;
    }
  }

  updateModel(modelId, metadata) {
    try {
      if (!this.models[modelId]) {
        console.error(`Model not found: ${modelId}`);
        return false;
      }

      Object.assign(this.models[modelId], metadata);
      this.models[modelId].updated_at = new Date().toISOString();
      this._saveMetadata();

      console.log(`Updated model: ${this.models[modelId].name}`);
      return true;
    } catch (e) {
      console.error(`Failed to update model: ${e}`);
      return false;
    }
  }

  addTag(modelId, tag) {
    try {
      if (!this.models[modelId]) {
        console.error(`Model not found: ${modelId}`);
        return false;
      }

      const tags = this.models[modelId].tags || [];
      if (!tags.includes(tag)) {
        tags.push(tag);
        this.models[modelId].tags = tags;
        this.models[modelId].updated_at = new Date().toISOString();
        this._saveMetadata();
        console.log(`Added tag '${tag}' to model: ${this.models[modelId].name}`);
      }

      return true;
    } catch (e) {
      console.error(`Failed to add tag: ${e}`);
      return false;
    }
  }

  removeTag(modelId, tag) {
    try {
      if (!this.models[modelId]) {
        console.error(`Model not found: ${modelId}`);
        return false;
      }

      const tags = this.models[modelId].tags || [];
      const index = tags.indexOf(tag);
      if (index > -1) {
        tags.splice(index, 1);
        this.models[modelId].tags = tags;
        this.models[modelId].updated_at = new Date().toISOString();
        this._saveMetadata();
        console.log(`Removed tag '${tag}' from model: ${this.models[modelId].name}`);
      }

      return true;
    } catch (e) {
      console.error(`Failed to remove tag: ${e}`);
      return false;
    }
  }

  searchModels(query) {
    try {
      const results = [];
      const queryLower = query.toLowerCase();

      for (const model of Object.values(this.models)) {
        if (
          model.name?.toLowerCase().includes(queryLower) ||
          model.description?.toLowerCase().includes(queryLower) ||
          model.type?.toLowerCase().includes(queryLower) ||
          (model.tags && model.tags.some(tag => tag.toLowerCase().includes(queryLower)))
        ) {
          results.push(model);
        }
      }

      return results;
    } catch (e) {
      console.error(`Failed to search models: ${e}`);
      return [];
    }
  }

  getModelTypes() {
    try {
      const types = new Set();
      for (const model of Object.values(this.models)) {
        if (model.type) {
          types.add(model.type);
        }
      }
      return Array.from(types);
    } catch (e) {
      console.error(`Failed to get model types: ${e}`);
      return [];
    }
  }

  getTags() {
    try {
      const tags = new Set();
      for (const model of Object.values(this.models)) {
        if (model.tags) {
          for (const tag of model.tags) {
            tags.add(tag);
          }
        }
      }
      return Array.from(tags);
    } catch (e) {
      console.error(`Failed to get tags: ${e}`);
      return [];
    }
  }
}

module.exports = ModelManager;