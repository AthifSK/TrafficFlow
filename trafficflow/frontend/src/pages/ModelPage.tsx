import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, ArrowRight, AlertTriangle, Activity, Info } from 'lucide-react';
import { trainModel, compareModels } from '../services/api';
import { useApp } from '../hooks/useAppContext';
import type { ClusterMetrics } from '../types';

function MetricCard({ label, value, desc, positive }: { label: string; value: string | number | null; desc: string; positive?: boolean }) {
  const displayVal = value == null ? 'N/A' : typeof value === 'number' ? value.toFixed(4) : value;
  return (
    <div className="glass-card p-4">
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className="text-xl font-bold text-slate-100 mb-1">{displayVal}</p>
      <p className="text-xs text-slate-600">{desc}</p>
      {value != null && positive !== undefined && (
        <span className="text-xs text-slate-400 mt-1 block">{positive ? '↑ Higher is better' : '↓ Lower is better'}</span>
      )}
    </div>
  );
}

export default function ModelPage() {
  const navigate = useNavigate();
  const { featuresReady, setKmeansTrained, setDbscanTrained, setActiveAlgo, setKmeansClusters } = useApp();

  const [algo, setAlgo] = useState<'kmeans' | 'dbscan' | 'both'>('kmeans');
  const [nClusters, setNClusters] = useState(4);
  const [randomState, setRandomState] = useState(42);
  const [eps, setEps] = useState(0.5);
  const [minSamples, setMinSamples] = useState(3);

  const [training, setTraining] = useState(false);
  const [kmResult, setKmResult] = useState<ClusterMetrics | null>(null);
  const [dbResult, setDbResult] = useState<ClusterMetrics | null>(null);
  const [comparison, setComparison] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleTrain = async () => {
    setTraining(true); setError(null);
    try {
      const res = await trainModel({
        algorithm: algo,
        kmeans: algo !== 'dbscan' ? { n_clusters: nClusters, random_state: randomState } : undefined,
        dbscan: algo !== 'kmeans' ? { eps, min_samples: minSamples } : undefined,
      });
      if (res.data.kmeans) {
        setKmResult(res.data.kmeans.metrics);
        setKmeansTrained(true);
        setKmeansClusters(nClusters);
        setActiveAlgo('kmeans');
      }
      if (res.data.dbscan) {
        setDbResult(res.data.dbscan.metrics);
        setDbscanTrained(true);
        if (algo === 'dbscan') setActiveAlgo('dbscan');
      }
      if (res.data.comparison) {
        setComparison(res.data.comparison);
      }
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Training failed.');
    } finally {
      setTraining(false);
    }
  };

  const handleCompare = async () => {
    try {
      const res = await compareModels();
      setComparison(res.data);
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Comparison failed. Train both algorithms first.');
    }
  };

  return (
    <div className="p-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Machine Learning Models</h1>
        <p className="text-slate-400">Train K-Means and/or DBSCAN on the extracted trajectory features. Evaluate and compare results.</p>
      </div>

      {!featuresReady && (
        <div className="glass-card p-8 text-center border-amber-500/30 mb-6">
          <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto mb-3" />
          <p className="text-slate-300 mb-4">Run feature extraction first.</p>
          <button onClick={() => navigate('/features')} className="btn-primary text-sm">Go to Feature Extraction</button>
        </div>
      )}

      {featuresReady && (
        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          {/* Config panel */}
          <div className="lg:col-span-1 space-y-4">
            <div className="glass-card p-6">
              <h2 className="font-semibold text-slate-200 mb-4">Algorithm Selection</h2>
              <div className="space-y-2">
                {(['kmeans', 'dbscan', 'both'] as const).map((a) => (
                  <button
                    key={a}
                    onClick={() => setAlgo(a)}
                    className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                      algo === a
                        ? 'bg-blue-600/20 border border-blue-500/40 text-blue-300'
                        : 'bg-navy-900/60 border border-navy-700 text-slate-400 hover:text-slate-200 hover:border-navy-600'
                    }`}
                  >
                    {a === 'kmeans' ? 'K-Means Only'
                      : a === 'dbscan' ? 'DBSCAN Only'
                      : 'Train Both & Compare'}
                  </button>
                ))}
              </div>
            </div>

            {/* K-Means params */}
            {(algo === 'kmeans' || algo === 'both') && (
              <div className="glass-card p-6">
                <h3 className="font-semibold text-slate-200 mb-4 flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-blue-500" /> K-Means Parameters
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-slate-400 block mb-1.5">Number of Clusters (K)</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="range" min={2} max={20} value={nClusters}
                        onChange={e => setNClusters(+e.target.value)}
                        className="flex-1 accent-blue-500"
                      />
                      <span className="text-blue-400 font-bold w-6 text-center">{nClusters}</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 block mb-1.5">Random State</label>
                    <input
                      type="number" value={randomState}
                      onChange={e => setRandomState(+e.target.value)}
                      className="input-field text-sm"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* DBSCAN params */}
            {(algo === 'dbscan' || algo === 'both') && (
              <div className="glass-card p-6">
                <h3 className="font-semibold text-slate-200 mb-4 flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-violet-500" /> DBSCAN Parameters
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-slate-400 block mb-1.5">ε (eps) — neighborhood radius</label>
                    <input
                      type="number" step={0.05} min={0.05} value={eps}
                      onChange={e => setEps(+e.target.value)}
                      className="input-field text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 block mb-1.5">min_samples — core point threshold</label>
                    <input
                      type="number" min={1} value={minSamples}
                      onChange={e => setMinSamples(+e.target.value)}
                      className="input-field text-sm"
                    />
                  </div>
                  <div className="flex items-start gap-2 text-xs text-slate-500 bg-navy-900/50 rounded-lg p-3">
                    <Info size={12} className="mt-0.5 flex-shrink-0 text-violet-400" />
                    <span>Cluster label <code className="text-violet-300">-1</code> indicates noise/outlier trajectories that fall outside all dense regions.</span>
                  </div>
                </div>
              </div>
            )}

            <button onClick={handleTrain} disabled={training} className="btn-primary w-full flex items-center gap-2 justify-center">
              {training ? (
                <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Training…</>
              ) : (
                <><Play size={16} /> Train Model</>
              )}
            </button>
          </div>

          {/* Results panel */}
          <div className="lg:col-span-2 space-y-6">
            {error && (
              <div className="glass-card p-4 border-red-500/30 text-red-300 text-sm">{error}</div>
            )}

            {kmResult && (
              <div className="glass-card p-6">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-blue-500" /> K-Means Results
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                  <MetricCard label="Clusters Found" value={kmResult.n_clusters} desc="" />
                  <MetricCard label="Silhouette Score" value={kmResult.silhouette_score} desc="[-1, 1], measures cohesion vs separation" positive={true} />
                  <MetricCard label="Davies-Bouldin" value={kmResult.davies_bouldin_index} desc="Lower = tighter clusters" positive={false} />
                  <MetricCard label="Calinski-Harabasz" value={kmResult.calinski_harabasz_score} desc="Higher = denser clusters" positive={true} />
                  <MetricCard label="Inertia" value={kmResult.inertia ?? null} desc="Within-cluster sum of squares" />
                  <MetricCard label="Noise Points" value={kmResult.n_noise} desc="K-Means assigns all points" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-2">Cluster sizes:</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(kmResult.cluster_sizes || {}).map(([k, v]) => (
                      <span key={k} className="badge bg-blue-500/10 text-blue-300 border border-blue-500/20">
                        C{k}: {v as number}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {dbResult && (
              <div className="glass-card p-6">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-violet-500" /> DBSCAN Results
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                  <MetricCard label="Clusters Found" value={dbResult.n_clusters} desc="Excluding noise cluster" />
                  <MetricCard label="Noise Points" value={dbResult.n_noise} desc={`${dbResult.noise_pct}% of trajectories`} />
                  <MetricCard label="Silhouette Score" value={dbResult.silhouette_score} desc="Only computed if ≥2 non-noise clusters" positive={true} />
                  <MetricCard label="Davies-Bouldin" value={dbResult.davies_bouldin_index} desc="" positive={false} />
                  <MetricCard label="Calinski-Harabasz" value={dbResult.calinski_harabasz_score} desc="" positive={true} />
                  <MetricCard label="Noise %" value={`${dbResult.noise_pct}%`} desc="" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-2">Cluster sizes (−1 = noise):</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(dbResult.cluster_sizes || {}).map(([k, v]) => (
                      <span key={k} className={`badge border ${k === '-1' ? 'bg-gray-500/10 text-gray-400 border-gray-500/20' : 'bg-violet-500/10 text-violet-300 border-violet-500/20'}`}>
                        {k === '-1' ? 'Noise' : `C${k}`}: {v as number}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Comparison */}
            {comparison && (
              <div className="glass-card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">Algorithm Comparison</h3>
                  <span className="badge bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-xs">Side-by-Side</span>
                </div>
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div />
                  <div className="text-center font-medium text-blue-400">K-Means</div>
                  <div className="text-center font-medium text-violet-400">DBSCAN</div>
                  {[
                    ['Clusters', 'n_clusters', 'n_clusters'],
                    ['Noise %', 'noise_pct', 'noise_pct'],
                    ['Silhouette', 'silhouette_score', 'silhouette_score'],
                    ['Davies-Bouldin', 'davies_bouldin_index', 'davies_bouldin_index'],
                    ['Calinski-Harabasz', 'calinski_harabasz_score', 'calinski_harabasz_score'],
                  ].map(([label, kmKey, dbKey]) => (
                    <React.Fragment key={label}>
                      <div className="text-slate-400">{label}</div>
                      <div className="text-center font-mono text-slate-200">
                        {comparison.kmeans?.[kmKey] != null ? (typeof comparison.kmeans[kmKey] === 'number' ? comparison.kmeans[kmKey].toFixed(4) : comparison.kmeans[kmKey]) : 'N/A'}
                      </div>
                      <div className="text-center font-mono text-slate-200">
                        {comparison.dbscan?.[dbKey] != null ? (typeof comparison.dbscan[dbKey] === 'number' ? comparison.dbscan[dbKey].toFixed(4) : comparison.dbscan[dbKey]) : 'N/A'}
                      </div>
                    </React.Fragment>
                  ))}
                </div>
                <div className="mt-4 p-3 rounded-lg bg-navy-900/50 text-xs text-slate-400">
                  <strong className="text-slate-300">Note:</strong> These are unsupervised clustering metrics — there are no ground-truth labels, so accuracy cannot be computed. 
                  Higher Silhouette (≤1) and Calinski-Harabasz scores, and lower Davies-Bouldin scores, indicate better-separated clusters.
                </div>
              </div>
            )}

            {(kmResult || dbResult) && (
              <button onClick={() => navigate('/map')} className="btn-primary flex items-center gap-2 text-sm">
                View Results on Map <ArrowRight size={16} />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
