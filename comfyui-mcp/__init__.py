"""ComfyUI Model Control Panel (MCP) Module"""

__version__ = "0.1.0"
__author__ = "ComfyUI MCP Team"
__description__ = "A comprehensive model management system for ComfyUI"

# Export main components
from .main import ComfyUIMCP
from .src.model_manager import ModelManager
from .src.downloader import ModelDownloader
from .src.api import APIServer

__all__ = [
    "ComfyUIMCP",
    "ModelManager",
    "ModelDownloader",
    "APIServer"
]
