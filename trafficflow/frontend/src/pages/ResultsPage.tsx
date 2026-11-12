import React, { useEffect, useState } from 'react';
import { getResultsSummary, getResultsClusters, downloadResults } from '../services/api';
import { useApp } from '../hooks/useAppContext';
import type { ClusterInfo } from '../types';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend
} from 'recharts';
import { Download, FileText, AlertTriangle, BarChart3 } from 'lucide-react';

const CLUSTER_COLORS = ['#3b82f6','#06b6d4','#10b981','#8b5cf6','#f59e0b','#ef4444','#ec4899','#14b8a6'];
const NOISE_COLOR = '#6b7280';

function getColor(id: number) { return id === -1 ? NOISE_COLOR : CLUSTER_COLORS[id % CLUSTER_COLORS.length]; }
function fmt(v: number | null | undefined, dec = 2) { return v == null ? 'N/A' : v.toFixed(dec); }

function handleDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export default function ResultsPage() {
  const { kmeansTrained, dbscanTrained, activeAlgo, setActiveAlgo } = useApp();
  const [summary, setSummary] = useState<any>(null);
  const [clusters, setClusters] = useState<ClusterInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const hasData = kmeansTrained || dbscanTrained;

  useEffect(() => {
    if (!hasData) return;
    setLoading(true);
    Promise.all([
      getResultsSummary(activeAlgo),
      getResultsClusters(activeAlgo),
    ]).then(([sRes, cRes]) => {
      setSummary(sRes.data);
      setClusters(cRes.data);
    }).finally(() => setLoading(false));
  }, [hasData, activeAlgo]);

  const metrics = summary?.metrics || {};
  const barData = clusters.map(c => ({
    name: c.is_noise ? 'Noise' : `C${c.cluster_id}`,
    count: c.n_trajectories,
    color: getColor(c.cluster_id),
  }));
  const pieData = clusters.map(c => ({
    name: c.is_noise ? 'Noise' : `Cluster ${c.cluster_id}`,
    value: c.n_trajectories,
    color: getColor(c.cluster_id),
  }));

  if (!hasData) {
    return (
      <div className="p-8 flex flex-col items-center justify-center">
        <AlertTriangle className="w-12 h-12 text-amber-400 mb-4" />
        <h2 className="text-xl font-bold mb-2">No Results Available</h2>
        <p className="text-slate-400">Train a clustering model first to see results.</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
            <BarChart3 className="text-blue-400" /> Results & Reports
          </h1>
          <p className="text-slate-400">Comprehensive analysis of clustering results with downloadable outputs.</p>
        </div>
        <div className="flex gap-2">
          {kmeansTrained && (
            <button onClick={() => setActiveAlgo('kmeans')} className={`text-sm px-4 py-2 rounded-lg font-medium transition-all ${activeAlgo === 'kmeans' ? 'bg-blue-600 text-white' : 'btn-secondary'}`}>K-Means</button>
          )}
          {dbscanTrained && (
            <button onClick={() => setActiveAlgo('dbscan')} className={`text-sm px-4 py-2 rounded-lg font-medium transition-all ${activeAlgo === 'dbscan' ? 'bg-violet-600 text-white' : 'btn-secondary'}`}>DBSCAN</button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-3 text-slate-400">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /> Loading results…
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Algorithm', value: activeAlgo === 'kmeans' ? 'K-Means' : 'DBSCAN' },
              { label: 'Trajectories', value: summary?.n_trajectories ?? '—' },
              { label: 'Clusters Found', value: metrics.n_clusters ?? '—' },
              { label: 'Noise Points', value: `${metrics.n_noise ?? '—'} (${metrics.noise_pct ?? '—'}%)` },
            ].map(({ label, value }) => (
              <div key={label} className="stat-card">
                <p className="text-xs text-slate-500 mb-1">{label}</p>
                <p className="text-xl font-bold text-slate-100">{value}</p>
              </div>
            ))}
          </div>

          {/* Evaluation metrics */}
          <div className="glass-card p-6 mb-8">
            <h2 className="font-semibold text-slate-200 mb-4">Evaluation Metrics</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                {
                  label: 'Silhouette Score',
                  value: metrics.silhouette_score,
                  range: '[-1, 1]',
                  note: 'Measures how similar a trajectory is to its own cluster vs. other clusters. Higher values indicate better-defined clusters.',
                  good: 'Higher is better',
                },
                {
                  label: 'Davies-Bouldin Index',
                  value: metrics.davies_bouldin_index,
                  range: '[0, ∞)',
                  note: 'Average similarity between each cluster and its most similar cluster. Lower values indicate better separation.',
                  good: 'Lower is better',
                },
                {
                  label: 'Calinski-Harabasz Score',
                  value: metrics.calinski_harabasz_score,
                  range: '[0, ∞)',
                  note: 'Ratio of between-cluster to within-cluster dispersion. Higher values indicate denser, well-separated clusters.',
                  good: 'Higher is better',
                },
              ].map(({ label, value, range, note, good }) => (
                <div key={label} className="bg-navy-900/60 rounded-xl p-4">
                  <p className="text-xs text-slate-500 mb-1">{label}</p>
                  <p className="text-2xl font-bold text-slate-100 mb-1">
                    {value != null ? fmt(value, 4) : 'N/A'}
                  </p>
                  <p className="text-xs text-blue-400 mb-2">{good} · Range: {range}</p>
                  <p className="text-xs text-slate-500">{note}</p>
                </div>
              ))}
            </div>
            {(metrics.silhouette_score == null) && (
              <p className="text-xs text-amber-400 mt-3">
                ⚠ Some metrics unavailable — requires at least 2 clusters with more than 1 non-noise sample each.
              </p>
            )}
          </div>

          {/* Charts */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div className="glass-card p-6">
              <h3 className="font-semibold text-slate-200 mb-4">Cluster Size Distribution</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={barData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" />
                  <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} />
                  <Tooltip contentStyle={{ background: '#0a1628', border: '1px solid #1a3254', borderRadius: 8 }} labelStyle={{ color: '#e2e8f0' }} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {barData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="glass-card p-6">
              <h3 className="font-semibold text-slate-200 mb-4">Cluster Proportion</h3>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%" cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, percent }: { name?: string; percent?: number }) => `${name ?? ''}: ${((percent ?? 0) * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#0a1628', border: '1px solid #1a3254', borderRadius: 8 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Download options */}
          <div className="glass-card p-6 mb-8">
            <h2 className="font-semibold text-slate-200 mb-4 flex items-center gap-2">
              <Download size={18} className="text-blue-400" /> Download Results
            </h2>
            <div className="grid md:grid-cols-3 gap-4">
              {[
                { label: 'Clustered CSV', desc: 'All features with cluster assignments', type: 'clustered_csv', filename: `trafficflow_${activeAlgo}_clustered.csv` },
                { label: 'Features CSV', desc: 'Raw trajectory feature matrix', type: 'features_csv', filename: 'trafficflow_features.csv' },
                { label: 'Cluster Summary', desc: 'Per-cluster statistics summary', type: 'cluster_summary_csv', filename: `trafficflow_${activeAlgo}_cluster_summary.csv` },
              ].map(({ label, desc, type, filename }) => (
                <button
                  key={type}
                  onClick={async () => {
                    const res = await downloadResults(activeAlgo, type);
                    handleDownload(res.data, filename);
                  }}
                  className="glass-card p-4 text-left hover:border-blue-500/40 transition-all group flex items-start gap-3"
                >
                  <FileText size={18} className="text-blue-400 mt-0.5 flex-shrink-0 group-hover:text-blue-300" />
                  <div>
                    <p className="font-medium text-sm text-slate-200">{label}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
                    <p className="text-xs text-blue-400 mt-1">{filename}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Cluster table */}
          <div className="glass-card p-6">
            <h2 className="font-semibold text-slate-200 mb-4">Per-Cluster Statistics</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-navy-700">
                    {['Cluster', 'Count', '% Total', 'Avg Distance', 'Avg Duration', 'Avg Speed', 'Avg Displacement'].map(h => (
                      <th key={h} className="text-left py-2 px-3 text-slate-500 font-medium whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {clusters.map(c => (
                    <tr key={c.cluster_id} className="border-b border-navy-800/50 hover:bg-navy-900/40">
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ background: getColor(c.cluster_id) }} />
                          <span className="text-slate-200">{c.is_noise ? 'Noise' : `Cluster ${c.cluster_id}`}</span>
                        </div>
                      </td>
                      <td className="py-2 px-3 text-slate-300">{c.n_trajectories}</td>
                      <td className="py-2 px-3 text-slate-300">{c.pct_total}%</td>
                      <td className="py-2 px-3 text-slate-300">{fmt(c.avg_path_length_km)} km</td>
                      <td className="py-2 px-3 text-slate-300">{c.avg_duration_seconds != null ? `${Math.round(c.avg_duration_seconds)}s` : '—'}</td>
                      <td className="py-2 px-3 text-slate-300">{fmt(c.avg_speed_kmh, 1)} km/h</td>
                      <td className="py-2 px-3 text-slate-300">{fmt(c.avg_displacement_km)} km</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
