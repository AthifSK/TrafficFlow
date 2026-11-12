import React, { createContext, useContext, useState, ReactNode } from 'react';
import type { UploadMeta, PreprocessReport, ClusterMetrics, AlgoType } from '../types';

interface AppState {
  uploadMeta: UploadMeta | null;
  colMap: Record<string, string>;
  preprocessReport: PreprocessReport | null;
  featuresReady: boolean;
  kmeansTrained: boolean;
  dbscanTrained: boolean;
  activeAlgo: AlgoType;
  kmeansClusters: number;
  setUploadMeta: (m: UploadMeta | null) => void;
  setColMap: (m: Record<string, string>) => void;
  setPreprocessReport: (r: PreprocessReport | null) => void;
  setFeaturesReady: (b: boolean) => void;
  setKmeansTrained: (b: boolean) => void;
  setDbscanTrained: (b: boolean) => void;
  setActiveAlgo: (a: AlgoType) => void;
  setKmeansClusters: (n: number) => void;
}

const AppContext = createContext<AppState | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [uploadMeta, setUploadMeta] = useState<UploadMeta | null>(null);
  const [colMap, setColMap] = useState<Record<string, string>>({});
  const [preprocessReport, setPreprocessReport] = useState<PreprocessReport | null>(null);
  const [featuresReady, setFeaturesReady] = useState(false);
  const [kmeansTrained, setKmeansTrained] = useState(false);
  const [dbscanTrained, setDbscanTrained] = useState(false);
  const [activeAlgo, setActiveAlgo] = useState<AlgoType>('kmeans');
  const [kmeansClusters, setKmeansClusters] = useState(4);

  return (
    <AppContext.Provider value={{
      uploadMeta, colMap, preprocessReport, featuresReady,
      kmeansTrained, dbscanTrained, activeAlgo, kmeansClusters,
      setUploadMeta, setColMap, setPreprocessReport, setFeaturesReady,
      setKmeansTrained, setDbscanTrained, setActiveAlgo, setKmeansClusters,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
