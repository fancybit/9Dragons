"""Utility functions for ComfyUI MCP"""

import os
import json
import hashlib
import logging

logger = logging.getLogger(__name__)

def load_config(config_path):
    """Load configuration from JSON file"""
    try:
        with open(config_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        logger.warning(f"Config file not found: {config_path}")
        return {}
    except json.JSONDecodeError as e:
        logger.error(f"Invalid JSON in config file: {e}")
        return {}

def save_config(config, config_path):
    """Save configuration to JSON file"""
    try:
        # Ensure directory exists
        os.makedirs(os.path.dirname(config_path), exist_ok=True)
        
        with open(config_path, 'w', encoding='utf-8') as f:
            json.dump(config, f, indent=2, ensure_ascii=False)
        return True
    except Exception as e:
        logger.error(f"Failed to save config: {e}")
        return False

def calculate_hash(file_path, algorithm='md5'):
    """Calculate hash of file"""
    try:
        hash_obj = hashlib.new(algorithm)
        with open(file_path, 'rb') as f:
            while chunk := f.read(8192):
                hash_obj.update(chunk)
        return hash_obj.hexdigest()
    except Exception as e:
        logger.error(f"Failed to calculate hash: {e}")
        return None

def ensure_directory(directory):
    """Ensure directory exists"""
    try:
        os.makedirs(directory, exist_ok=True)
        return True
    except Exception as e:
        logger.error(f"Failed to create directory: {e}")
        return False

def get_file_size(file_path):
    """Get file size in bytes"""
    try:
        return os.path.getsize(file_path)
    except Exception as e:
        logger.error(f"Failed to get file size: {e}")
        return 0

def format_size(size_bytes):
    """Format size in bytes to human readable format"""
    for unit in ['B', 'KB', 'MB', 'GB', 'TB']:
        if size_bytes < 1024.0:
            return f"{size_bytes:.2f} {unit}"
        size_bytes /= 1024.0
    return f"{size_bytes:.2f} PB"

def get_model_type_from_extension(filename):
    """Get model type from file extension"""
    ext = os.path.splitext(filename)[1].lower()
    
    model_types = {
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
    }
    
    return model_types.get(ext, 'unknown')

def validate_model_path(model_path):
    """Validate model path"""
    return os.path.exists(model_path) and os.path.isfile(model_path)

def sanitize_filename(filename):
    """Sanitize filename to remove invalid characters"""
    invalid_chars = '<>:"/\\|?*'
    for char in invalid_chars:
        filename = filename.replace(char, '_')
    return filename

def get_relative_path(path, base_path):
    """Get relative path from base path"""
    try:
        return os.path.relpath(path, base_path)
    except ValueError:
        return path
