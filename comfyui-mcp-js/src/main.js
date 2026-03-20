const path = require('path');
const ModelManager = require('./model_manager');
const ModelDownloader = require('./downloader');
const APIServer = require('./api_server');
const { loadConfig, saveConfig } = require('./utils');

class ComfyUIMCP {
  constructor(configPath = null) {
    this.configPath = configPath || path.join(__dirname, '..', 'config', 'config.json');
    this.config = this._loadConfig();
    this.modelManager = new ModelManager(this.config);
    this.downloader = new ModelDownloader(this.config);
    this.apiServer = null;
    this.isRunning = false;
  }

  _loadConfig() {
    try {
      const config = loadConfig(this.configPath);
      if (Object.keys(config).length === 0) {
        return this._getDefaultConfig();
      }
      return config;
    } catch (e) {
      console.error(`Failed to load config: ${e}`);
      return this._getDefaultConfig();
    }
  }

  _getDefaultConfig() {
    return {
      model_dir: path.join(__dirname, '..', 'models'),
      api_port: 8188,
      api_host: 'localhost',
      download_timeout: 3600000,
      max_concurrent_downloads: 2,
      repositories: {
        huggingface: 'https://huggingface.co',
        civitai: 'https://civitai.com',
        liblib: 'https://www.liblib.ai'
      }
    };
  }

  async start() {
    try {
      console.log('Starting ComfyUI MCP...');
      
      await this.modelManager.initialize();
      console.log('Model manager initialized');
      
      this.apiServer = new APIServer(
        this.config.api_host || 'localhost',
        this.config.api_port || 8188,
        this.modelManager,
        this.downloader
      );
      
      await this.apiServer.start();
      console.log(`API server started on ${this.config.api_host || 'localhost'}:${this.config.api_port || 8188}`);
      
      this.isRunning = true;
      console.log('ComfyUI MCP started successfully');
      return true;
    } catch (e) {
      console.error(`Failed to start ComfyUI MCP: ${e}`);
      return false;
    }
  }

  async stop() {
    try {
      console.log('Stopping ComfyUI MCP...');
      
      if (this.apiServer) {
        await this.apiServer.stop();
        console.log('API server stopped');
      }
      
      this.isRunning = false;
      console.log('ComfyUI MCP stopped successfully');
      return true;
    } catch (e) {
      console.error(`Failed to stop ComfyUI MCP: ${e}`);
      return false;
    }
  }

  getModels(modelType = null) {
    return this.modelManager.getModels(modelType);
  }

  async downloadModel(modelUrl, modelType) {
    return this.downloader.download(modelUrl, modelType);
  }

  async addModel(modelPath, modelType, metadata = null) {
    return this.modelManager.addModel(modelPath, modelType, metadata);
  }

  removeModel(modelId) {
    return this.modelManager.removeModel(modelId);
  }

  updateConfig(newConfig) {
    Object.assign(this.config, newConfig);
    saveConfig(this.config, this.configPath);
    return true;
  }

  getConfig() {
    return this.config;
  }
}

module.exports = ComfyUIMCP;