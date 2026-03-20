"""Model manager for ComfyUI MCP"""

import os
import json
import logging
import uuid
from datetime import datetime
from .utils import (
    ensure_directory, 
    get_file_size, 
    format_size, 
    get_model_type_from_extension,
    validate_model_path,
    calculate_hash,
    sanitize_filename
)

logger = logging.getLogger(__name__)

class ModelManager:
    """Model manager for handling model operations"""
    
    def __init__(self, config):
        """Initialize model manager"""
        self.config = config
        self.model_dir = config.get("model_dir", os.path.join(os.path.dirname(__file__), "..", "models"))
        self.metadata_file = os.path.join(self.model_dir, "metadata.json")
        self.models = {}
        self.model_types = {
            "checkpoint": os.path.join(self.model_dir, "checkpoints"),
            "vae": os.path.join(self.model_dir, "vae"),
            "lora": os.path.join(self.model_dir, "lora"),
            "controlnet": os.path.join(self.model_dir, "controlnet"),
            "embedding": os.path.join(self.model_dir, "embeddings"),
            "lycoris": os.path.join(self.model_dir, "lycoris"),
            "onnx": os.path.join(self.model_dir, "onnx"),
            "tensorrt": os.path.join(self.model_dir, "tensorrt"),
            "other": os.path.join(self.model_dir, "other")
        }
    
    def initialize(self):
        """Initialize model manager"""
        try:
            # Ensure model directories exist
            for model_type, path in self.model_types.items():
                ensure_directory(path)
            
            # Load existing metadata
            self._load_metadata()
            
            # Scan for new models
            self.scan_models()
            
            logger.info(f"Model manager initialized with {len(self.models)} models")
            return True
        except Exception as e:
            logger.error(f"Failed to initialize model manager: {e}")
            return False
    
    def _load_metadata(self):
        """Load model metadata from file"""
        try:
            if os.path.exists(self.metadata_file):
                with open(self.metadata_file, 'r', encoding='utf-8') as f:
                    self.models = json.load(f)
                logger.info(f"Loaded metadata for {len(self.models)} models")
        except Exception as e:
            logger.error(f"Failed to load metadata: {e}")
            self.models = {}
    
    def _save_metadata(self):
        """Save model metadata to file"""
        try:
            ensure_directory(os.path.dirname(self.metadata_file))
            with open(self.metadata_file, 'w', encoding='utf-8') as f:
                json.dump(self.models, f, indent=2, ensure_ascii=False)
            logger.info(f"Saved metadata for {len(self.models)} models")
            return True
        except Exception as e:
            logger.error(f"Failed to save metadata: {e}")
            return False
    
    def scan_models(self):
        """Scan for models in model directories"""
        try:
            new_models = 0
            
            for model_type, path in self.model_types.items():
                if os.path.exists(path):
                    for root, _, files in os.walk(path):
                        for file in files:
                            model_path = os.path.join(root, file)
                            model_id = self._get_model_id(model_path)
                            
                            if model_id not in self.models:
                                # New model found
                                metadata = self._extract_metadata(model_path, model_type)
                                self.models[model_id] = metadata
                                new_models += 1
            
            if new_models > 0:
                self._save_metadata()
                logger.info(f"Found {new_models} new models during scan")
            
            return new_models
        except Exception as e:
            logger.error(f"Failed to scan models: {e}")
            return 0
    
    def _get_model_id(self, model_path):
        """Generate unique model ID"""
        # Use file path and modification time to generate ID
        mod_time = os.path.getmtime(model_path)
        id_str = f"{model_path}_{mod_time}"
        return str(uuid.uuid5(uuid.NAMESPACE_URL, id_str))
    
    def _extract_metadata(self, model_path, model_type):
        """Extract metadata from model file"""
        try:
            filename = os.path.basename(model_path)
            size = get_file_size(model_path)
            
            metadata = {
                "id": self._get_model_id(model_path),
                "name": os.path.splitext(filename)[0],
                "filename": filename,
                "path": model_path,
                "type": model_type,
                "size": size,
                "size_human": format_size(size),
                "hash": calculate_hash(model_path),
                "created_at": datetime.now().isoformat(),
                "updated_at": datetime.now().isoformat(),
                "tags": [],
                "description": "",
                "version": "1.0.0",
                "author": "",
                "source": "local"
            }
            
            return metadata
        except Exception as e:
            logger.error(f"Failed to extract metadata: {e}")
            return {
                "id": self._get_model_id(model_path),
                "name": os.path.basename(model_path),
                "path": model_path,
                "type": model_type,
                "size": 0,
                "created_at": datetime.now().isoformat(),
                "updated_at": datetime.now().isoformat(),
                "tags": [],
                "description": "",
                "version": "1.0.0",
                "author": "",
                "source": "local"
            }
    
    def get_models(self, model_type=None):
        """Get models by type"""
        try:
            if model_type:
                return [m for m in self.models.values() if m.get("type") == model_type]
            return list(self.models.values())
        except Exception as e:
            logger.error(f"Failed to get models: {e}")
            return []
    
    def get_model(self, model_id):
        """Get model by ID"""
        try:
            return self.models.get(model_id)
        except Exception as e:
            logger.error(f"Failed to get model: {e}")
            return None
    
    def add_model(self, model_path, model_type, metadata=None):
        """Add model to manager"""
        try:
            # Validate model path
            if not validate_model_path(model_path):
                logger.error(f"Invalid model path: {model_path}")
                return False
            
            # Determine model type if not provided
            if not model_type:
                model_type = get_model_type_from_extension(model_path)
                if model_type == 'unknown':
                    model_type = 'other'
            
            # Ensure target directory exists
            target_dir = self.model_types.get(model_type, self.model_types['other'])
            ensure_directory(target_dir)
            
            # Copy model to appropriate directory
            filename = os.path.basename(model_path)
            sanitized_filename = sanitize_filename(filename)
            target_path = os.path.join(target_dir, sanitized_filename)
            
            # Copy file
            import shutil
            shutil.copy2(model_path, target_path)
            
            # Generate model ID
            model_id = self._get_model_id(target_path)
            
            # Create metadata
            model_metadata = self._extract_metadata(target_path, model_type)
            
            # Update with provided metadata
            if metadata:
                model_metadata.update(metadata)
            
            # Add to models
            self.models[model_id] = model_metadata
            
            # Save metadata
            self._save_metadata()
            
            logger.info(f"Added model: {model_metadata.get('name')} ({model_type})")
            return model_metadata
        except Exception as e:
            logger.error(f"Failed to add model: {e}")
            return False
    
    def remove_model(self, model_id):
        """Remove model from manager"""
        try:
            if model_id not in self.models:
                logger.error(f"Model not found: {model_id}")
                return False
            
            # Get model info
            model_info = self.models[model_id]
            model_path = model_info.get("path")
            
            # Remove file if it exists
            if os.path.exists(model_path):
                os.remove(model_path)
                logger.info(f"Removed model file: {model_path}")
            
            # Remove from models
            del self.models[model_id]
            
            # Save metadata
            self._save_metadata()
            
            logger.info(f"Removed model: {model_info.get('name')}")
            return True
        except Exception as e:
            logger.error(f"Failed to remove model: {e}")
            return False
    
    def update_model(self, model_id, metadata):
        """Update model metadata"""
        try:
            if model_id not in self.models:
                logger.error(f"Model not found: {model_id}")
                return False
            
            # Update metadata
            self.models[model_id].update(metadata)
            self.models[model_id]["updated_at"] = datetime.now().isoformat()
            
            # Save metadata
            self._save_metadata()
            
            logger.info(f"Updated model: {self.models[model_id].get('name')}")
            return True
        except Exception as e:
            logger.error(f"Failed to update model: {e}")
            return False
    
    def add_tag(self, model_id, tag):
        """Add tag to model"""
        try:
            if model_id not in self.models:
                logger.error(f"Model not found: {model_id}")
                return False
            
            tags = self.models[model_id].get("tags", [])
            if tag not in tags:
                tags.append(tag)
                self.models[model_id]["tags"] = tags
                self.models[model_id]["updated_at"] = datetime.now().isoformat()
                self._save_metadata()
                logger.info(f"Added tag '{tag}' to model: {self.models[model_id].get('name')}")
            
            return True
        except Exception as e:
            logger.error(f"Failed to add tag: {e}")
            return False
    
    def remove_tag(self, model_id, tag):
        """Remove tag from model"""
        try:
            if model_id not in self.models:
                logger.error(f"Model not found: {model_id}")
                return False
            
            tags = self.models[model_id].get("tags", [])
            if tag in tags:
                tags.remove(tag)
                self.models[model_id]["tags"] = tags
                self.models[model_id]["updated_at"] = datetime.now().isoformat()
                self._save_metadata()
                logger.info(f"Removed tag '{tag}' from model: {self.models[model_id].get('name')}")
            
            return True
        except Exception as e:
            logger.error(f"Failed to remove tag: {e}")
            return False
    
    def search_models(self, query):
        """Search models by query"""
        try:
            results = []
            query_lower = query.lower()
            
            for model in self.models.values():
                if (
                    query_lower in model.get("name", "").lower() or
                    query_lower in model.get("description", "").lower() or
                    query_lower in model.get("type", "").lower() or
                    any(query_lower in tag.lower() for tag in model.get("tags", []))
                ):
                    results.append(model)
            
            return results
        except Exception as e:
            logger.error(f"Failed to search models: {e}")
            return []
    
    def get_model_types(self):
        """Get all model types"""
        try:
            return list(set(model.get("type") for model in self.models.values()))
        except Exception as e:
            logger.error(f"Failed to get model types: {e}")
            return []
    
    def get_tags(self):
        """Get all unique tags"""
        try:
            tags = set()
            for model in self.models.values():
                tags.update(model.get("tags", []))
            return list(tags)
        except Exception as e:
            logger.error(f"Failed to get tags: {e}")
            return []
