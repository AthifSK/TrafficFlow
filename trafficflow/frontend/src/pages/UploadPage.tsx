import React, { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, FileText, AlertCircle, CheckCircle, XCircle, ArrowRight, ChevronDown } from 'lucide-react';
import { uploadCSV, validateDataset, updateColMap } from '../services/api';
import { useApp } from '../hooks/useAppContext';
import type { UploadMeta, ValidationReport } from '../types';

const CANONICAL_COLS = ['vehicle_id', 'timestamp_utc', 'latitude', 'longitude', 'speed_kmh', 'heading_deg', 'camera_id', 'camera_name', 'vehicle_type'];
const REQUIRED = new Set(['vehicle_id', 'timestamp_utc', 'latitude', 'longitude']);

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

export default function UploadPage() {
  const navigate = useNavigate();
  const { setUploadMeta, setColMap: setCtxColMap } = useApp();
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [meta, setMeta] = useState<UploadMeta | null>(null);
  const [colMap, setColMap] = useState<Record<string, string>>({});
  const [validation, setValidation] = useState<ValidationReport | null>(null);
  const [validating, setValidating] = useState(false);
  const [preview, setPreview] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.endsWith('.csv')) { setError('Please upload a CSV file.'); return; }
    setError(null);
    setValidation(null);
    setUploading(true);
    try {
      const res = await uploadCSV(file);
      const data = res.data;
      setMeta(data);
      setUploadMeta(data);
      setColMap(data.auto_col_map || {});
      setCtxColMap(data.auto_col_map || {});
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Upload failed.');
    } finally {
      setUploading(false);
    }
  }, [setUploadMeta, setCtxColMap]);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleValidate = async () => {
    if (!meta) return;
    setValidating(true);
    try {
      const res = await validateDataset(colMap);
      setValidation(res.data);
      await updateColMap(colMap);
      setCtxColMap(colMap);
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Validation failed.');
    } finally {
      setValidating(false);
    }
  };

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Upload Dataset</h1>
        <p className="text-slate-400">Upload your vehicle observation CSV. Configure column mapping if needed, then validate before preprocessing.</p>
      </div>

      {/* Drop zone */}
      <div
        className={`glass-card border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all mb-6 ${
          dragging ? 'border-blue-500 bg-blue-500/5' : 'border-navy-600 hover:border-blue-500/50 hover:bg-navy-800/60'
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => fileRef.current?.click()}
      >
        <input
          ref={fileRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }}
        />
        {uploading ? (
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-slate-400">Uploading…</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
              <Upload className="w-8 h-8 text-blue-400" />
            </div>
            <div>
              <p className="text-lg font-semibold text-slate-200">Drop your CSV file here</p>
              <p className="text-slate-500 text-sm mt-1">or click to browse · Max 100 MB</p>
            </div>
            <div className="text-xs text-slate-600 max-w-md">
              Required columns: vehicle_id, timestamp_utc, latitude, longitude
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="glass-card p-4 border-red-500/30 flex items-start gap-3 mb-6">
          <XCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-red-300 text-sm">{error}</p>
        </div>
      )}

      {meta && (
        <>
          {/* File meta */}
          <div className="glass-card p-6 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <FileText className="w-5 h-5 text-blue-400" />
              <h2 className="font-semibold text-slate-200">File Information</h2>
              <span className="ml-auto badge bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Uploaded</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              {[
                { label: 'Filename', value: meta.filename },
                { label: 'Size', value: formatBytes(meta.size_bytes) },
                { label: 'Rows', value: meta.row_count.toLocaleString() },
                { label: 'Columns', value: meta.col_count },
              ].map(({ label, value }) => (
                <div key={label} className="bg-navy-900/60 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-1">{label}</p>
                  <p className="font-medium text-slate-200 truncate">{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Column mapping */}
          <div className="glass-card p-6 mb-6">
            <h2 className="font-semibold text-slate-200 mb-1">Column Mapping</h2>
            <p className="text-xs text-slate-500 mb-4">Map your dataset's column names to the canonical field names. Required fields are marked with *.</p>
            <div className="grid md:grid-cols-2 gap-3">
              {CANONICAL_COLS.map((canon) => (
                <div key={canon} className="flex items-center gap-3">
                  <label className="text-sm text-slate-300 w-40 flex-shrink-0">
                    {canon}{REQUIRED.has(canon) && <span className="text-red-400 ml-0.5">*</span>}
                  </label>
                  <div className="relative flex-1">
                    <select
                      className="input-field pr-8 appearance-none text-sm"
                      value={colMap[canon] || ''}
                      onChange={(e) => setColMap(m => ({ ...m, [canon]: e.target.value }))}
                    >
                      <option value="">— not mapped —</option>
                      {meta.columns.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              ))}
            </div>
            <button onClick={handleValidate} disabled={validating} className="btn-primary mt-5 flex items-center gap-2 text-sm">
              {validating ? (
                <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Validating…</>
              ) : (
                <><CheckCircle size={16} /> Validate Dataset</>
              )}
            </button>
          </div>

          {/* Validation report */}
          {validation && (
            <div className={`glass-card p-6 mb-6 border ${validation.valid ? 'border-emerald-500/30' : 'border-red-500/30'}`}>
              <div className="flex items-center gap-3 mb-4">
                {validation.valid
                  ? <CheckCircle className="w-5 h-5 text-emerald-400" />
                  : <XCircle className="w-5 h-5 text-red-400" />}
                <h2 className="font-semibold">
                  {validation.valid ? 'Validation Passed' : 'Validation Failed'}
                </h2>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 text-sm">
                {[
                  { label: 'Total Rows', value: validation.row_count.toLocaleString() },
                  { label: 'Duplicates', value: validation.duplicate_rows, warn: validation.duplicate_rows > 0 },
                  { label: 'Invalid Lat', value: validation.invalid_lat, warn: validation.invalid_lat > 0 },
                  { label: 'Invalid Lon', value: validation.invalid_lon, warn: validation.invalid_lon > 0 },
                ].map(({ label, value, warn }) => (
                  <div key={label} className="bg-navy-900/60 rounded-lg p-3">
                    <p className="text-xs text-slate-500 mb-1">{label}</p>
                    <p className={`font-semibold ${warn ? 'text-amber-400' : 'text-slate-200'}`}>{value}</p>
                  </div>
                ))}
              </div>

              {validation.errors.length > 0 && (
                <div className="mb-3 space-y-1">
                  {validation.errors.map((e, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-red-300">
                      <XCircle size={14} className="mt-0.5 flex-shrink-0" /> {e}
                    </div>
                  ))}
                </div>
              )}
              {validation.warnings.length > 0 && (
                <div className="space-y-1">
                  {validation.warnings.map((w, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-amber-300">
                      <AlertCircle size={14} className="mt-0.5 flex-shrink-0" /> {w}
                    </div>
                  ))}
                </div>
              )}

              {validation.valid && (
                <button
                  onClick={() => navigate('/preprocess')}
                  className="btn-primary mt-5 flex items-center gap-2 text-sm"
                >
                  Continue to Preprocessing <ArrowRight size={16} />
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
