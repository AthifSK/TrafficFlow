"""TrafficFlow Backend – FastAPI main entry point."""
import os
os.environ.setdefault("LOKY_MAX_CPU_COUNT", "4")

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import upload, dataset, preprocess, features, model, results

app = FastAPI(
    title="TrafficFlow API",
    description="City-Wide Vehicle Trajectory Clustering Platform",
    version="1.0.0",
    docs_url="/api/docs",
    openapi_url="/api/openapi.json",
)

# Configure CORS:
# - Automatically allows any Vercel domain via allow_origin_regex (https://.*\.vercel\.app)
# - Allows localhost for local development
# - Supports custom origins via ALLOWED_ORIGINS environment variable
raw_origins = os.getenv("ALLOWED_ORIGINS", "")
allowed_origins = [o.strip() for o in raw_origins.split(",") if o.strip()]
if not allowed_origins:
    allowed_origins = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=os.getenv("ALLOWED_ORIGIN_REGEX", r"https://.*\.vercel\.app"),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(upload.router,    prefix="/api", tags=["upload"])
app.include_router(dataset.router,   prefix="/api/dataset", tags=["dataset"])
app.include_router(preprocess.router,prefix="/api/preprocess", tags=["preprocess"])
app.include_router(features.router,  prefix="/api/features", tags=["features"])
app.include_router(model.router,     prefix="/api/model", tags=["model"])
app.include_router(results.router,   prefix="/api/results", tags=["results"])


@app.on_event("startup")
def on_startup():
    from app.core.storage import init_runtime_storage
    from app.models.clustering import load_kmeans_artifacts, load_dbscan_artifacts
    from app.core import state

    init_runtime_storage()
    km, scaler_km = load_kmeans_artifacts()
    if km and scaler_km and state.get("model_kmeans") is None:
        state.set("model_kmeans", km)
        state.set("scaler", scaler_km)

    db, scaler_db = load_dbscan_artifacts()
    if db and scaler_db and state.get("model_dbscan") is None:
        state.set("model_dbscan", db)
        state.set("dbscan_scaler", scaler_db)


@app.get("/")
def root():
    return {"message": "TrafficFlow API is running", "version": "1.0.0"}


@app.get("/health")
@app.get("/api/health")
def health():
    return {"status": "ok"}
