import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, CheckCircle, ArrowRight, AlertTriangle, Trash2, Clock, Database } from 'lucide-react';
import { runPreprocess, getPreprocessPreview } from '../services/api';
import { useApp } from '../hooks/useAppContext';
import type { PreprocessReport } from '../types';

export default function PreprocessPage() {
  const navigate = useNavigate();
  const { uploadMeta, preprocessReport, setPreprocessReport, setFeaturesReady } = useApp();
  const [running, setRunning] = useState(false);
  const [report, setReport] = useState<PreprocessReport | null>(preprocessReport);
  const [preview, setPreview] = useState<any[]>([]);
  const [previewCols, setPreviewCols] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleRun = async () => {
    if (!uploadMeta) { setError('Upload a dataset first.'); return; }
    setRunning(true); setError(null);
    try {
      const res = await runPreprocess();
      const r = res.data.report as PreprocessReport;
      setReport(r);
      setPreprocessReport(r);
      setFeaturesReady(false);

      const prev = await getPreprocessPreview();
      setPreview(prev.data.preview_rows || []);
      setPreviewCols(prev.data.columns || []);
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Preprocessing failed.');
    } finally {
      setRunning(false);
    }
  };

  const retainPct = report
    ? Math.round(100 * report.final_rows / Math.max(report.initial_rows, 1))
    : 0;

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Data Preprocessing</h1>
        <p className="text-slate-400">Clean and validate observations, remove duplicates, parse timestamps, validate coordinates, and construct trajectories.</p>
      </div>

      {!uploadMeta && (
        <div className="glass-card p-8 text-center border-amber-500/30">
          <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto mb-3" />
          <p className="text-slate-300 mb-4">No dataset uploaded yet.</p>
          <button onClick={() => navigate('/upload')} className="btn-primary text-sm">Upload Dataset</button>
        </div>
      )}

      {uploadMeta && (
        <>
          <div className="glass-card p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-semibold text-slate-200">Pipeline Steps</h2>
                <p className="text-xs text-slate-500 mt-0.5">Source: {uploadMeta.filename} · {uploadMeta.row_count.toLocaleString()} rows</p>
              </div>
              <button
                onClick={handleRun}
                disabled={running}
                className="btn-primary flex items-center gap-2 text-sm"
              >
                {running ? (
                  <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Running…</>
                ) : (
                  <><Play size={16} /> Run Preprocessing</>
                )}
              </button>
            </div>

            <div className="space-y-2">
              {[
                'Remove duplicate observations',
                'Parse and validate timestamps',
                'Validate latitude values [-90, 90]',
                'Validate longitude values [-180, 180]',
                'Validate speed values [0, 300] km/h',
                'Remove trajectories with < 2 observations',
                'Sort observations by vehicle and time',
              ].map((step, i) => (
                <div key={i} className="flex items-center gap-3 text-sm p-2.5 rounded-lg bg-navy-900/40">
                  <span className="w-6 h-6 rounded-full bg-blue-600/20 border border-blue-500/30 text-blue-400 text-xs font-bold flex items-center justify-center flex-shrink-0">
                    {i + 1}
                  </span>
                  <span className="text-slate-300">{step}</span>
                  {report && (
                    <CheckCircle size={14} className="text-emerald-400 ml-auto" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {error && (
            <div className="glass-card p-4 border-red-500/30 text-red-300 text-sm mb-6">{error}</div>
          )}

          {report && (
            <>
              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {[
                  { label: 'Initial Rows', value: report.initial_rows.toLocaleString(), icon: Database, color: 'text-blue-400' },
                  { label: 'Final Rows', value: report.final_rows.toLocaleString(), icon: CheckCircle, color: 'text-emerald-400' },
                  { label: 'Rows Removed', value: report.total_removed.toLocaleString(), icon: Trash2, color: 'text-amber-400' },
                  { label: 'Unique Vehicles', value: report.unique_vehicles.toLocaleString(), icon: Clock, color: 'text-cyan-400' },
                ].map(({ label, value, icon: Icon, color }) => (
                  <div key={label} className="stat-card">
                    <Icon size={18} className={`${color} mb-2`} />
                    <p className="text-xl font-bold text-slate-100">{value}</p>
                    <p className="text-xs text-slate-500">{label}</p>
                  </div>
                ))}
              </div>

              {/* Retention bar */}
              <div className="glass-card p-5 mb-6">
                <div className="flex items-center justify-between mb-2 text-sm">
                  <span className="text-slate-400">Data Retention</span>
                  <span className="font-semibold text-slate-200">{retainPct}%</span>
                </div>
                <div className="h-3 bg-navy-900 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${retainPct > 80 ? 'bg-emerald-500' : retainPct > 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                    style={{ width: `${retainPct}%` }}
                  />
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  {report.final_rows.toLocaleString()} of {report.initial_rows.toLocaleString()} rows retained after cleaning
                </p>
              </div>

              {/* Step-by-step breakdown */}
              <div className="glass-card p-6 mb-6">
                <h3 className="font-semibold text-slate-200 mb-4">Removal Breakdown</h3>
                <div className="space-y-2">
                  {report.steps.map((step, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm">
                      <span className="text-slate-400 flex-1">{step.step}</span>
                      <span className="text-slate-500 text-xs">{step.reason}</span>
                      <span className={`font-medium ${step.removed > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {step.removed > 0 ? `-${step.removed}` : '✓ 0 removed'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Preview */}
              {preview.length > 0 && (
                <div className="glass-card p-6 mb-6">
                  <h3 className="font-semibold text-slate-200 mb-4">Cleaned Data Preview (first 20 rows)</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-navy-700">
                          {previewCols.map((c) => (
                            <th key={c} className="text-left py-2 px-3 text-slate-500 font-medium whitespace-nowrap">{c}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {preview.map((row, i) => (
                          <tr key={i} className="border-b border-navy-800/50 hover:bg-navy-900/40">
                            {previewCols.map((c) => (
                              <td key={c} className="py-2 px-3 text-slate-300 whitespace-nowrap">{String(row[c] ?? '')}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <button onClick={() => navigate('/features')} className="btn-primary flex items-center gap-2 text-sm">
                Continue to Feature Extraction <ArrowRight size={16} />
              </button>
            </>
          )}
        </>
      )}
    </div>
  );
}
