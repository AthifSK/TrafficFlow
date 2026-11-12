import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Polyline, CircleMarker, Popup, useMap } from 'react-leaflet';
import { getResultsMap, getResultsClusters } from '../services/api';
import { useApp } from '../hooks/useAppContext';
import type { TrajectoryPoint, ClusterInfo, MapData } from '../types';
import { Map as MapIcon, Filter, Search, AlertTriangle } from 'lucide-react';

const CLUSTER_COLORS = ['#3b82f6','#06b6d4','#10b981','#8b5cf6','#f59e0b','#ef4444','#ec4899','#14b8a6','#f97316','#84cc16'];
const NOISE_COLOR = '#6b7280';

function getColor(clusterLabel: number): string {
  if (clusterLabel === -1) return NOISE_COLOR;
  return CLUSTER_COLORS[clusterLabel % CLUSTER_COLORS.length];
}

function formatDuration(seconds?: number | null) {
  if (!seconds) return '—';
  const m = Math.floor(seconds / 60), s = Math.round(seconds % 60);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function MapBounds({ trajectories }: { trajectories: TrajectoryPoint[] }) {
  const map = useMap();
  useEffect(() => {
    if (trajectories.length === 0) return;
    const allPoints = trajectories.flatMap(t => t.points as [number, number][]);
    if (allPoints.length === 0) return;
    const lats = allPoints.map(p => p[0]);
    const lons = allPoints.map(p => p[1]);
    map.fitBounds([[Math.min(...lats), Math.min(...lons)], [Math.max(...lats), Math.max(...lons)]], { padding: [30, 30] });
  }, [trajectories]);
  return null;
}

export default function MapPage() {
  const { kmeansTrained, dbscanTrained, activeAlgo, setActiveAlgo } = useApp();
  const [mapData, setMapData] = useState<MapData | null>(null);
  const [clusters, setClusters] = useState<ClusterInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterCluster, setFilterCluster] = useState<number | 'all' | 'noise'>('all');
  const [searchVid, setSearchVid] = useState('');
  const hasData = kmeansTrained || dbscanTrained;

  useEffect(() => {
    if (!hasData) return;
    setLoading(true);
    Promise.all([
      getResultsMap(activeAlgo),
      getResultsClusters(activeAlgo),
    ]).then(([mapRes, clRes]) => {
      setMapData(mapRes.data);
      setClusters(clRes.data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [hasData, activeAlgo]);

  const filteredTrajectories = (mapData?.trajectories || []).filter(t => {
    const labelCol = mapData?.label_col || 'kmeans_cluster';
    const label = (t as any)[labelCol] as number;
    if (filterCluster === 'noise' && label !== -1) return false;
    if (typeof filterCluster === 'number' && label !== filterCluster) return false;
    if (searchVid && !t.vehicle_id.toLowerCase().includes(searchVid.toLowerCase())) return false;
    return true;
  });

  if (!hasData) {
    return (
      <div className="p-8 flex flex-col items-center justify-center h-full">
        <AlertTriangle className="w-12 h-12 text-amber-400 mb-4" />
        <h2 className="text-xl font-bold mb-2">No Model Trained Yet</h2>
        <p className="text-slate-400 text-center max-w-md">Train a clustering model first to visualize trajectories on the map.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Top bar */}
      <div className="bg-navy-900 border-b border-navy-700/50 px-6 py-3 flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <MapIcon size={18} className="text-blue-400" />
          <h1 className="font-semibold text-slate-200">City Trajectory Map</h1>
        </div>

        {/* Algo toggle */}
        <div className="flex gap-2 ml-4">
          {kmeansTrained && (
            <button
              onClick={() => setActiveAlgo('kmeans')}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${activeAlgo === 'kmeans' ? 'bg-blue-600 text-white' : 'bg-navy-800 text-slate-400 hover:text-slate-200'}`}
            >K-Means</button>
          )}
          {dbscanTrained && (
            <button
              onClick={() => setActiveAlgo('dbscan')}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${activeAlgo === 'dbscan' ? 'bg-violet-600 text-white' : 'bg-navy-800 text-slate-400 hover:text-slate-200'}`}
            >DBSCAN</button>
          )}
        </div>

        {/* Cluster filter */}
        <div className="flex items-center gap-2 ml-auto">
          <Filter size={14} className="text-slate-500" />
          <select
            className="bg-navy-800 border border-navy-700 text-slate-200 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-500"
            value={filterCluster === 'all' ? 'all' : filterCluster === 'noise' ? 'noise' : filterCluster}
            onChange={e => {
              const v = e.target.value;
              if (v === 'all') setFilterCluster('all');
              else if (v === 'noise') setFilterCluster('noise');
              else setFilterCluster(parseInt(v));
            }}
          >
            <option value="all">All Clusters</option>
            <option value="noise">Noise Only</option>
            {clusters.filter(c => !c.is_noise).map(c => (
              <option key={c.cluster_id} value={c.cluster_id}>Cluster {c.cluster_id}</option>
            ))}
          </select>

          <Search size={14} className="text-slate-500 ml-2" />
          <input
            type="text"
            placeholder="Search vehicle ID…"
            value={searchVid}
            onChange={e => setSearchVid(e.target.value)}
            className="bg-navy-800 border border-navy-700 text-slate-200 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-500 w-40"
          />
        </div>

        <span className="text-xs text-slate-500">
          Showing {filteredTrajectories.length} of {mapData?.trajectories.length ?? 0} trajectories
        </span>
      </div>

      {/* Legend */}
      <div className="bg-navy-900/80 border-b border-navy-700/30 px-6 py-2 flex items-center gap-4 flex-wrap">
        {clusters.map(c => (
          <div key={c.cluster_id} className="flex items-center gap-1.5">
            <span
              className="w-3 h-1.5 rounded-full inline-block"
              style={{ background: c.is_noise ? NOISE_COLOR : getColor(c.cluster_id) }}
            />
            <span className="text-xs text-slate-400">
              {c.is_noise ? 'Noise' : `C${c.cluster_id}`} ({c.n_trajectories})
            </span>
          </div>
        ))}
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        {loading && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-navy-950/80">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-slate-400">Loading trajectories…</p>
            </div>
          </div>
        )}
        <MapContainer
          center={[41.15, -8.61]}
          zoom={12}
          style={{ height: '100%', width: '100%' }}
          zoomControl={true}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />
          {mapData && <MapBounds trajectories={filteredTrajectories} />}
          {filteredTrajectories.map((traj) => {
            const labelCol = mapData?.label_col || 'kmeans_cluster';
            const label = (traj as any)[labelCol] as number;
            const color = getColor(label);
            const pts = traj.points as [number, number][];
            if (pts.length < 2) return null;
            return (
              <React.Fragment key={traj.vehicle_id}>
                <Polyline
                  positions={pts}
                  color={color}
                  weight={2.5}
                  opacity={0.8}
                />
                {/* Start marker */}
                <CircleMarker
                  center={pts[0]}
                  radius={5}
                  color={color}
                  fillColor={color}
                  fillOpacity={1}
                  weight={1}
                >
                  <Popup>
                    <div className="text-xs font-sans space-y-1" style={{ minWidth: 200 }}>
                      <p className="font-bold text-base">{traj.vehicle_id}</p>
                      <p><strong>Cluster:</strong> {label === -1 ? 'Noise' : `Cluster ${label}`}</p>
                      <p><strong>Distance:</strong> {traj.path_length_km?.toFixed(2) ?? '—'} km</p>
                      <p><strong>Duration:</strong> {formatDuration(traj.duration_seconds)}</p>
                      <p><strong>Avg Speed:</strong> {traj.mean_speed_kmh?.toFixed(1) ?? '—'} km/h</p>
                      <p><strong>Points:</strong> {traj.point_count ?? pts.length}</p>
                      <p className="text-gray-500">▲ Start point</p>
                    </div>
                  </Popup>
                </CircleMarker>
                {/* End marker */}
                <CircleMarker
                  center={pts[pts.length - 1]}
                  radius={4}
                  color="#ffffff"
                  fillColor={color}
                  fillOpacity={0.9}
                  weight={2}
                >
                  <Popup>
                    <div className="text-xs font-sans">
                      <p className="font-bold">{traj.vehicle_id}</p>
                      <p className="text-gray-500">▼ End point</p>
                    </div>
                  </Popup>
                </CircleMarker>
              </React.Fragment>
            );
          })}
        </MapContainer>
      </div>
    </div>
  );
}
