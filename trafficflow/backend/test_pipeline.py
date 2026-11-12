"""Comprehensive end-to-end test of the TrafficFlow pipeline with the actual uploaded dataset."""
import os
import sys
import pandas as pd

# Add app to sys.path
sys.path.insert(0, os.path.dirname(__file__))

from app.preprocessing.validator import validate
from app.preprocessing.cleaner import preprocess
from app.feature_engineering.extractor import extract_features, get_model_feature_cols
from app.models.clustering import (
    train_kmeans, predict_kmeans,
    train_dbscan, assign_dbscan,
    compare_algorithms
)

RAW_DATA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "data", "raw", "TrafficFlow_Train_Validation_Test"))

def test_full_pipeline():
    print("=== Testing TrafficFlow ML Pipeline ===")
    
    # 1. Load train dataset
    train_path = os.path.join(RAW_DATA_DIR, "trafficflow_train_trajectories.csv")
    assert os.path.exists(train_path), f"Train dataset not found at {train_path}"
    df_raw = pd.read_csv(train_path)
    print(f"1. Loaded train trajectories: {len(df_raw)} rows, columns: {list(df_raw.columns)}")

    # 2. Test auto column mapping & validation
    col_map = {
        "vehicle_id": "vehicle_id",
        "timestamp_utc": "timestamp_utc",
        "latitude": "latitude",
        "longitude": "longitude",
        "speed_kmh": "speed_kmh",
        "heading_deg": "heading_deg"
    }
    val_report = validate(df_raw, col_map)
    print(f"2. Validation result: valid={val_report['valid']}, errors={val_report['errors']}, warnings={len(val_report['warnings'])}")
    assert val_report['valid'], "Validation should succeed on train trajectories"

    # 3. Test Preprocessing
    df_clean, prep_report = preprocess(df_raw, col_map)
    print(f"3. Preprocessed: {prep_report['initial_rows']} -> {prep_report['final_rows']} rows, {prep_report['unique_vehicles']} unique vehicles")
    assert prep_report['unique_vehicles'] > 0
    assert len(df_clean) > 0

    # 4. Test Trajectory Feature Extraction
    features_df = extract_features(df_clean)
    feat_cols = get_model_feature_cols(features_df)
    print(f"4. Extracted features: {len(features_df)} trajectories, {len(feat_cols)} model features:")
    print("   Features:", feat_cols)
    assert len(features_df) == prep_report['unique_vehicles']
    assert "vehicle_id" not in feat_cols, "vehicle_id must NEVER be a numerical model feature"
    assert len(feat_cols) >= 8

    # Compare with precomputed features file if available
    train_features_path = os.path.join(RAW_DATA_DIR, "trafficflow_train_trajectory_features.csv")
    if os.path.exists(train_features_path):
        df_precomp = pd.read_csv(train_features_path)
        print(f"   Precomputed features file has {len(df_precomp)} rows. Extracted rows: {len(features_df)}")
        assert len(features_df) == len(df_precomp), "Trajectory count should match precomputed file"

    # 5. Test K-Means Clustering
    km, scaler_km, km_labels, km_metrics = train_kmeans(features_df, feat_cols, n_clusters=4, random_state=42)
    print("\n5. K-Means Results:")
    print(f"   Clusters: {km_metrics['n_clusters']}")
    print(f"   Silhouette Score: {km_metrics['silhouette_score']}")
    print(f"   Davies-Bouldin Index: {km_metrics['davies_bouldin_index']}")
    print(f"   Calinski-Harabasz Score: {km_metrics['calinski_harabasz_score']}")
    print(f"   Inertia: {km_metrics['inertia']}")
    print(f"   Cluster sizes: {km_metrics['cluster_sizes']}")
    assert km_metrics['n_clusters'] == 4
    assert km_metrics['silhouette_score'] is not None

    # 6. Test DBSCAN Clustering
    db, scaler_db, db_labels, db_metrics = train_dbscan(features_df, feat_cols, eps=1.8, min_samples=3)
    print("\n6. DBSCAN Results:")
    print(f"   Clusters: {db_metrics['n_clusters']}")
    print(f"   Noise points: {db_metrics['n_noise']} ({db_metrics['noise_pct']}%)")
    print(f"   Silhouette Score: {db_metrics['silhouette_score']}")
    print(f"   Cluster sizes: {db_metrics['cluster_sizes']}")

    # 7. Test Algorithm Comparison
    comp = compare_algorithms(km_metrics, db_metrics)
    print("\n7. Comparison:")
    print(f"   Silhouette Winner: {comp['winner']['silhouette']}")
    print(f"   Davies-Bouldin Winner: {comp['winner']['davies_bouldin']}")

    # 8. Test Generalization to Unseen Validation & Test Data
    print("\n8. Testing Generalization to Unseen Data (Validation & Test Sets):")
    for split_name in ["validation", "test"]:
        path = os.path.join(RAW_DATA_DIR, f"trafficflow_{split_name}_trajectories.csv")
        assert os.path.exists(path), f"{split_name} data not found"
        df_split = pd.read_csv(path)
        df_split_clean, _ = preprocess(df_split, col_map)
        feat_split = extract_features(df_split_clean)
        
        # Predict with saved K-Means
        pred_km = predict_kmeans(feat_split, feat_cols, km, scaler_km)
        print(f"   [{split_name.upper()}] Assigned {len(pred_km)} trajectories using K-Means: unique clusters = {set(pred_km)}")
        assert len(pred_km) == len(feat_split)

        # Assign with DBSCAN nearest-core strategy
        assign_db = assign_dbscan(feat_split, feat_cols, db, scaler_db)
        print(f"   [{split_name.upper()}] Assigned {len(assign_db)} trajectories using DBSCAN: unique clusters = {set(assign_db)}")
        assert len(assign_db) == len(feat_split)

    print("\n>>> ALL TESTS PASSED SUCCESSFULLY! <<<")

if __name__ == "__main__":
    test_full_pipeline()
