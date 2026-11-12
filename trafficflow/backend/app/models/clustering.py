"""Clustering models: K-Means and DBSCAN with evaluation.

Production-safe storage:
- Pre-trained / bundled artifacts: Read-only, resolved relative to source file (BUNDLED_MODELS_DIR).
- Newly trained runtime models: Saved to writable runtime storage (/tmp/trafficflow/models).
"""
from __future__ import annotations
import logging
import numpy as np
import pandas as pd
import joblib
from typing import Any, Dict, List, Optional, Tuple

from sklearn.cluster import KMeans, DBSCAN
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import (
    silhouette_score,
    davies_bouldin_score,
    calinski_harabasz_score,
)

from app.core.storage import (
    get_runtime_model_path,
    resolve_model_path,
    BUNDLED_MODELS_DIR,
)

logger = logging.getLogger("trafficflow.clustering")


def _safe_metrics(X: np.ndarray, labels: np.ndarray) -> Dict[str, Any]:
    """Compute clustering evaluation metrics safely."""
    unique = np.unique(labels[labels != -1])
    n_clusters = len(unique)
    n_noise = int((labels == -1).sum())
    n_total = len(labels)
    metrics: Dict[str, Any] = {
        "n_clusters": n_clusters,
        "n_noise": n_noise,
        "noise_pct": round(100 * n_noise / max(n_total, 1), 2),
    }

    # Need at least 2 clusters and all points labeled
    valid_mask = labels != -1
    X_valid = X[valid_mask]
    l_valid = labels[valid_mask]

    if n_clusters >= 2 and len(np.unique(l_valid)) >= 2:
        try:
            metrics["silhouette_score"] = round(float(silhouette_score(X_valid, l_valid)), 4)
        except Exception:
            metrics["silhouette_score"] = None
        try:
            metrics["davies_bouldin_index"] = round(float(davies_bouldin_score(X_valid, l_valid)), 4)
        except Exception:
            metrics["davies_bouldin_index"] = None
        try:
            metrics["calinski_harabasz_score"] = round(float(calinski_harabasz_score(X_valid, l_valid)), 4)
        except Exception:
            metrics["calinski_harabasz_score"] = None
    else:
        metrics["silhouette_score"] = None
        metrics["davies_bouldin_index"] = None
        metrics["calinski_harabasz_score"] = None

    return metrics


def train_kmeans(
    features_df: pd.DataFrame,
    feature_cols: List[str],
    n_clusters: int = 4,
    random_state: int = 42,
) -> Tuple[KMeans, StandardScaler, np.ndarray, Dict[str, Any]]:
    X_raw = features_df[feature_cols].copy()
    X_raw = X_raw.fillna(X_raw.median())

    scaler = StandardScaler()
    X = scaler.fit_transform(X_raw)

    km = KMeans(n_clusters=n_clusters, random_state=random_state, n_init=10)
    labels = km.fit_predict(X)

    metrics = _safe_metrics(X, labels)
    metrics["inertia"] = round(float(km.inertia_), 4)

    # Cluster sizes
    unique_labels, counts = np.unique(labels, return_counts=True)
    metrics["cluster_sizes"] = {int(k): int(v) for k, v in zip(unique_labels, counts)}

    # Save to writable runtime storage safely
    try:
        joblib.dump(km, get_runtime_model_path("kmeans_model.pkl"))
        joblib.dump(scaler, get_runtime_model_path("kmeans_scaler.pkl"))
    except Exception as exc:
        logger.warning("Could not persist K-Means model to runtime storage: %s", exc)

    return km, scaler, labels, metrics


def predict_kmeans(
    new_features_df: pd.DataFrame,
    feature_cols: List[str],
    km: KMeans,
    scaler: StandardScaler,
) -> np.ndarray:
    X_raw = new_features_df[feature_cols].copy()
    X_raw = X_raw.fillna(X_raw.median())
    X = scaler.transform(X_raw)
    return km.predict(X)


def train_dbscan(
    features_df: pd.DataFrame,
    feature_cols: List[str],
    eps: float = 0.5,
    min_samples: int = 3,
) -> Tuple[DBSCAN, StandardScaler, np.ndarray, Dict[str, Any]]:
    X_raw = features_df[feature_cols].copy()
    X_raw = X_raw.fillna(X_raw.median())

    scaler = StandardScaler()
    X = scaler.fit_transform(X_raw)

    db = DBSCAN(eps=eps, min_samples=min_samples, metric="euclidean")
    labels = db.fit_predict(X)

    metrics = _safe_metrics(X, labels)

    unique_labels, counts = np.unique(labels, return_counts=True)
    metrics["cluster_sizes"] = {int(k): int(v) for k, v in zip(unique_labels, counts)}

    # Save to writable runtime storage safely
    try:
        joblib.dump(db, get_runtime_model_path("dbscan_model.pkl"))
        joblib.dump(scaler, get_runtime_model_path("dbscan_scaler.pkl"))
    except Exception as exc:
        logger.warning("Could not persist DBSCAN model to runtime storage: %s", exc)

    return db, scaler, labels, metrics


def assign_dbscan(
    new_features_df: pd.DataFrame,
    feature_cols: List[str],
    db: DBSCAN,
    scaler: StandardScaler,
) -> np.ndarray:
    """
    Assign new trajectories to DBSCAN clusters using nearest-core-point strategy.
    If no core samples exist, re-fit DBSCAN.
    """
    X_raw = new_features_df[feature_cols].copy()
    X_raw = X_raw.fillna(X_raw.median())
    X_new = scaler.transform(X_raw)

    core_indices = db.core_sample_indices_
    if len(core_indices) == 0:
        # Refit on new data only
        labels = db.fit_predict(X_new)
        return labels

    core_points = db.components_          # shape (n_core, n_features)
    core_labels = db.labels_[core_indices]

    from sklearn.metrics.pairwise import euclidean_distances
    dists = euclidean_distances(X_new, core_points)
    nearest_core_idx = np.argmin(dists, axis=1)
    min_dists = dists[np.arange(len(X_new)), nearest_core_idx]

    labels = np.where(min_dists <= db.eps, core_labels[nearest_core_idx], -1)
    return labels.astype(int)


def load_kmeans_artifacts() -> Tuple[Optional[KMeans], Optional[StandardScaler]]:
    """Load pre-trained or runtime-persisted K-Means model and scaler."""
    model_path = resolve_model_path("kmeans_model.pkl")
    scaler_path = resolve_model_path("kmeans_scaler.pkl")
    if not model_path or not scaler_path:
        return None, None
    try:
        km = joblib.load(model_path)
        scaler = joblib.load(scaler_path)
        return km, scaler
    except Exception as exc:
        logger.warning("Could not load K-Means artifacts: %s", exc)
        return None, None


def load_dbscan_artifacts() -> Tuple[Optional[DBSCAN], Optional[StandardScaler]]:
    """Load pre-trained or runtime-persisted DBSCAN model and scaler."""
    model_path = resolve_model_path("dbscan_model.pkl")
    scaler_path = resolve_model_path("dbscan_scaler.pkl")
    if not model_path or not scaler_path:
        return None, None
    try:
        db = joblib.load(model_path)
        scaler = joblib.load(scaler_path)
        return db, scaler
    except Exception as exc:
        logger.warning("Could not load DBSCAN artifacts: %s", exc)
        return None, None


def compare_algorithms(
    kmeans_metrics: Dict[str, Any],
    dbscan_metrics: Dict[str, Any],
) -> Dict[str, Any]:
    """Build a side-by-side comparison dict."""
    return {
        "kmeans": kmeans_metrics,
        "dbscan": dbscan_metrics,
        "winner": {
            "silhouette": _winner(
                kmeans_metrics.get("silhouette_score"),
                dbscan_metrics.get("silhouette_score"),
                higher_better=True,
            ),
            "davies_bouldin": _winner(
                kmeans_metrics.get("davies_bouldin_index"),
                dbscan_metrics.get("davies_bouldin_index"),
                higher_better=False,
            ),
        },
    }


def _winner(a: Optional[float], b: Optional[float], higher_better: bool) -> str:
    if a is None and b is None:
        return "N/A"
    if a is None:
        return "DBSCAN"
    if b is None:
        return "K-Means"
    if higher_better:
        return "K-Means" if a >= b else "DBSCAN"
    return "K-Means" if a <= b else "DBSCAN"
