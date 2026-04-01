import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { UHIProvider } from '../context/UHIContext.jsx';
import AppShell from '../layout/AppShell.jsx';
import LandingPage from '../pages/Landing/LandingPage.jsx';
import DashboardPage from '../pages/Dashboard/DashboardPage.jsx';
import ReportsPage from '../pages/Reports/ReportsPage.jsx';
import EnginePage from '../pages/Engine/EnginePage.jsx';

import LoadingScreen from '../components/LoadingScreen.jsx';

function RouteController() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/engine" element={<EnginePage />} />
      </Routes>
    </AnimatePresence>
  );
}

export default function App() {
  const [appMounted, setAppMounted] = useState(false);

  return (
    <>
      <AnimatePresence>
        {!appMounted && <LoadingScreen key="boot-loader" onComplete={() => setAppMounted(true)} />}
      </AnimatePresence>
      
      <div style={{ opacity: appMounted ? 1 : 0, transition: 'opacity 0.5s ease-in' }} className="w-full h-full absolute inset-0">
        <BrowserRouter>
          <UHIProvider>
            <AppShell>
              <RouteController />
            </AppShell>
          </UHIProvider>
        </BrowserRouter>
      </div>
    </>
  );
}
