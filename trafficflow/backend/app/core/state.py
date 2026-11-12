"""Application-wide state: holds the uploaded/processed data between requests."""
from __future__ import annotations
import threading
from typing import Any, Dict, Optional
import pandas as pd

_lock = threading.Lock()

_state: Dict[str, Any] = {
    # Raw upload
    "raw_df": None,          # pd.DataFrame – raw upload
    "upload_meta": {},       # filename, size, row_count, col_count

    # Column mapping supplied by user
    "col_map": {},           # e.g. {"vehicle_id": "vid", ...}

    # After preprocessing
    "preprocessed_df": None, # pd.DataFrame – cleaned observations
    "preprocess_report": {}, # statistics dict

    # After feature extraction
    "features_df": None,     # pd.DataFrame – one row per vehicle

    # After training / clustering
    "model_kmeans": None,    # fitted sklearn KMeans
    "model_dbscan": None,    # fitted sklearn DBSCAN
    "scaler": None,          # fitted StandardScaler

    "kmeans_labels": None,   # np.ndarray
    "dbscan_labels": None,   # np.ndarray

    "kmeans_metrics": {},
    "dbscan_metrics": {},
    "comparison_metrics": {},

    # Feature column names (excluding vehicle_id) used for model
    "feature_cols": [],

    # Trajectories enriched with cluster labels (for map / download)
    "trajectories_with_clusters": None,
}


def get(key: str) -> Any:
    with _lock:
        return _state.get(key)


def set(key: str, value: Any) -> None:
    with _lock:
        _state[key] = value


def update(d: Dict[str, Any]) -> None:
    with _lock:
        _state.update(d)


def clear_model() -> None:
    with _lock:
        for k in ["model_kmeans", "model_dbscan", "scaler",
                   "kmeans_labels", "dbscan_labels",
                   "kmeans_metrics", "dbscan_metrics", "comparison_metrics",
                   "trajectories_with_clusters"]:
            _state[k] = None if k not in ("kmeans_metrics", "dbscan_metrics", "comparison_metrics") else {}
