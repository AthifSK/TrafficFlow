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

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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


@app.get("/")
def root():
    return {"message": "TrafficFlow API is running", "version": "1.0.0"}


@app.get("/health")
@app.get("/api/health")
def health():
    return {"status": "ok"}
