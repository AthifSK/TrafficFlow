"""Results, summary, map data, and CSV download endpoints."""
from __future__ import annotations
import io
import json
import numpy as np
import pandas as pd
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse
from typing import Optional
from app.core import state

router = APIRouter()


def _algo_key(algo: str):
    if algo == "dbscan":
        return "dbscan_labels", "dbscan_metrics", "trajectories_dbscan", "dbscan_cluster"
    return "kmeans_labels", "kmeans_metrics", "trajectories_kmeans", "kmeans_cluster"


@router.get("/summary")
def results_summary(algo: str = Query("kmeans")):
    labels_key, metrics_key, _, _ = _algo_key(algo)
    labels = state.get(labels_key)
    metrics = state.get(metrics_key)
    features_df: pd.DataFrame = state.get("features_df")
    report = state.get("preprocess_report")

    if labels is None:
        raise HTTPException(status_code=400, detail="No model trained yet.")

    return {
        "algorithm": algo,
        "preprocess_report": report or {},
        "metrics": metrics or {},
        "n_trajectories": len(labels),
        "n_unique_vehicles": int(features_df["vehicle_id"].nunique()) if features_df is not None else 0,
        "comparison": state.get("comparison_metrics") or {},
    }


@router.get("/clusters")
def results_clusters(algo: str = Query("kmeans")):
    labels_key, _, trajs_key, label_col = _algo_key(algo)
    labels = state.get(labels_key)
    features_df: pd.DataFrame = state.get("features_df")
    if labels is None or features_df is None:
        raise HTTPException(status_code=400, detail="No model results available.")

    labels_arr = np.array(labels)
    unique_labels = sorted(set(labels_arr.tolist()))
    clusters = []
    for cl in unique_labels:
        mask = labels_arr == cl
        sub = features_df[mask]
        clusters.append({
            "cluster_id": int(cl),
            "is_noise": cl == -1,
            "n_trajectories": int(mask.sum()),
            "pct_total": round(100 * mask.sum() / len(labels_arr), 2),
            "avg_path_length_km": _safe_mean(sub, "path_length_km"),
            "avg_displacement_km": _safe_mean(sub, "displacement_km"),
            "avg_duration_seconds": _safe_mean(sub, "duration_seconds"),
            "avg_speed_kmh": _safe_mean(sub, "mean_speed_kmh"),
            "avg_start_lat": _safe_mean(sub, "start_latitude"),
            "avg_start_lon": _safe_mean(sub, "start_longitude"),
            "avg_end_lat": _safe_mean(sub, "end_latitude"),
            "avg_end_lon": _safe_mean(sub, "end_longitude"),
            "vehicle_ids": sub["vehicle_id"].tolist()[:20],
        })
    return clusters


@router.get("/trajectories")
def results_trajectories(
    algo: str = Query("kmeans"),
    cluster_id: Optional[int] = Query(None),
    limit: int = Query(200),
):
    _, _, trajs_key, label_col = _algo_key(algo)
    trajs = state.get(trajs_key)
    if trajs is None:
        raise HTTPException(status_code=400, detail="No trajectory results available.")
    if cluster_id is not None:
        trajs = [t for t in trajs if t.get(label_col) == cluster_id]
    return trajs[:limit]


@router.get("/map")
def results_map(algo: str = Query("kmeans")):
    _, _, trajs_key, label_col = _algo_key(algo)
    trajs = state.get(trajs_key)
    labels_key, metrics_key, _, _ = _algo_key(algo)
    metrics = state.get(metrics_key)

    if trajs is None:
        return {"trajectories": [], "metrics": {}}

    # Downsample points for large datasets
    simplified = []
    for t in trajs:
        pts = t.get("points", [])
        # Keep at most 50 points per trajectory for map performance
        step = max(1, len(pts) // 50)
        simplified.append({**t, "points": pts[::step]})

    return {"trajectories": simplified, "metrics": metrics or {}, "label_col": label_col}


@router.get("/download")
def download_results(
    algo: str = Query("kmeans"),
    file_type: str = Query("clustered_csv"),
):
    labels_key, _, trajs_key, label_col = _algo_key(algo)
    labels = state.get(labels_key)
    features_df: pd.DataFrame = state.get("features_df")

    if labels is None or features_df is None:
        raise HTTPException(status_code=400, detail="No results to download.")

    labels_arr = np.array(labels)

    if file_type == "clustered_csv":
        out = features_df.copy()
        out[label_col] = labels_arr
        name = f"trafficflow_{algo}_clustered.csv"
        return _csv_response(out, name)

    if file_type == "features_csv":
        name = "trafficflow_features.csv"
        return _csv_response(features_df, name)

    if file_type == "cluster_summary_csv":
        rows = []
        for cl in sorted(set(labels_arr.tolist())):
            mask = labels_arr == cl
            sub = features_df[mask]
            rows.append({
                "cluster_id": int(cl),
                "is_noise": cl == -1,
                "n_trajectories": int(mask.sum()),
                "avg_path_length_km": _safe_mean(sub, "path_length_km"),
                "avg_duration_seconds": _safe_mean(sub, "duration_seconds"),
                "avg_speed_kmh": _safe_mean(sub, "mean_speed_kmh"),
            })
        name = f"trafficflow_{algo}_cluster_summary.csv"
        return _csv_response(pd.DataFrame(rows), name)

    raise HTTPException(status_code=400, detail=f"Unknown file_type: {file_type}")


def _csv_response(df: pd.DataFrame, filename: str) -> StreamingResponse:
    buf = io.StringIO()
    df.to_csv(buf, index=False)
    buf.seek(0)
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


def _safe_mean(df: pd.DataFrame, col: str) -> Optional[float]:
    if col not in df.columns:
        return None
    vals = pd.to_numeric(df[col], errors="coerce").dropna()
    return round(float(vals.mean()), 4) if len(vals) else None
