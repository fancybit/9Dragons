const express = require('express');
const bodyParser = require('body-parser');

class APIServer {
  constructor(host, port, model_manager, downloader) {
    this.host = host;
    this.port = port;
    this.model_manager = model_manager;
    this.downloader = downloader;
    this.app = express();
    this.server = null;

    this._setup_routes();
  }

  _setup_routes() {
    this.app.use(bodyParser.json());
    this.app.use(bodyParser.urlencoded({ extended: true }));

    // CORS middleware
    this.app.use((req, res, next) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      if (req.method === 'OPTIONS') {
        return res.status(200).end();
      }
      next();
    });

    // API routes
    this.app.get('/api/models', this._get_models.bind(this));
    this.app.get('/api/models/:id', this._get_model.bind(this));
    this.app.post('/api/models', this._add_model.bind(this));
    this.app.delete('/api/models/:id', this._remove_model.bind(this));
    this.app.put('/api/models/:id', this._update_model.bind(this));

    this.app.post('/api/download', this._download_model.bind(this));
    this.app.get('/api/downloads', this._get_downloads.bind(this));
    this.app.get('/api/downloads/:id', this._get_download_status.bind(this));
    this.app.delete('/api/downloads/:id', this._cancel_download.bind(this));

    this.app.get('/api/search', this._search_models.bind(this));

    this.app.get('/api/model-types', this._get_model_types.bind(this));
    this.app.get('/api/tags', this._get_tags.bind(this));

    // Health check
    this.app.get('/api/health', (req, res) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });
  }

  _get_models(req, res) {
    try {
      const model_type = req.query.type;
      const models = this.model_manager.getModels(model_type);
      res.json({ success: true, data: models });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  }

  _get_model(req, res) {
    try {
      const model_id = req.params.id;
      const model = this.model_manager.getModel(model_id);
      if (model) {
        res.json({ success: true, data: model });
      } else {
        res.status(404).json({ success: false, error: 'Model not found' });
      }
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  }

  async _add_model(req, res) {
    try {
      const { path, type, metadata } = req.body;
      const result = await this.model_manager.addModel(path, type, metadata);
      if (result) {
        res.json({ success: true, data: result });
      } else {
        res.status(400).json({ success: false, error: 'Failed to add model' });
      }
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  }

  _remove_model(req, res) {
    try {
      const model_id = req.params.id;
      const result = this.model_manager.removeModel(model_id);
      if (result) {
        res.json({ success: true, message: 'Model removed successfully' });
      } else {
        res.status(404).json({ success: false, error: 'Model not found' });
      }
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  }

  _update_model(req, res) {
    try {
      const model_id = req.params.id;
      const metadata = req.body;
      const result = this.model_manager.updateModel(model_id, metadata);
      if (result) {
        res.json({ success: true, message: 'Model updated successfully' });
      } else {
        res.status(404).json({ success: false, error: 'Model not found' });
      }
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  }

  _download_model(req, res) {
    try {
      const { url, model_type, output_path } = req.body;
      const download_id = this.downloader.download(url, model_type, output_path, (progress) => {
        // This would typically use WebSockets or Server-Sent Events for real-time updates
        console.log('Download progress:', progress);
      });

      if (download_id) {
        res.json({ success: true, download_id });
      } else {
        res.status(400).json({ success: false, error: 'Failed to start download' });
      }
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  }

  _get_downloads(req, res) {
    try {
      const downloads = this.downloader.getAllDownloads();
      res.json({ success: true, data: downloads });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  }

  _get_download_status(req, res) {
    try {
      const download_id = req.params.id;
      const status = this.downloader.getDownloadStatus(download_id);
      if (status) {
        res.json({ success: true, data: status });
      } else {
        res.status(404).json({ success: false, error: 'Download not found' });
      }
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  }

  _cancel_download(req, res) {
    try {
      const download_id = req.params.id;
      const result = this.downloader.cancelDownload(download_id);
      if (result) {
        res.json({ success: true, message: 'Download cancelled successfully' });
      } else {
        res.status(404).json({ success: false, error: 'Download not found' });
      }
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  }

  async _search_models(req, res) {
    try {
      const { query, source } = req.query;
      const results = await this.downloader.searchModels(query, source);
      res.json({ success: true, data: results });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  }

  _get_model_types(req, res) {
    try {
      const types = this.model_manager.getModelTypes();
      res.json({ success: true, data: types });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  }

  _get_tags(req, res) {
    try {
      const tags = this.model_manager.getTags();
      res.json({ success: true, data: tags });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  }

  start() {
    return new Promise((resolve, reject) => {
      try {
        this.server = this.app.listen(this.port, this.host, () => {
          console.log(`API server started on ${this.host}:${this.port}`);
          resolve();
        });

        this.server.on('error', (error) => {
          console.error(`API server error: ${error}`);
          reject(error);
        });
      } catch (e) {
        console.error(`Failed to start API server: ${e}`);
        reject(e);
      }
    });
  }

  stop() {
    return new Promise((resolve, reject) => {
      try {
        if (this.server) {
          this.server.close(() => {
            console.log('API server stopped');
            resolve();
          });
        } else {
          resolve();
        }
      } catch (e) {
        console.error(`Failed to stop API server: ${e}`);
        reject(e);
      }
    });
  }
}

module.exports = APIServer;