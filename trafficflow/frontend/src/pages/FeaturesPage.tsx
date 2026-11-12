import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, ArrowRight, AlertTriangle, GitBranch } from 'lucide-react';
import { runFeatureExtraction } from '../services/api';
import { useApp } from '../hooks/useAppContext';

const FEATURE_DESCRIPTIONS: Record<string, string> = {
  point_count: 'Number of observation points in trajectory',
  duration_seconds: 'Total journey duration from first to last observation',
  path_length_km: 'Total path distance (sum of GPS segment lengths via Haversine)',
  displacement_km: 'Straight-line distance from start to end point',
  mean_speed_kmh: 'Average speed across all trajectory points',
  max_speed_kmh: 'Maximum recorded speed',
  start_latitude: 'Latitude of journey start location',
  start_longitude: 'Longitude of journey start location',
  end_latitude: 'Latitude of journey end location',
  end_longitude: 'Longitude of journey end location',
  mean_latitude: 'Average latitude (centroid)',
  mean_longitude: 'Average longitude (centroid)',
  initial_bearing_sin: 'Sine of initial travel bearing (encodes direction cyclically)',
  initial_bearing_cos: 'Cosine of initial travel bearing',
  mean_heading_change_deg: 'Average turning rate — high = winding route, low = straight',
};

export default function FeaturesPage() {
  const navigate = useNavigate();
  const { preprocessReport, setFeaturesReady } = useApp();
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleExtract = async () => {
    setRunning(true); setError(null);
    try {
      const res = await runFeatureExtraction();
      setResult(res.data);
      setFeaturesReady(true);
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Feature extraction failed.');
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Trajectory Feature Extraction</h1>
        <p className="text-slate-400">
          Compute one feature row per vehicle trajectory. These features are then scaled and fed into the clustering algorithm.
        </p>
      </div>

      {!preprocessReport && (
        <div className="glass-card p-8 text-center border-amber-500/30">
          <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto mb-3" />
          <p className="text-slate-300 mb-4">Run preprocessing first.</p>
          <button onClick={() => navigate('/preprocess')} className="btn-primary text-sm">Go to Preprocessing</button>
        </div>
      )}

      {preprocessReport && (
        <>
          {/* Feature list */}
          <div className="glass-card p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-semibold text-slate-200">Features to be Extracted</h2>
                <p className="text-xs text-slate-500 mt-0.5">{preprocessReport.unique_vehicles} trajectories to process</p>
              </div>
              <button onClick={handleExtract} disabled={running} className="btn-primary flex items-center gap-2 text-sm">
                {running ? (
                  <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Extracting…</>
                ) : (
                  <><Play size={16} /> Extract Features</>
                )}
              </button>
            </div>

            <div className="grid md:grid-cols-2 gap-2.5">
              {Object.entries(FEATURE_DESCRIPTIONS).map(([feat, desc]) => (
                <div key={feat} className="flex items-start gap-3 p-3 rounded-lg bg-navy-900/40 hover:bg-navy-900/60 transition-colors">
                  <GitBranch size={14} className="text-blue-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-slate-200 font-mono">{feat}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {error && (
            <div className="glass-card p-4 border-red-500/30 text-red-300 text-sm mb-6">{error}</div>
          )}

          {result && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                {[
                  { label: 'Trajectories', value: result.n_trajectories },
                  { label: 'Model Features', value: result.feature_columns?.length ?? '—' },
                  { label: 'Excluded', value: 'vehicle_id (identifier)' },
                ].map(({ label, value }) => (
                  <div key={label} className="stat-card">
                    <p className="text-xl font-bold text-slate-100">{value}</p>
                    <p className="text-xs text-slate-500">{label}</p>
                  </div>
                ))}
              </div>

              {/* Feature list */}
              <div className="glass-card p-6 mb-6">
                <h3 className="font-semibold text-slate-200 mb-3">Model Input Features</h3>
                <div className="flex flex-wrap gap-2">
                  {result.feature_columns?.map((f: string) => (
                    <span key={f} className="badge bg-blue-500/10 text-blue-300 border border-blue-500/20 font-mono text-xs">
                      {f}
                    </span>
                  ))}
                </div>
              </div>

              {/* Preview table */}
              {result.preview?.length > 0 && (
                <div className="glass-card p-6 mb-6 overflow-x-auto">
                  <h3 className="font-semibold text-slate-200 mb-3">Feature Preview (first 5 trajectories)</h3>
                  <table className="text-xs w-full">
                    <thead>
                      <tr className="border-b border-navy-700">
                        {Object.keys(result.preview[0]).map((k) => (
                          <th key={k} className="text-left py-2 px-2 text-slate-500 whitespace-nowrap">{k}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {result.preview.map((row: any, i: number) => (
                        <tr key={i} className="border-b border-navy-800/50">
                          {Object.values(row).map((v: any, j) => (
                            <td key={j} className="py-2 px-2 text-slate-300 whitespace-nowrap">
                              {typeof v === 'number' ? v.toFixed(4) : String(v ?? '')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <button onClick={() => navigate('/model')} className="btn-primary flex items-center gap-2 text-sm">
                Continue to ML Models <ArrowRight size={16} />
              </button>
            </>
          )}
        </>
      )}
    </div>
  );
}
