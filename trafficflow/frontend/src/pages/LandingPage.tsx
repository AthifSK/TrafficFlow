import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity, Upload, Cpu, Map, BarChart3, ArrowRight,
  GitBranch, Layers, FileText, Shield, Zap, Globe
} from 'lucide-react';

const features = [
  { icon: Upload, title: 'Flexible CSV Upload', desc: 'Accepts any vehicle observation dataset with configurable column mapping and built-in validation.' },
  { icon: Cpu, title: 'Smart Preprocessing', desc: 'Automatically cleans, deduplicates, validates coordinates, and constructs vehicle trajectories.' },
  { icon: GitBranch, title: 'Feature Engineering', desc: 'Extracts 15+ trajectory features including path distance, displacement, speed, bearing, and heading.' },
  { icon: Layers, title: 'Dual Clustering', desc: 'K-Means for partitioned clusters and DBSCAN for density-based detection with automatic noise identification.' },
  { icon: Map, title: 'Interactive Map', desc: 'Visualize cluster-colored trajectories on OpenStreetMap with click-through vehicle details.' },
  { icon: BarChart3, title: 'Comparative Analytics', desc: 'Side-by-side algorithm comparison with Silhouette Score, Davies-Bouldin, and Calinski-Harabasz metrics.' },
];

const pipeline = [
  'CSV Upload', 'Validation', 'Preprocessing', 'Trajectory Construction',
  'Feature Extraction', 'Feature Scaling', 'Clustering', 'Evaluation',
  'Map Visualization', 'Reports & Export'
];

const algorithms = [
  {
    name: 'K-Means',
    color: 'from-blue-500 to-blue-700',
    badge: 'Partitioning',
    desc: 'Groups trajectories into K clusters by minimizing within-cluster variance. Configurable cluster count, random state, and automatic feature scaling.',
    pros: ['Deterministic output', 'Fast on large datasets', 'Native predict() for new data'],
  },
  {
    name: 'DBSCAN',
    color: 'from-violet-500 to-violet-700',
    badge: 'Density-based',
    desc: 'Discovers arbitrarily-shaped clusters and isolates noise/outlier trajectories using density reachability with configurable ε and min_samples.',
    pros: ['No preset cluster count', 'Identifies outliers', 'Finds non-convex shapes'],
  },
];

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-navy-950 text-slate-100">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-navy-950/80 backdrop-blur-md border-b border-navy-800">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold gradient-text">TrafficFlow</span>
          </div>
          <div className="flex items-center gap-4">
            <a href="#features" className="text-slate-400 hover:text-slate-200 text-sm transition-colors">Features</a>
            <a href="#algorithms" className="text-slate-400 hover:text-slate-200 text-sm transition-colors">Algorithms</a>
            <a href="#architecture" className="text-slate-400 hover:text-slate-200 text-sm transition-colors">Architecture</a>
            <button onClick={() => navigate('/dashboard')} className="btn-primary text-sm py-2 px-4">
              Open Dashboard
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden px-6 pt-28 pb-24 max-w-7xl mx-auto text-center">
        {/* Glow */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-3xl" />
        </div>
        <div className="relative">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-6">
            <Zap className="w-3.5 h-3.5" />
            Unsupervised Machine Learning · City Traffic Intelligence
          </span>
          <h1 className="text-5xl md:text-7xl font-extrabold mb-6 leading-tight">
            Understand City-Wide<br />
            <span className="gradient-text">Vehicle Movement Patterns</span>
          </h1>
          <p className="text-xl text-slate-400 max-w-3xl mx-auto mb-10 leading-relaxed">
            TrafficFlow uses unsupervised clustering to automatically discover recurring vehicle
            trajectory patterns from ANPR and CCTV camera data — without any pre-labelled training data.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => navigate('/upload')}
              className="btn-primary flex items-center gap-2 justify-center text-base px-8 py-3"
            >
              Get Started <ArrowRight className="w-5 h-5" />
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="btn-secondary flex items-center gap-2 justify-center text-base px-8 py-3"
            >
              View Dashboard
            </button>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="px-6 py-20 max-w-7xl mx-auto" id="architecture">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-3">How TrafficFlow Works</h2>
          <p className="text-slate-400 max-w-2xl mx-auto">
            A complete end-to-end ML pipeline from raw CSV observations to interactive cluster visualizations.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          {pipeline.map((step, i) => (
            <div key={step} className="flex items-center gap-2">
              <div className="flex items-center gap-2 glass-card px-4 py-2.5">
                <span className="w-6 h-6 rounded-full bg-blue-600/20 text-blue-400 text-xs font-bold flex items-center justify-center border border-blue-500/30">
                  {i + 1}
                </span>
                <span className="text-sm font-medium text-slate-200">{step}</span>
              </div>
              {i < pipeline.length - 1 && <ArrowRight className="w-4 h-4 text-slate-600 flex-shrink-0" />}
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="px-6 py-20 max-w-7xl mx-auto" id="features">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-3">Key Features</h2>
          <p className="text-slate-400 max-w-2xl mx-auto">
            Everything you need to analyze vehicle movement patterns at a city scale.
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="glass-card p-6 hover:border-blue-500/30 transition-all group">
              <div className="w-10 h-10 rounded-lg bg-blue-600/10 border border-blue-500/20 flex items-center justify-center mb-4 group-hover:bg-blue-600/20 transition-colors">
                <Icon className="w-5 h-5 text-blue-400" />
              </div>
              <h3 className="font-semibold text-slate-100 mb-2">{title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Algorithms */}
      <section className="px-6 py-20 max-w-7xl mx-auto" id="algorithms">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-3">Clustering Algorithms</h2>
          <p className="text-slate-400 max-w-2xl mx-auto">
            Two complementary approaches to discover vehicle movement patterns.
          </p>
        </div>
        <div className="grid md:grid-cols-2 gap-8">
          {algorithms.map((algo) => (
            <div key={algo.name} className="glass-card p-8 hover:border-blue-500/30 transition-all">
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${algo.color} flex items-center justify-center shadow-lg`}>
                  <Activity className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">{algo.name}</h3>
                  <span className="badge bg-navy-700 text-slate-400">{algo.badge}</span>
                </div>
              </div>
              <p className="text-slate-400 text-sm mb-5 leading-relaxed">{algo.desc}</p>
              <ul className="space-y-2">
                {algo.pros.map((p) => (
                  <li key={p} className="flex items-center gap-2 text-sm text-slate-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-20 max-w-7xl mx-auto text-center">
        <div className="glass-card p-12 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 to-cyan-600/5" />
          <div className="relative">
            <Globe className="w-12 h-12 text-blue-400 mx-auto mb-4" />
            <h2 className="text-3xl font-bold mb-3">Ready to Analyze Traffic Patterns?</h2>
            <p className="text-slate-400 mb-8 max-w-xl mx-auto">
              Upload your vehicle observation dataset and let TrafficFlow discover hidden movement patterns automatically.
            </p>
            <button onClick={() => navigate('/upload')} className="btn-primary flex items-center gap-2 mx-auto text-base px-8 py-3">
              Upload Dataset <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-navy-800 px-6 py-8 text-center text-slate-500 text-sm">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Activity className="w-4 h-4 text-blue-500" />
          <span className="font-semibold text-slate-400">TrafficFlow</span>
        </div>
        <p>City-Wide Vehicle Trajectory Clustering Platform · Powered by K-Means & DBSCAN · Built with FastAPI + React</p>
      </footer>
    </div>
  );
}
