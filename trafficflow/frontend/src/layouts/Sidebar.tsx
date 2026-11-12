import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Upload, Cpu, GitBranch, Map, BarChart3, FileText,
  Activity, ChevronRight, Layers
} from 'lucide-react';
import { useApp } from '../hooks/useAppContext';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/upload', icon: Upload, label: 'Upload Dataset' },
  { to: '/preprocess', icon: Cpu, label: 'Preprocessing' },
  { to: '/features', icon: GitBranch, label: 'Feature Extraction' },
  { to: '/model', icon: Activity, label: 'ML Models' },
  { to: '/map', icon: Map, label: 'City Map' },
  { to: '/clusters', icon: Layers, label: 'Cluster Analysis' },
  { to: '/results', icon: BarChart3, label: 'Results & Reports' },
];

export default function Sidebar() {
  const { uploadMeta, preprocessReport, featuresReady, kmeansTrained, dbscanTrained } = useApp();
  const location = useLocation();

  const stepStatus = {
    '/upload': !!uploadMeta,
    '/preprocess': !!preprocessReport,
    '/features': featuresReady,
    '/model': kmeansTrained || dbscanTrained,
    '/map': kmeansTrained || dbscanTrained,
    '/clusters': kmeansTrained || dbscanTrained,
    '/results': kmeansTrained || dbscanTrained,
  } as Record<string, boolean>;

  return (
    <aside className="w-64 bg-navy-900 border-r border-navy-700/50 flex flex-col h-full">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-navy-700/50">
        <NavLink to="/" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-lg font-bold gradient-text">TrafficFlow</span>
            <p className="text-xs text-slate-500">v1.0 · ML Platform</p>
          </div>
        </NavLink>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label }) => {
          const done = stepStatus[to];
          const active = location.pathname === to;
          return (
            <NavLink
              key={to}
              to={to}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group ${
                active
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-navy-800'
              }`}
            >
              <Icon className={`w-4.5 h-4.5 flex-shrink-0 ${active ? 'text-blue-400' : 'text-slate-500 group-hover:text-slate-300'}`} size={18} />
              <span className="flex-1">{label}</span>
              {done && !active && (
                <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
              )}
              {active && (
                <ChevronRight className="w-4 h-4 text-blue-400 flex-shrink-0" />
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Status footer */}
      <div className="px-4 py-4 border-t border-navy-700/50">
        <div className="text-xs text-slate-500 space-y-1.5">
          <div className="flex items-center justify-between">
            <span>Dataset</span>
            <span className={uploadMeta ? 'text-emerald-400' : 'text-slate-600'}>
              {uploadMeta ? uploadMeta.filename.slice(0, 16) : '—'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span>Trajectories</span>
            <span className={featuresReady ? 'text-emerald-400' : 'text-slate-600'}>
              {featuresReady ? '✓ Extracted' : '—'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span>Models</span>
            <span className={(kmeansTrained || dbscanTrained) ? 'text-emerald-400' : 'text-slate-600'}>
              {kmeansTrained && dbscanTrained ? 'KM + DB' : kmeansTrained ? 'K-Means' : dbscanTrained ? 'DBSCAN' : '—'}
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}
