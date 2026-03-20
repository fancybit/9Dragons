const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { ensureDirectory, sanitizeFilename, getModelTypeFromExtension } = require('./utils');

class ModelDownloader {
  constructor(config) {
    this.config = config;
    this.downloadQueue = [];
    this.activeDownloads = {};
    this.maxConcurrent = config.max_concurrent_downloads || 2;
    this.timeout = config.download_timeout || 3600000;
    this.repositories = config.repositories || {
      huggingface: 'https://huggingface.co',
      civitai: 'https://civitai.com',
      liblib: 'https://www.liblib.ai'
    };
    this.runningDownloads = 0;
    
    console.log(`Model downloader initialized with ${this.maxConcurrent} workers`);
  }

  async _downloadFile(url, outputPath, downloadId, callback) {
    try {
      ensureDirectory(path.dirname(outputPath));

      let processedUrl = url;
      if (url.includes('huggingface.co')) {
        processedUrl = await this._process_huggingface_url(url);
      } else if (url.includes('civitai.com')) {
        processedUrl = await this._process_civitai_url(url);
      } else if (url.includes('liblib.ai')) {
        processedUrl = await this._process_liblib_url(url);
      }

      const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      };

      const response = await axios({ 
        url: processedUrl, 
        method: 'GET', 
        headers,
        responseType: 'stream',
        timeout: this.timeout
      });

      const totalSize = parseInt(response.headers['content-length'], 10) || 0;

      let initialSize = 0;
      let mode = 'wb';

      if (fs.existsSync(outputPath)) {
        const existingSize = fs.statSync(outputPath).size;
        if (existingSize < totalSize) {
          headers.Range = `bytes=${existingSize}-`;
          mode = 'ab';
          initialSize = existingSize;
        } else {
          if (callback) {
            callback({
              id: downloadId,
              status: 'completed',
              path: outputPath,
              size: existingSize
            });
          }
          return;
        }
      }

      this.activeDownloads[downloadId] = {
        url: processedUrl,
        path: outputPath,
        size: totalSize,
        downloaded: initialSize,
        status: 'downloading',
        started_at: new Date().toISOString()
      };

      if (callback) {
        callback({
          id: downloadId,
          status: 'downloading',
          total_size: totalSize,
          downloaded: initialSize
        });
      }

      const writer = fs.createWriteStream(outputPath, { flags: mode });
      let downloaded = initialSize;

      response.data.on('data', (chunk) => {
        writer.write(chunk);
        downloaded += chunk.length;

        if (this.activeDownloads[downloadId]) {
          this.activeDownloads[downloadId].downloaded = downloaded;

          if (callback) {
            callback({
              id: downloadId,
              status: 'downloading',
              total_size: totalSize,
              downloaded: downloaded
            });
          }
        }
      });

      await new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
        response.data.on('error', reject);
      });

      this.activeDownloads[downloadId].status = 'completed';
      this.activeDownloads[downloadId].completed_at = new Date().toISOString();

      if (callback) {
        callback({
          id: downloadId,
          status: 'completed',
          path: outputPath,
          size: totalSize
        });
      }

      console.log(`Download completed: ${url} -> ${outputPath}`);

    } catch (e) {
      console.error(`Download error: ${e}`);
      if (this.activeDownloads[downloadId]) {
        this.activeDownloads[downloadId].status = 'failed';
        this.activeDownloads[downloadId].error = e.message;
      }
      if (callback) {
        callback({
          id: downloadId,
          status: 'failed',
          error: e.message
        });
      }
      throw e;
    } finally {
      this.runningDownloads--;
      this._processQueue();
    }
  }

  async _process_huggingface_url(url) {
    if (url.endsWith('.safetensors') || url.endsWith('.ckpt')) {
      return url;
    }

    const match = url.match(/https:\/\/huggingface\.co\/([^/]+)\/([^/]+)/);
    if (match) {
      const [, user, repo] = match;
      const commonFiles = ['model.safetensors', 'model.ckpt', 'v1-5-pruned.safetensors'];

      for (const filename of commonFiles) {
        const directUrl = `https://huggingface.co/${user}/${repo}/resolve/main/${filename}`;
        try {
          const response = await axios.head(directUrl, { timeout: 10000 });
          if (response.status === 200) {
            return directUrl;
          }
        } catch {
          // Ignore errors and try next file
        }
      }
    }

    return url;
  }

  async _process_civitai_url(url) {
    const match = url.match(/https:\/\/civitai\.com\/models\/(\d+)/);
    if (match) {
      const [, modelId] = match;
      const apiUrl = `https://civitai.com/api/v1/models/${modelId}`;

      try {
        const response = await axios.get(apiUrl, { timeout: 10000 });
        const data = response.data;

        if (data.modelVersions && data.modelVersions.length > 0) {
          const latestVersion = data.modelVersions[0];
          if (latestVersion.files && latestVersion.files.length > 0) {
            const fileInfo = latestVersion.files[0];
            if (fileInfo.downloadUrl) {
              return fileInfo.downloadUrl;
            }
          }
        }
      } catch (e) {
        console.error(`Failed to get Civitai download link: ${e}`);
      }
    }

    return url;
  }

  async _process_liblib_url(url) {
    const match = url.match(/https:\/\/www\.liblib\.ai\/model-detail\/(\d+)/);
    if (match) {
      const [, modelId] = match;
      const apiUrl = `https://www.liblib.ai/api/model/${modelId}`;

      try {
        const response = await axios.get(apiUrl, { timeout: 10000 });
        const data = response.data;

        if (data.data && data.data.downloadUrl) {
          return data.data.downloadUrl;
        }
      } catch (e) {
        console.error(`Failed to get liblib download link: ${e}`);
      }
    }

    return url;
  }

  download(url, modelType, outputPath = null, callback = null) {
    try {
      const downloadId = `download_${Date.now()}`;

      if (!outputPath) {
        const filename = path.basename(url.split('?')[0]);
        const sanitizedFilename = sanitizeFilename(filename);

        if (!modelType) {
          modelType = getModelTypeFromExtension(filename);
          if (modelType === 'unknown') {
            modelType = 'other';
          }
        }

        const modelDir = this.config.model_dir || path.join(__dirname, '..', 'models');
        const outputDir = path.join(modelDir, modelType);
        outputPath = path.join(outputDir, sanitizedFilename);
      }

      const task = {
        id: downloadId,
        url: url,
        outputPath: outputPath,
        modelType: modelType,
        callback: callback
      };

      this.downloadQueue.push(task);

      this.activeDownloads[downloadId] = {
        id: downloadId,
        url: url,
        path: outputPath,
        modelType: modelType,
        status: 'queued',
        queued_at: new Date().toISOString()
      };

      console.log(`Added download to queue: ${url} -> ${outputPath}`);

      this._processQueue();

      return downloadId;
    } catch (e) {
      console.error(`Failed to start download: ${e}`);
      if (callback) {
        callback({
          id: 'error',
          status: 'failed',
          error: e.message
        });
      }
      return null;
    }
  }

  _processQueue() {
    while (this.runningDownloads < this.maxConcurrent && this.downloadQueue.length > 0) {
      const task = this.downloadQueue.shift();
      this.runningDownloads++;
      this._downloadFile(task.url, task.outputPath, task.id, task.callback);
    }
  }

  getDownloadStatus(downloadId) {
    return this.activeDownloads[downloadId];
  }

  getAllDownloads() {
    return Object.values(this.activeDownloads);
  }

  cancelDownload(downloadId) {
    try {
      if (this.activeDownloads[downloadId]) {
        this.activeDownloads[downloadId].status = 'cancelled';
        console.log(`Cancelled download: ${downloadId}`);
        return true;
      }
      return false;
    } catch (e) {
      console.error(`Failed to cancel download: ${e}`);
      return false;
    }
  }

  async searchModels(query, source = 'all') {
    const results = [];

    if (source === 'all' || source === 'huggingface') {
      try {
        const apiUrl = 'https://huggingface.co/api/models';
        const params = {
          search: query,
          sort: 'downloads',
          limit: 10
        };
        const response = await axios.get(apiUrl, { params, timeout: 10000 });
        const data = response.data;

        for (const model of data) {
          results.push({
            id: model.id,
            name: model.name,
            author: model.author,
            description: model.description,
            tags: model.tags || [],
            downloads: model.downloads,
            likes: model.likes,
            source: 'huggingface',
            url: `https://huggingface.co/${model.id}`
          });
        }
      } catch (e) {
        console.error(`Failed to search Hugging Face: ${e}`);
      }
    }

    if (source === 'all' || source === 'civitai') {
      try {
        const apiUrl = 'https://civitai.com/api/v1/models';
        const params = {
          search: query,
          sort: 'downloadCount',
          limit: 10
        };
        const response = await axios.get(apiUrl, { params, timeout: 10000 });
        const data = response.data;

        for (const model of data.items || []) {
          results.push({
            id: model.id.toString(),
            name: model.name,
            author: model.creator?.username,
            description: model.description,
            tags: model.tags?.map(tag => tag.name) || [],
            downloads: model.stats?.downloadCount,
            likes: model.stats?.ratingCount,
            source: 'civitai',
            url: `https://civitai.com/models/${model.id}`
          });
        }
      } catch (e) {
        console.error(`Failed to search Civitai: ${e}`);
      }
    }

    if (source === 'all' || source === 'liblib') {
      try {
        const apiUrl = 'https://www.liblib.ai/api/model/list';
        const params = {
          keyword: query,
          page: 1,
          limit: 10
        };
        const response = await axios.get(apiUrl, { params, timeout: 10000 });
        const data = response.data;

        if (data.data && data.data.list) {
          for (const model of data.data.list) {
            results.push({
              id: model.id.toString(),
              name: model.name,
              author: model.username,
              description: model.description,
              tags: model.tags || [],
              downloads: model.downloadCount,
              likes: model.likeCount,
              source: 'liblib',
              url: `https://www.liblib.ai/model-detail/${model.id}`
            });
          }
        }
      } catch (e) {
        console.error(`Failed to search liblib: ${e}`);
      }
    }

    return results;
  }

  shutdown() {
    console.log('Model downloader shutdown');
  }
}

module.exports = ModelDownloader;