import React, { useEffect, useState } from 'react';
import { getResultsClusters, getResultsTrajectories } from '../services/api';
import { useApp } from '../hooks/useAppContext';
import type { ClusterInfo, TrajectoryPoint } from '../types';
import { Layers, ChevronDown, ChevronUp, AlertTriangle, Users, Clock, Ruler, Zap } from 'lucide-react';

const CLUSTER_COLORS = ['#3b82f6','#06b6d4','#10b981','#8b5cf6','#f59e0b','#ef4444','#ec4899','#14b8a6'];

function fmt(v: number | null | undefined, dec = 2, unit = '') {
  if (v == null) return '—';
  return `${v.toFixed(dec)}${unit}`;
}
function fmtDur(s?: number | null) {
  if (!s) return '—';
  const m = Math.floor(s / 60), sec = Math.round(s % 60);
  return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
}

function ClusterCard({ cluster, algo }: { cluster: ClusterInfo; algo: string }) {
  const [expanded, setExpanded] = useState(false);
  const [trajectories, setTrajectories] = useState<TrajectoryPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const color = cluster.is_noise ? '#6b7280' : CLUSTER_COLORS[cluster.cluster_id % CLUSTER_COLORS.length];

  const handleExpand = async () => {
    setExpanded(e => !e);
    if (!expanded && trajectories.length === 0) {
      setLoading(true);
      try {
        const res = await getResultsTrajectories(algo, cluster.cluster_id);
        setTrajectories(res.data);
      } catch {}
      setLoading(false);
    }
  };

  const patternDesc = cluster.is_noise
    ? 'Outlier trajectories that do not fit any dense pattern.'
    : cluster.avg_path_length_km && cluster.avg_path_length_km > 5
      ? 'Long-distance commuter routes spanning multiple city zones.'
      : cluster.avg_path_length_km && cluster.avg_path_length_km < 2
        ? 'Short local trips within a compact neighbourhood area.'
        : 'Medium-range urban trips typical of city-centre navigation.';

  return (
    <div className="glass-card overflow-hidden transition-all">
      {/* Header */}
      <div
        className="flex items-center gap-4 p-5 cursor-pointer hover:bg-navy-800/60 transition-colors"
        onClick={handleExpand}
      >
        <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ background: color }} />
        <div className="flex-1">
          <h3 className="font-semibold text-slate-200">
            {cluster.is_noise ? '⚠ Noise / Outliers' : `Cluster ${cluster.cluster_id}`}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">{patternDesc}</p>
        </div>
        <div className="flex items-center gap-6 mr-4">
          <div className="text-right">
            <p className="font-bold text-slate-100">{cluster.n_trajectories}</p>
            <p className="text-xs text-slate-500">trajectories</p>
          </div>
          <div className="text-right">
            <p className="font-bold text-slate-100">{cluster.pct_total}%</p>
            <p className="text-xs text-slate-500">of total</p>
          </div>
        </div>
        {expanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
      </div>

      {/* Stats */}
      <div className="px-5 pb-4 grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: Ruler, label: 'Avg Distance', value: fmt(cluster.avg_path_length_km, 2, ' km') },
          { icon: Clock, label: 'Avg Duration', value: fmtDur(cluster.avg_duration_seconds) },
          { icon: Zap, label: 'Avg Speed', value: fmt(cluster.avg_speed_kmh, 1, ' km/h') },
          { icon: Users, label: 'Displacement', value: fmt(cluster.avg_displacement_km, 2, ' km') },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="bg-navy-900/60 rounded-lg p-3">
            <Icon size={13} className="text-slate-500 mb-1" />
            <p className="text-sm font-semibold text-slate-200">{value}</p>
            <p className="text-xs text-slate-500">{label}</p>
          </div>
        ))}
      </div>

      {/* Expanded trajectory list */}
      {expanded && (
        <div className="border-t border-navy-700/50 p-5">
          <h4 className="text-sm font-semibold text-slate-300 mb-3">Member Trajectories (up to 20 shown)</h4>
          {loading ? (
            <div className="flex items-center gap-2 text-slate-500 text-sm">
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              Loading…
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-navy-700">
                    <th className="text-left py-2 px-2 text-slate-500">Vehicle ID</th>
                    <th className="text-right py-2 px-2 text-slate-500">Distance</th>
                    <th className="text-right py-2 px-2 text-slate-500">Duration</th>
                    <th className="text-right py-2 px-2 text-slate-500">Avg Speed</th>
                    <th className="text-right py-2 px-2 text-slate-500">Points</th>
                  </tr>
                </thead>
                <tbody>
                  {trajectories.slice(0, 20).map((t) => (
                    <tr key={t.vehicle_id} className="border-b border-navy-800/40 hover:bg-navy-900/40">
                      <td className="py-1.5 px-2 font-mono text-blue-300">{t.vehicle_id}</td>
                      <td className="py-1.5 px-2 text-right text-slate-300">{fmt(t.path_length_km, 2, ' km')}</td>
                      <td className="py-1.5 px-2 text-right text-slate-300">{fmtDur(t.duration_seconds)}</td>
                      <td className="py-1.5 px-2 text-right text-slate-300">{fmt(t.mean_speed_kmh, 1, ' km/h')}</td>
                      <td className="py-1.5 px-2 text-right text-slate-300">{t.point_count ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ClusterAnalysisPage() {
  const { kmeansTrained, dbscanTrained, activeAlgo, setActiveAlgo } = useApp();
  const [clusters, setClusters] = useState<ClusterInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const hasData = kmeansTrained || dbscanTrained;

  useEffect(() => {
    if (!hasData) return;
    setLoading(true);
    getResultsClusters(activeAlgo)
      .then(r => setClusters(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [hasData, activeAlgo]);

  if (!hasData) {
    return (
      <div className="p-8 flex flex-col items-center justify-center">
        <AlertTriangle className="w-12 h-12 text-amber-400 mb-4" />
        <h2 className="text-xl font-bold mb-2">No Results Available</h2>
        <p className="text-slate-400">Train a clustering model first.</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
            <Layers className="text-blue-400" /> Cluster Analysis
          </h1>
          <p className="text-slate-400">Deep-dive into each discovered movement pattern cluster.</p>
        </div>
        <div className="flex gap-2">
          {kmeansTrained && (
            <button onClick={() => setActiveAlgo('kmeans')} className={`text-sm px-4 py-2 rounded-lg font-medium transition-all ${activeAlgo === 'kmeans' ? 'bg-blue-600 text-white' : 'btn-secondary'}`}>
              K-Means
            </button>
          )}
          {dbscanTrained && (
            <button onClick={() => setActiveAlgo('dbscan')} className={`text-sm px-4 py-2 rounded-lg font-medium transition-all ${activeAlgo === 'dbscan' ? 'bg-violet-600 text-white' : 'btn-secondary'}`}>
              DBSCAN
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-3 text-slate-400">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /> Loading clusters…
        </div>
      ) : (
        <div className="space-y-4">
          {clusters.map(c => (
            <ClusterCard key={c.cluster_id} cluster={c} algo={activeAlgo} />
          ))}
        </div>
      )}
    </div>
  );
}
