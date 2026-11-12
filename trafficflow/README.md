# TrafficFlow: City-Wide Vehicle Trajectory Clustering

[![Python](https://img.shields.io/badge/Python-3.11-blue.svg)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111-green.svg)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18-blue.svg)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue.svg)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3.4-cyan.svg)](https://tailwindcss.com)
[![License](https://img.shields.io/badge/License-MIT-purple.svg)](LICENSE)

**TrafficFlow** is a complete, production-grade intelligent traffic analytics platform designed to analyze city-wide ANPR (Automatic Number Plate Recognition) and CCTV camera observations using unsupervised machine learning. It automatically reconstructs vehicle trajectories from spatiotemporal observation points, extracts geometric and kinematic features, partitions trajectories into recurring movement clusters using **K-Means** and **DBSCAN**, evaluates cluster quality without manual ground-truth labels, renders interactive map visualizations on OpenStreetMap, and supports inference on newly uploaded datasets.

---

## 1. System Architecture

```text
CSV Upload (Raw ANPR / CCTV Observations)
   │
   ▼
[Data Validation Layer] ─────── Checks missing values, coordinate bounds, invalid speeds
   │
   ▼
[Preprocessing Pipeline] ────── Deduplication, chronological sorting, trajectory filtering
   │
   ▼
[Trajectory Construction] ───── Groups observations by vehicle_id into continuous paths
   │
   ▼
[Feature Engineering] ───────── 15+ kinematic & Haversine geometric features extracted
   │
   ▼
[Feature Scaling] ───────────── StandardScaler fitted strictly on numeric features
   │
   ▼
┌──────────────────────────────┴──────────────────────────────┐
▼                                                             ▼
[K-Means Clustering]                                   [DBSCAN Clustering]
- Configurable K & random state                        - Density-based reachability (eps, min_samples)
- Centroid computation                                 - Automatic noise / anomaly isolation (-1)
- Deterministic assignments                            - Arbitrary cluster geometry discovery
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
[Evaluation & Comparison] ───── Silhouette Score, Davies-Bouldin, Calinski-Harabasz
                               │
                               ▼
┌──────────────────────────────┴──────────────────────────────┐
▼                                                             ▼
[Interactive City Map (Leaflet)]                       [Analytics & CSV Export]
- Trajectory polylines with cluster colors             - Clustered trajectory CSV
- Start/end markers & point hover                      - Extracted features CSV
- Cluster & vehicle search filters                     - Cluster summary report CSV
```

---

## 2. Technology Stack

- **Frontend**:
  - React 18, Vite, TypeScript
  - Tailwind CSS (custom dark traffic intelligence theme)
  - React-Leaflet & Leaflet (OpenStreetMap interactive trajectory visualizer)
  - Recharts (cluster distribution, size breakdowns, metrics)
  - Lucide React (clean UI icons)
  - Axios (REST client with error handling)
- **Backend**:
  - Python 3.11, FastAPI (high-performance async ASGI REST API)
  - Uvicorn (ASGI server)
  - Scikit-learn (KMeans, DBSCAN, StandardScaler, cluster metrics)
  - Pandas & NumPy (data manipulation, vectorized trajectory computations)
  - SciPy & Joblib (spatial math, model serialization)

---

## 3. Project Directory Structure

```text
trafficflow/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── upload.py           # CSV file upload and auto-column detection
│   │   │   ├── dataset.py          # Preview and column mapping validation
│   │   │   ├── preprocess.py       # Data cleaning, timestamp parsing, filtering
│   │   │   ├── features.py         # Trajectory feature extraction endpoint
│   │   │   ├── model.py            # K-Means, DBSCAN training & inference
│   │   │   └── results.py          # Summaries, cluster metrics, map data, downloads
│   │   ├── core/
│   │   │   ├── state.py            # Thread-safe in-memory session pipeline state
│   │   │   └── errors.py           # Standard HTTP exception handlers
│   │   ├── feature_engineering/
│   │   │   └── extractor.py        # Haversine distance, bearings, turning angles
│   │   ├── models/
│   │   │   └── clustering.py       # K-Means, DBSCAN, model comparison & serialization
│   │   ├── preprocessing/
│   │   │   ├── cleaner.py          # Row cleaning, sorting, and trajectory grouping
│   │   │   └── validator.py        # Coordinate [-90,90], [-180,180] & schema checks
│   │   └── main.py                 # FastAPI application setup and CORS middleware
│   ├── models/                     # Saved joblib scalers and model artifacts
│   ├── test_pipeline.py            # End-to-end ML pipeline test script
│   ├── test_api.py                 # Complete FastAPI HTTP endpoint test script
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/             # Reusable UI components
│   │   ├── hooks/
│   │   │   └── useAppContext.tsx    # Global React state for pipeline stages
│   │   ├── layouts/
│   │   │   ├── AppLayout.tsx       # Main dashboard layout
│   │   │   └── Sidebar.tsx         # Navigation sidebar with step-by-step progress
│   │   ├── pages/
│   │   │   ├── LandingPage.tsx     # Hero page, pipeline steps, algorithm guide
│   │   │   ├── Dashboard.tsx       # KPI metrics, cluster size distributions
│   │   │   ├── UploadPage.tsx      # Drag-and-drop CSV upload, column mapper
│   │   │   ├── PreprocessPage.tsx  # Before-and-after cleaning stats & data preview
│   │   │   ├── FeaturesPage.tsx    # 15+ extracted kinematic features viewer
│   │   │   ├── ModelPage.tsx       # K-Means & DBSCAN training with hyperparameter tuning
│   │   │   ├── MapPage.tsx         # Leaflet OpenStreetMap with cluster-colored polylines
│   │   │   ├── ClusterAnalysisPage.tsx # Per-cluster deep-dive and member inspection
│   │   │   └── ResultsPage.tsx     # Full metrics report and CSV exports
│   │   ├── services/
│   │   │   └── api.ts              # Typed Axios API client
│   │   ├── types/
│   │   │   └── index.ts            # TypeScript interfaces
│   │   ├── App.tsx                 # React Router routing configuration
│   │   ├── main.tsx                # React root mount
│   │   └── index.css               # Tailwind CSS & Leaflet styles
│   ├── tailwind.config.js
│   ├── vite.config.ts
│   └── package.json
├── start_all.bat                   # 1-click launcher for backend + frontend
├── start_backend.bat               # Windows batch script to start FastAPI
├── start_frontend.bat              # Windows batch script to start Vite dev server
├── start_backend.ps1               # PowerShell script to start FastAPI
└── start_frontend.ps1              # PowerShell script to start Vite dev server
```

---

## 4. Dataset Schemas & Feature Engineering

### A. Raw Vehicle Observations CSV Schema
Uploaded CSV files can contain any column names because TrafficFlow features **flexible column mapping**. The canonical expected columns are:

| Canonical Column | Required | Description |
|---|:---:|---|
| `vehicle_id` | **Yes** | Unique identifier of the vehicle (anonymized string/int) |
| `timestamp_utc`| **Yes** | ISO-8601 or parseable timestamp of observation |
| `latitude` | **Yes** | WGS84 GPS Latitude [-90.0 to 90.0] |
| `longitude` | **Yes** | WGS84 GPS Longitude [-180.0 to 180.0] |
| `speed_kmh` | No | Instantaneous recorded speed in km/h [0 to 300] |
| `heading_deg` | No | Compass heading angle in degrees [0 to 360] |
| `camera_id` | No | ID of sensor or CCTV camera |
| `camera_name` | No | Name / intersection of sensor |
| `vehicle_type`| No | Vehicle category (car, bus, truck, motorcycle) |

> **Privacy & Fairness:** `vehicle_id` is **never** used as a numerical clustering feature. It is preserved strictly as metadata to map discovered clusters back to physical vehicles.

### B. Extracted Trajectory Features (15 Dimensions)
From raw time-series observations, TrafficFlow computes the following features per vehicle:

1. `point_count`: Total observations in trajectory.
2. `duration_seconds`: Time elapsed from start to end of trip ($t_{\text{end}} - t_{\text{start}}$).
3. `path_length_km`: Sum of consecutive GPS segment lengths using the Haversine formula:
   $$d = 2R \arcsin\left(\sqrt{\sin^2\left(\frac{\Delta\phi}{2}\right) + \cos\phi_1\cos\phi_2\sin^2\left(\frac{\Delta\lambda}{2}\right)}\right)$$
4. `displacement_km`: Straight-line Euclidean/great-circle distance from start to end location.
5. `mean_speed_kmh`: Average vehicle speed over journey.
6. `max_speed_kmh`: Peak speed observed during the trip.
7. `start_latitude` & `start_longitude`: Origin coordinates.
8. `end_latitude` & `end_longitude`: Destination coordinates.
9. `mean_latitude` & `mean_longitude`: Spatial centroid of the route.
10. `initial_bearing_sin` & `initial_bearing_cos`: Cyclical angle encoding of initial movement bearing:
    $$\theta = \text{atan2}(\sin\Delta\lambda\cos\phi_2, \cos\phi_1\sin\phi_2 - \sin\phi_1\cos\phi_2\cos\Delta\lambda)$$
11. `mean_heading_change_deg`: Average turning delta (distinguishes straight arterial highway journeys from winding residential routes).

---

## 5. Machine Learning Models & Evaluation

### A. K-Means Clustering
- Partitions trajectories into $K$ spherical clusters by minimizing within-cluster sum-of-squares (inertia).
- Features are normalized with `StandardScaler` fitted on the training features.
- Enables native inference on newly uploaded datasets via `model.predict(X_new)`.

### B. DBSCAN (Density-Based Spatial Clustering of Applications with Noise)
- Discovers clusters of arbitrary geometric shape based on density reachability ($\varepsilon$ radius, `min_samples`).
- Labels points outside dense clusters as **Noise (-1)**, allowing detection of abnormal or anomalous driving routes.
- **Generalization to New Data**: Since standard scikit-learn DBSCAN has no native `predict()` method, TrafficFlow implements a **nearest-core-sample strategy**: new points within $\varepsilon$ of an existing core point inherit its cluster; otherwise, they are designated as noise or outlier points.

### C. Unsupervised Validation Metrics
Because ground-truth labels do not exist in real-world traffic data, supervised accuracy is not applicable. The system evaluates:
1. **Silhouette Score** $[-1 \le s \le 1]$: Ratio of intra-cluster distance to nearest-cluster distance. Higher is better.
2. **Davies-Bouldin Index** $[0 \le DB < \infty]$: Similarity between each cluster and its closest counterpart. Lower is better.
3. **Calinski-Harabasz Index** $[0 \le CH < \infty]$: Variance ratio criterion of between-cluster to within-cluster dispersion. Higher is better.

---

## 6. How to Run TrafficFlow

### Option 1: One-Click Quick Start (Windows)
Double-click:
```cmd
start_all.bat
```
This opens the FastAPI backend at `http://127.0.0.1:8000` and the React Vite frontend at `http://localhost:5173`.

---

### Option 2: Run Backend and Frontend Separately

#### Backend:
```powershell
cd trafficflow/backend
.\.venv\Scripts\activate
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
Interactive Swagger documentation is available at: `http://127.0.0.1:8000/docs`

#### Frontend:
```powershell
cd trafficflow/frontend
npm run dev
```
Open your browser at: `http://localhost:5173`

---

## 7. Verification & Test Suite

The ML pipeline and API endpoints have been tested against the uploaded dataset splits:
- **Train split**: 120 trajectories (1,440 observations)
- **Validation split**: 36 trajectories (432 observations)
- **Test split**: 36 trajectories (432 observations)

To run the verification tests yourself:
```powershell
# 1. Test ML Pipeline (Preprocessing, Feature Extraction, K-Means, DBSCAN, Evaluation)
python backend/test_pipeline.py

# 2. Test All FastAPI Endpoints (Upload, Preview, Preprocess, Train, Map, Downloads)
python backend/test_api.py
```

All tests pass with 100% success.
