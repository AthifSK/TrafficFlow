"""Comprehensive test of FastAPI endpoints using FastAPI TestClient."""
import os
import sys
import io
import pandas as pd
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.dirname(__file__))
from app.main import app

client = TestClient(app)
RAW_DATA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "data", "raw", "TrafficFlow_Train_Validation_Test"))

def test_api_endpoints():
    print("=== Testing FastAPI Endpoints ===")
    
    # 1. Health check
    res = client.get("/health")
    assert res.status_code == 200
    print("1. /health -> 200 OK")

    # 2. Upload CSV
    train_path = os.path.join(RAW_DATA_DIR, "trafficflow_train_trajectories.csv")
    with open(train_path, "rb") as f:
        res = client.post("/api/upload", files={"file": ("trafficflow_train_trajectories.csv", f, "text/csv")})
    assert res.status_code == 200
    data = res.json()
    print(f"2. /api/upload -> {data['message']}, {data['row_count']} rows, auto_map: {data['auto_col_map']}")

    # 3. Dataset preview & validate
    res = client.get("/api/dataset/preview")
    assert res.status_code == 200
    print(f"3. /api/dataset/preview -> {len(res.json()['preview_rows'])} preview rows")

    res = client.post("/api/dataset/validate", json={"col_map": data['auto_col_map']})
    assert res.status_code == 200
    assert res.json()["valid"] is True
    print("   /api/dataset/validate -> Valid: True")

    # 4. Preprocess
    res = client.post("/api/preprocess")
    assert res.status_code == 200
    prep = res.json()["report"]
    print(f"4. /api/preprocess -> cleaned {prep['final_rows']} rows, {prep['unique_vehicles']} vehicles")

    # 5. Extract Features
    res = client.post("/api/features/extract")
    assert res.status_code == 200
    feat_data = res.json()
    print(f"5. /api/features/extract -> {feat_data['n_trajectories']} trajectories, {len(feat_data['feature_columns'])} features")

    # 6. Train Models (both K-Means and DBSCAN)
    res = client.post("/api/model/train", json={
        "algorithm": "both",
        "kmeans": {"n_clusters": 4, "random_state": 42},
        "dbscan": {"eps": 1.8, "min_samples": 3}
    })
    assert res.status_code == 200
    m_data = res.json()
    print(f"6. /api/model/train -> K-Means clusters: {m_data['kmeans']['metrics']['n_clusters']}, DBSCAN clusters: {m_data['dbscan']['metrics']['n_clusters']}")

    # 7. Summary
    res = client.get("/api/results/summary?algo=kmeans")
    assert res.status_code == 200
    print("7. /api/results/summary (kmeans) -> 200 OK")

    # 8. Clusters
    res = client.get("/api/results/clusters?algo=kmeans")
    assert res.status_code == 200
    clusters = res.json()
    print(f"8. /api/results/clusters -> {len(clusters)} clusters")

    # 9. Map data
    res = client.get("/api/results/map?algo=kmeans")
    assert res.status_code == 200
    map_data = res.json()
    print(f"9. /api/results/map -> {len(map_data['trajectories'])} trajectories for map rendering")

    # 10. Downloads
    for ftype in ["clustered_csv", "features_csv", "cluster_summary_csv"]:
        res = client.get(f"/api/results/download?algo=kmeans&file_type={ftype}")
        assert res.status_code == 200
        content = res.text
        lines = content.strip().split("\n")
        print(f"10. /api/results/download ({ftype}) -> 200 OK, {len(lines)} CSV lines")

    print("\n>>> ALL API ENDPOINTS TESTED AND WORKING! <<<")

if __name__ == "__main__":
    test_api_endpoints()
