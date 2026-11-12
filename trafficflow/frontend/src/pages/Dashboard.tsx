import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Route, Users, Layers, AlertTriangle, Ruler, Clock,
  TrendingUp, Upload, ArrowRight, Activity
} from 'lucide-react';
import { getResultsSummary, getResultsClusters } from '../services/api';
import { useApp } from '../hooks/useAppContext';
import type { ClusterMetrics, ClusterInfo } from '../types';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';

const CLUSTER_COLORS = ['#3b82f6','#06b6d4','#10b981','#8b5cf6','#f59e0b','#ef4444','#ec4899','#14b8a6'];

function StatCard({ icon: Icon, label, value, sub, color = 'blue' }: {
  icon: React.ComponentType<any>; label: string; value: string | number; sub?: string; color?: string;
}) {
  const colorMap: Record<string, string> = {
    blue: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    cyan: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
    emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    amber: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    violet: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
    rose: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
  };
  const cls = colorMap[color] || colorMap.blue;
  return (
    <div className="stat-card">
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{label}</p>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${cls}`}>
          <Icon size={16} className={cls.split(' ')[0]} />
        </div>
      </div>
      <p className="text-2xl font-bold text-slate-100">{value}</p>
      {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { kmeansTrained, dbscanTrained, uploadMeta, activeAlgo } = useApp();
  const [summary, setSummary] = useState<any>(null);
  const [clusters, setClusters] = useState<ClusterInfo[]>([]);
  const hasData = kmeansTrained || dbscanTrained;

  useEffect(() => {
    if (!hasData) return;
    getResultsSummary(activeAlgo).then(r => setSummary(r.data)).catch(() => {});
    getResultsClusters(activeAlgo).then(r => setClusters(r.data)).catch(() => {});
  }, [hasData, activeAlgo]);

  const metrics: ClusterMetrics | null = summary?.metrics || null;
  const chartData = clusters.map((c) => ({
    name: c.is_noise ? 'Noise' : `C${c.cluster_id}`,
    count: c.n_trajectories,
    color: c.is_noise ? '#6b7280' : CLUSTER_COLORS[c.cluster_id % CLUSTER_COLORS.length],
  }));

  if (!hasData) {
    return (
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-100 mb-2">Dashboard</h1>
          <p className="text-slate-400">Traffic intelligence overview</p>
        </div>

        {/* Empty state */}
        <div className="glass-card p-16 text-center">
          <div className="w-20 h-20 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mx-auto mb-6">
            <Activity className="w-10 h-10 text-blue-400" />
          </div>
          <h2 className="text-2xl font-bold mb-3">No Data Yet</h2>
          <p className="text-slate-400 max-w-md mx-auto mb-8">
            Upload a vehicle observation CSV, run preprocessing and feature extraction, then train a clustering model to see analytics here.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button onClick={() => navigate('/upload')} className="btn-primary flex items-center gap-2 justify-center">
              <Upload size={16} /> Upload Dataset
            </button>
            <button onClick={() => navigate('/model')} className="btn-secondary flex items-center gap-2 justify-center">
              <Activity size={16} /> Train Model
            </button>
          </div>
          <div className="mt-10 grid grid-cols-2 md:grid-cols-3 gap-4 text-left max-w-2xl mx-auto">
            {[
              { step: '1', label: 'Upload CSV', desc: 'Vehicle observations with coordinates and timestamps' },
              { step: '2', label: 'Preprocess', desc: 'Clean, validate, and construct trajectories' },
              { step: '3', label: 'Extract Features', desc: 'Distance, speed, bearing, duration, and more' },
              { step: '4', label: 'Train Model', desc: 'K-Means or DBSCAN clustering' },
              { step: '5', label: 'Explore Map', desc: 'Cluster-colored trajectories on OpenStreetMap' },
              { step: '6', label: 'Export Results', desc: 'Download clustered CSV and reports' },
            ].map(({ step, label, desc }) => (
              <div key={step} className="glass-card p-4">
                <span className="text-xs font-bold text-blue-400 mb-1 block">Step {step}</span>
                <p className="font-medium text-sm text-slate-200 mb-1">{label}</p>
                <p className="text-xs text-slate-500">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-100 mb-2">Dashboard</h1>
          <p className="text-slate-400">
            {activeAlgo === 'kmeans' ? 'K-Means' : 'DBSCAN'} clustering results ·{' '}
            {uploadMeta?.filename}
          </p>
        </div>
        <button onClick={() => navigate('/results')} className="btn-secondary flex items-center gap-2 text-sm">
          Full Report <ArrowRight size={15} />
        </button>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <StatCard icon={Route} label="Trajectories" value={summary?.n_trajectories ?? '—'} color="blue" />
        <StatCard icon={Users} label="Unique Vehicles" value={summary?.n_unique_vehicles ?? '—'} color="cyan" />
        <StatCard icon={Layers} label="Clusters" value={metrics?.n_clusters ?? '—'} color="emerald" />
        <StatCard icon={AlertTriangle} label="Noise Points" value={metrics?.n_noise ?? '—'} sub={metrics?.noise_pct != null ? `${metrics.noise_pct}% of total` : undefined} color="amber" />
        <StatCard icon={TrendingUp} label="Silhouette" value={metrics?.silhouette_score != null ? metrics.silhouette_score.toFixed(3) : 'N/A'} sub="Higher is better" color="violet" />
        <StatCard icon={TrendingUp} label="Davies-Bouldin" value={metrics?.davies_bouldin_index != null ? metrics.davies_bouldin_index.toFixed(3) : 'N/A'} sub="Lower is better" color="rose" />
      </div>

      {/* Chart + cluster table */}
      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        <div className="glass-card p-6">
          <h3 className="font-semibold text-slate-200 mb-4">Cluster Size Distribution</h3>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" />
                <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ background: '#0a1628', border: '1px solid #1a3254', borderRadius: 8 }}
                  labelStyle={{ color: '#e2e8f0' }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="h-52 flex items-center justify-center text-slate-500">No data</div>}
        </div>

        <div className="glass-card p-6">
          <h3 className="font-semibold text-slate-200 mb-4">Cluster Summary</h3>
          <div className="space-y-2 overflow-y-auto max-h-56">
            {clusters.map((c) => (
              <div key={c.cluster_id} className="flex items-center gap-3 p-2.5 rounded-lg bg-navy-900/60 hover:bg-navy-900 transition-colors">
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ background: c.is_noise ? '#6b7280' : CLUSTER_COLORS[c.cluster_id % CLUSTER_COLORS.length] }}
                />
                <span className="text-sm font-medium flex-1 text-slate-300">
                  {c.is_noise ? 'Noise' : `Cluster ${c.cluster_id}`}
                </span>
                <span className="text-xs text-slate-500">{c.n_trajectories} trajectories</span>
                <span className="text-xs text-slate-600">{c.pct_total}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick links */}
      <div className="grid md:grid-cols-3 gap-4">
        {[
          { to: '/map', icon: Route, label: 'Open City Map', desc: 'View cluster trajectories on interactive map' },
          { to: '/clusters', icon: Layers, label: 'Cluster Analysis', desc: 'Deep-dive into each cluster pattern' },
          { to: '/results', icon: TrendingUp, label: 'Full Report', desc: 'Metrics, charts, and CSV downloads' },
        ].map(({ to, icon: Icon, label, desc }) => (
          <button
            key={to}
            onClick={() => navigate(to)}
            className="glass-card p-5 text-left hover:border-blue-500/40 transition-all group flex items-start gap-4"
          >
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-500/20 transition-colors">
              <Icon size={18} className="text-blue-400" />
            </div>
            <div>
              <p className="font-medium text-slate-200 mb-1">{label}</p>
              <p className="text-xs text-slate-500">{desc}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
