// Shared TypeScript types

export interface UploadMeta {
  filename: string;
  size_bytes: number;
  row_count: number;
  col_count: number;
  columns: string[];
  auto_col_map: Record<string, string>;
}

export interface ValidationReport {
  valid: boolean;
  errors: string[];
  warnings: string[];
  row_count: number;
  col_count: number;
  missing_values: Record<string, number>;
  duplicate_rows: number;
  invalid_lat: number;
  invalid_lon: number;
  invalid_speed: number;
  detected_columns: string[];
}

export interface PreprocessStep {
  step: string;
  removed: number;
  nullified?: number;
  reason: string;
}

export interface PreprocessReport {
  initial_rows: number;
  final_rows: number;
  total_removed: number;
  unique_vehicles: number;
  steps: PreprocessStep[];
  removed_breakdown: Record<string, number>;
}

export interface ClusterMetrics {
  n_clusters: number;
  n_noise: number;
  noise_pct: number;
  silhouette_score: number | null;
  davies_bouldin_index: number | null;
  calinski_harabasz_score: number | null;
  inertia?: number;
  cluster_sizes: Record<string, number>;
}

export interface ClusterInfo {
  cluster_id: number;
  is_noise: boolean;
  n_trajectories: number;
  pct_total: number;
  avg_path_length_km: number | null;
  avg_displacement_km: number | null;
  avg_duration_seconds: number | null;
  avg_speed_kmh: number | null;
  avg_start_lat: number | null;
  avg_start_lon: number | null;
  avg_end_lat: number | null;
  avg_end_lon: number | null;
  vehicle_ids: string[];
}

export interface TrajectoryPoint {
  vehicle_id: string;
  points: [number, number][];
  timestamps: string[];
  speeds: number[];
  kmeans_cluster?: number;
  dbscan_cluster?: number;
  path_length_km?: number;
  displacement_km?: number;
  duration_seconds?: number;
  mean_speed_kmh?: number;
  point_count?: number;
}

export interface MapData {
  trajectories: TrajectoryPoint[];
  metrics: ClusterMetrics;
  label_col: string;
}

export type AlgoType = 'kmeans' | 'dbscan';
