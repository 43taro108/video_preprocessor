"""Application configuration."""
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
UPLOAD_DIR = BASE_DIR / "uploads"
OUTPUT_DIR = BASE_DIR / "outputs"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

HOST = "0.0.0.0"
PORT = 8002
CORS_ORIGINS = ["http://localhost:5174", "http://localhost:3000"]

ALLOWED_EXTENSIONS = {".mp4", ".avi", ".mov"}
MAX_VIDEO_SIZE_MB = 2000
