"""Model downloader for ComfyUI MCP"""

import os
import re
import json
import logging
import threading
import queue
import requests
from datetime import datetime
from tqdm import tqdm
from .utils import (
    ensure_directory, 
    sanitize_filename,
    get_model_type_from_extension
)

logger = logging.getLogger(__name__)

class ModelDownloader:
    """Model downloader for downloading models from various sources"""
    
    def __init__(self, config):
        """Initialize model downloader"""
        self.config = config
        self.download_queue = queue.Queue()
        self.active_downloads = {}  # {download_id: download_info}
        self.max_concurrent = config.get("max_concurrent_downloads", 2)
        self.timeout = config.get("download_timeout", 3600)
        self.repositories = config.get("repositories", {
            "huggingface": "https://huggingface.co",
            "civitai": "https://civitai.com",
            "liblib": "https://www.liblib.ai"
        })
        
        # Start download workers
        self.workers = []
        for i in range(self.max_concurrent):
            worker = threading.Thread(target=self._worker, daemon=True)
            worker.start()
            self.workers.append(worker)
        
        logger.info(f"Model downloader initialized with {self.max_concurrent} workers")
    
    def _worker(self):
        """Download worker thread"""
        while True:
            try:
                task = self.download_queue.get()
                if task is None:
                    break
                
                download_id = task["id"]
                url = task["url"]
                output_path = task["output_path"]
                model_type = task["model_type"]
                callback = task.get("callback")
                
                try:
                    self._download_file(
                        url, 
                        output_path, 
                        download_id, 
                        callback
                    )
                except Exception as e:
                    logger.error(f"Download failed for {url}: {e}")
                    if callback:
                        callback({
                            "id": download_id,
                            "status": "failed",
                            "error": str(e)
                        })
                finally:
                    if download_id in self.active_downloads:
                        del self.active_downloads[download_id]
                    self.download_queue.task_done()
            except Exception as e:
                logger.error(f"Worker error: {e}")
    
    def _download_file(self, url, output_path, download_id, callback=None):
        """Download file with progress"""
        try:
            # Ensure output directory exists
            ensure_directory(os.path.dirname(output_path))
            
            # Initialize request
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            }
            
            # Handle different repositories
            if "huggingface.co" in url:
                url = self._process_huggingface_url(url)
            elif "civitai.com" in url:
                url = self._process_civitai_url(url)
            elif "liblib.ai" in url:
                url = self._process_liblib_url(url)
            
            # Start download
            response = requests.get(url, headers=headers, stream=True, timeout=self.timeout)
            response.raise_for_status()
            
            # Get file size
            total_size = int(response.headers.get("content-length", 0))
            
            # Check if file already exists and resume download
            if os.path.exists(output_path):
                existing_size = os.path.getsize(output_path)
                if existing_size < total_size:
                    headers["Range"] = f"bytes={existing_size}-"
                    mode = "ab"
                    initial_size = existing_size
                else:
                    # File already complete
                    if callback:
                        callback({
                            "id": download_id,
                            "status": "completed",
                            "path": output_path,
                            "size": existing_size
                        })
                    return
            else:
                mode = "wb"
                initial_size = 0
            
            # Update status
            self.active_downloads[download_id] = {
                "url": url,
                "path": output_path,
                "size": total_size,
                "downloaded": initial_size,
                "status": "downloading",
                "started_at": datetime.now().isoformat()
            }
            
            if callback:
                callback({
                    "id": download_id,
                    "status": "downloading",
                    "total_size": total_size,
                    "downloaded": initial_size
                })
            
            # Download with progress
            with open(output_path, mode) as f:
                with tqdm(
                    total=total_size,
                    initial=initial_size,
                    unit="B",
                    unit_scale=True,
                    desc=os.path.basename(output_path),
                    disable=True  # Disable tqdm to use our own callback
                ) as pbar:
                    for chunk in response.iter_content(chunk_size=8192):
                        if chunk:
                            f.write(chunk)
                            chunk_size = len(chunk)
                            pbar.update(chunk_size)
                            
                            # Update progress
                            if download_id in self.active_downloads:
                                self.active_downloads[download_id]["downloaded"] += chunk_size
                                
                                if callback:
                                    callback({
                                        "id": download_id,
                                        "status": "downloading",
                                        "total_size": total_size,
                                        "downloaded": self.active_downloads[download_id]["downloaded"]
                                    })
            
            # Download complete
            self.active_downloads[download_id]["status"] = "completed"
            self.active_downloads[download_id]["completed_at"] = datetime.now().isoformat()
            
            if callback:
                callback({
                    "id": download_id,
                    "status": "completed",
                    "path": output_path,
                    "size": total_size
                })
            
            logger.info(f"Download completed: {url} -> {output_path}")
            
        except Exception as e:
            logger.error(f"Download error: {e}")
            if download_id in self.active_downloads:
                self.active_downloads[download_id]["status"] = "failed"
                self.active_downloads[download_id]["error"] = str(e)
            raise
    
    def _process_huggingface_url(self, url):
        """Process Hugging Face URL to get direct download link"""
        # Handle Hugging Face URLs
        if url.endswith(".safetensors") or url.endswith(".ckpt"):
            # Direct download link
            return url
        
        # Convert repo URL to direct download
        # Example: https://huggingface.co/runwayml/stable-diffusion-v1-5 -> https://huggingface.co/runwayml/stable-diffusion-v1-5/resolve/main/v1-5-pruned.safetensors
        match = re.match(r"https://huggingface\.co/([^/]+)/([^/]+)", url)
        if match:
            user, repo = match.groups()
            # Try common model filenames
            common_files = ["model.safetensors", "model.ckpt", "v1-5-pruned.safetensors"]
            
            for filename in common_files:
                direct_url = f"https://huggingface.co/{user}/{repo}/resolve/main/{filename}"
                try:
                    response = requests.head(direct_url, timeout=10)
                    if response.status_code == 200:
                        return direct_url
                except:
                    pass
        
        return url
    
    def _process_civitai_url(self, url):
        """Process Civitai URL to get direct download link"""
        # Handle Civitai URLs
        # Example: https://civitai.com/models/12345/model-name -> API call to get download link
        match = re.match(r"https://civitai\.com/models/(\d+)", url)
        if match:
            model_id = match.groups()[0]
            
            # Get model info from Civitai API
            api_url = f"https://civitai.com/api/v1/models/{model_id}"
            try:
                response = requests.get(api_url, timeout=10)
                response.raise_for_status()
                data = response.json()
                
                # Get latest version
                if "modelVersions" in data and data["modelVersions"]:
                    latest_version = data["modelVersions"][0]
                    if "files" in latest_version and latest_version["files"]:
                        # Get first file
                        file_info = latest_version["files"][0]
                        if "downloadUrl" in file_info:
                            return file_info["downloadUrl"]
            except Exception as e:
                logger.error(f"Failed to get Civitai download link: {e}")
        
        return url
    
    def _process_liblib_url(self, url):
        """Process liblib URL to get direct download link"""
        # Handle liblib URLs
        # Example: https://www.liblib.ai/model-detail/12345/model-name -> API call to get download link
        match = re.match(r"https://www\.liblib\.ai/model-detail/(\d+)", url)
        if match:
            model_id = match.groups()[0]
            
            # Get model info from liblib API
            api_url = f"https://www.liblib.ai/api/model/{model_id}"
            try:
                response = requests.get(api_url, timeout=10)
                response.raise_for_status()
                data = response.json()
                
                # Get download link
                if "data" in data and "downloadUrl" in data["data"]:
                    return data["data"]["downloadUrl"]
            except Exception as e:
                logger.error(f"Failed to get liblib download link: {e}")
        
        return url
    
    def download(self, url, model_type, output_path=None, callback=None):
        """Download model from URL"""
        try:
            # Generate download ID
            download_id = f"download_{datetime.now().timestamp()}"
            
            # Determine output path if not provided
            if not output_path:
                # Extract filename from URL
                filename = os.path.basename(url.split("?")[0])
                sanitized_filename = sanitize_filename(filename)
                
                # Determine model type from filename if not provided
                if not model_type:
                    model_type = get_model_type_from_extension(filename)
                    if model_type == "unknown":
                        model_type = "other"
                
                # Create output path
                output_dir = os.path.join(
                    self.config.get("model_dir", os.path.join(os.path.dirname(__file__), "..", "models")),
                    model_type
                )
                output_path = os.path.join(output_dir, sanitized_filename)
            
            # Add to download queue
            self.download_queue.put({
                "id": download_id,
                "url": url,
                "output_path": output_path,
                "model_type": model_type,
                "callback": callback
            })
            
            # Add to active downloads
            self.active_downloads[download_id] = {
                "id": download_id,
                "url": url,
                "path": output_path,
                "model_type": model_type,
                "status": "queued",
                "queued_at": datetime.now().isoformat()
            }
            
            logger.info(f"Added download to queue: {url} -> {output_path}")
            
            return download_id
        except Exception as e:
            logger.error(f"Failed to start download: {e}")
            if callback:
                callback({
                    "id": "error",
                    "status": "failed",
                    "error": str(e)
                })
            return None
    
    def get_download_status(self, download_id):
        """Get download status by ID"""
        return self.active_downloads.get(download_id)
    
    def get_all_downloads(self):
        """Get all active downloads"""
        return list(self.active_downloads.values())
    
    def cancel_download(self, download_id):
        """Cancel download by ID"""
        try:
            if download_id in self.active_downloads:
                # Note: This will not immediately stop the download, but it will be marked as cancelled
                # and cleaned up when the worker finishes
                self.active_downloads[download_id]["status"] = "cancelled"
                logger.info(f"Cancelled download: {download_id}")
                return True
            return False
        except Exception as e:
            logger.error(f"Failed to cancel download: {e}")
            return False
    
    def search_models(self, query, source="all"):
        """Search for models in repositories"""
        results = []
        
        if source in ["all", "huggingface"]:
            # Search Hugging Face
            try:
                api_url = "https://huggingface.co/api/models"
                params = {
                    "search": query,
                    "sort": "downloads",
                    "limit": 10
                }
                response = requests.get(api_url, params=params, timeout=10)
                response.raise_for_status()
                data = response.json()
                
                for model in data:
                    results.append({
                        "id": model.get("id"),
                        "name": model.get("name"),
                        "author": model.get("author"),
                        "description": model.get("description"),
                        "tags": model.get("tags", []),
                        "downloads": model.get("downloads"),
                        "likes": model.get("likes"),
                        "source": "huggingface",
                        "url": f"https://huggingface.co/{model.get('id')}"
                    })
            except Exception as e:
                logger.error(f"Failed to search Hugging Face: {e}")
        
        if source in ["all", "civitai"]:
            # Search Civitai
            try:
                api_url = "https://civitai.com/api/v1/models"
                params = {
                    "search": query,
                    "sort": "downloadCount",
                    "limit": 10
                }
                response = requests.get(api_url, params=params, timeout=10)
                response.raise_for_status()
                data = response.json()
                
                for model in data.get("items", []):
                    results.append({
                        "id": str(model.get("id")),
                        "name": model.get("name"),
                        "author": model.get("creator", {}).get("username"),
                        "description": model.get("description"),
                        "tags": [tag.get("name") for tag in model.get("tags", [])],
                        "downloads": model.get("stats", {}).get("downloadCount"),
                        "likes": model.get("stats", {}).get("ratingCount"),
                        "source": "civitai",
                        "url": f"https://civitai.com/models/{model.get('id')}"
                    })
            except Exception as e:
                logger.error(f"Failed to search Civitai: {e}")
        
        if source in ["all", "liblib"]:
            # Search liblib
            try:
                api_url = "https://www.liblib.ai/api/model/list"
                params = {
                    "keyword": query,
                    "page": 1,
                    "limit": 10
                }
                response = requests.get(api_url, params=params, timeout=10)
                response.raise_for_status()
                data = response.json()
                
                if "data" in data and "list" in data["data"]:
                    for model in data["data"]["list"]:
                        results.append({
                            "id": str(model.get("id")),
                            "name": model.get("name"),
                            "author": model.get("username"),
                            "description": model.get("description"),
                            "tags": model.get("tags", []),
                            "downloads": model.get("downloadCount"),
                            "likes": model.get("likeCount"),
                            "source": "liblib",
                            "url": f"https://www.liblib.ai/model-detail/{model.get('id')}"
                        })
            except Exception as e:
                logger.error(f"Failed to search liblib: {e}")
        
        return results
    
    def shutdown(self):
        """Shutdown downloader"""
        try:
            # Stop workers
            for _ in self.workers:
                self.download_queue.put(None)
            
            for worker in self.workers:
                worker.join(timeout=5)
            
            logger.info("Model downloader shutdown")
        except Exception as e:
            logger.error(f"Failed to shutdown downloader: {e}")
