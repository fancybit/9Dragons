"""Main entry point for ComfyUI MCP"""

import os
import json
import logging
from .src.model_manager import ModelManager
from .src.downloader import ModelDownloader
from .src.api import APIServer
from .src.utils import load_config, save_config

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class ComfyUIMCP:
    """Main class for ComfyUI Model Control Panel"""
    
    def __init__(self, config_path=None):
        """Initialize ComfyUI MCP"""
        self.config_path = config_path or os.path.join(os.path.dirname(__file__), "config", "config.json")
        self.config = self._load_config()
        self.model_manager = ModelManager(self.config)
        self.downloader = ModelDownloader(self.config)
        self.api_server = None
        self.is_running = False
    
    def _load_config(self):
        """Load configuration"""
        try:
            return load_config(self.config_path)
        except Exception as e:
            logger.error(f"Failed to load config: {e}")
            # Return default config
            return {
                "model_dir": os.path.join(os.path.dirname(__file__), "models"),
                "api_port": 8188,
                "api_host": "localhost",
                "download_timeout": 3600,
                "max_concurrent_downloads": 2,
                "repositories": {
                    "huggingface": "https://huggingface.co",
                    "civitai": "https://civitai.com",
                    "liblib": "https://www.liblib.ai"
                }
            }
    
    def start(self):
        """Start ComfyUI MCP"""
        try:
            logger.info("Starting ComfyUI MCP...")
            
            # Initialize model manager
            self.model_manager.initialize()
            logger.info("Model manager initialized")
            
            # Start API server
            self.api_server = APIServer(
                host=self.config.get("api_host", "localhost"),
                port=self.config.get("api_port", 8188),
                model_manager=self.model_manager,
                downloader=self.downloader
            )
            self.api_server.start()
            logger.info(f"API server started on {self.config.get('api_host', 'localhost')}:{self.config.get('api_port', 8188)}")
            
            self.is_running = True
            logger.info("ComfyUI MCP started successfully")
            return True
        except Exception as e:
            logger.error(f"Failed to start ComfyUI MCP: {e}")
            return False
    
    def stop(self):
        """Stop ComfyUI MCP"""
        try:
            logger.info("Stopping ComfyUI MCP...")
            
            if self.api_server:
                self.api_server.stop()
                logger.info("API server stopped")
            
            self.is_running = False
            logger.info("ComfyUI MCP stopped successfully")
            return True
        except Exception as e:
            logger.error(f"Failed to stop ComfyUI MCP: {e}")
            return False
    
    def get_models(self, model_type=None):
        """Get models by type"""
        return self.model_manager.get_models(model_type)
    
    def download_model(self, model_url, model_type):
        """Download model from URL"""
        return self.downloader.download(model_url, model_type)
    
    def add_model(self, model_path, model_type, metadata=None):
        """Add model to manager"""
        return self.model_manager.add_model(model_path, model_type, metadata)
    
    def remove_model(self, model_id):
        """Remove model from manager"""
        return self.model_manager.remove_model(model_id)
    
    def update_config(self, new_config):
        """Update configuration"""
        self.config.update(new_config)
        save_config(self.config, self.config_path)
        return True

# Main entry point
if __name__ == "__main__":
    mcp = ComfyUIMCP()
    mcp.start()
    
    # Keep running
    try:
        while True:
            pass
    except KeyboardInterrupt:
        mcp.stop()
