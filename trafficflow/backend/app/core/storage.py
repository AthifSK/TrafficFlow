"""Centralized storage management for read-only bundled assets and writable runtime storage.

Compliant with serverless environments (e.g. Vercel / AWS Lambda):
- Bundled models/artifacts: Read-only, resolved relative to source file (never written at runtime).
- Runtime files (uploads, newly trained models, exports): Writable, placed in /tmp/trafficflow/ or system temp.
"""
from __future__ import annotations
import os
import tempfile
import logging
from pathlib import Path
from typing import Optional

logger = logging.getLogger("trafficflow.storage")

# --- 1. Bundled Read-Only Artifacts (Packaged with backend deployment) ---
# Located at: backend/app/models/artifacts
_CURRENT_DIR = Path(__file__).resolve().parent  # app/core
BUNDLED_MODELS_DIR = (_CURRENT_DIR.parent / "models" / "artifacts").resolve()


# --- 2. Writable Runtime Storage ---
def _resolve_runtime_base() -> Path:
    """Determine writable base directory: /tmp/trafficflow on Linux/Vercel, or system temp."""
    if os.name != "nt" and os.path.exists("/tmp"):
        base = Path("/tmp/trafficflow")
    else:
        base = Path(tempfile.gettempdir()) / "trafficflow"
    return base.resolve()


RUNTIME_BASE_DIR = _resolve_runtime_base()
RUNTIME_UPLOADS_DIR = RUNTIME_BASE_DIR / "uploads"
RUNTIME_MODELS_DIR = RUNTIME_BASE_DIR / "models"
RUNTIME_EXPORTS_DIR = RUNTIME_BASE_DIR / "exports"


def init_runtime_storage() -> None:
    """Safely create writable temporary directories during application startup."""
    for directory in [RUNTIME_BASE_DIR, RUNTIME_UPLOADS_DIR, RUNTIME_MODELS_DIR, RUNTIME_EXPORTS_DIR]:
        try:
            directory.mkdir(parents=True, exist_ok=True)
        except Exception as exc:
            logger.warning("Could not create directory %s: %s", directory, exc)


def get_bundled_model_path(filename: str) -> Path:
    """Return path to bundled model file inside deployment package (read-only)."""
    return BUNDLED_MODELS_DIR / filename


def get_runtime_model_path(filename: str) -> Path:
    """Return path to store a newly trained model in writable runtime storage."""
    try:
        RUNTIME_MODELS_DIR.mkdir(parents=True, exist_ok=True)
    except Exception:
        pass
    return RUNTIME_MODELS_DIR / filename


def resolve_model_path(filename: str) -> Optional[Path]:
    """
    Find a model file:
    1. Check runtime models directory first (if trained in current session).
    2. Fall back to bundled deployment artifacts.
    3. Return None if neither exists.
    """
    runtime_path = RUNTIME_MODELS_DIR / filename
    if runtime_path.exists():
        return runtime_path

    bundled_path = BUNDLED_MODELS_DIR / filename
    if bundled_path.exists():
        return bundled_path

    # Fallback check for legacy trafficflow/models directory if running in local dev
    legacy_path = (_CURRENT_DIR.parent.parent.parent / "models" / filename).resolve()
    if legacy_path.exists():
        return legacy_path

    return None
