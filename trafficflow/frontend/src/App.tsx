import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './hooks/useAppContext';
import AppLayout from './layouts/AppLayout';
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import UploadPage from './pages/UploadPage';
import PreprocessPage from './pages/PreprocessPage';
import FeaturesPage from './pages/FeaturesPage';
import ModelPage from './pages/ModelPage';
import MapPage from './pages/MapPage';
import ClusterAnalysisPage from './pages/ClusterAnalysisPage';
import ResultsPage from './pages/ResultsPage';

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/upload" element={<UploadPage />} />
            <Route path="/preprocess" element={<PreprocessPage />} />
            <Route path="/features" element={<FeaturesPage />} />
            <Route path="/model" element={<ModelPage />} />
            <Route path="/map" element={<MapPage />} />
            <Route path="/clusters" element={<ClusterAnalysisPage />} />
            <Route path="/results" element={<ResultsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}
