import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.js';
import { AppShell } from './components/AppShell.js';
import { ProtectedRoute } from './components/ProtectedRoute.js';
import { Login } from './pages/Login.js';
import { Home } from './pages/Home.js';
import { DigitalID } from './pages/DigitalID.js';
import { NotValid } from './pages/NotValid.js';
import { Points } from './pages/Points.js';
import { OfficerGrantPoints } from './pages/OfficerGrantPoints.js';
import { CheckIn } from './pages/CheckIn.js';
import { Marketplace } from './pages/Marketplace.js';
import { VoucherDetails } from './pages/VoucherDetails.js';
import { PartnerInstructions } from './pages/PartnerInstructions.js';
import { AstrascendLayout } from './features/astrascend/components/AstrascendLayout.js';
import { LandingPage } from './features/astrascend/pages/LandingPage.js';
import {
  RequestPage,
  SuccessPage,
  LegacyServiceRedirect,
} from './features/astrascend/pages/RequestPage.js';
import { Opportunities } from './pages/Opportunities.js';
// DevTools is only imported here; the route is registered only in DEV mode.
// Vite strips the branch in production builds via import.meta.env.DEV dead-code elimination.
import { DevTools } from './pages/DevTools.js';

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/astrascend" element={<AstrascendLayout />}>
            <Route index element={<LandingPage />} />
            <Route path="request" element={<RequestPage />} />
            <Route path="request/success" element={<SuccessPage />} />
            <Route
              path="service/:serviceId"
              element={<LegacyServiceRedirect />}
            />
          </Route>
          {/* Dev-only test page — not registered in production */}
          {import.meta.env.DEV && (
            <Route path="/dev/test" element={<DevTools />} />
          )}
          <Route element={<AppShell />}>
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Home />
                </ProtectedRoute>
              }
            />
            <Route
              path="/id"
              element={
                <ProtectedRoute>
                  <DigitalID />
                </ProtectedRoute>
              }
            />
            <Route path="/not-valid" element={<NotValid />} />
            <Route
              path="/points"
              element={
                <ProtectedRoute>
                  <Points />
                </ProtectedRoute>
              }
            />
            <Route
              path="/officer/grant-points"
              element={
                <ProtectedRoute>
                  <OfficerGrantPoints />
                </ProtectedRoute>
              }
            />
            <Route
              path="/checkin"
              element={
                <ProtectedRoute>
                  <CheckIn />
                </ProtectedRoute>
              }
            />
            <Route
              path="/marketplace"
              element={
                <ProtectedRoute>
                  <Marketplace />
                </ProtectedRoute>
              }
            />
            <Route
              path="/vouchers/:id"
              element={
                <ProtectedRoute>
                  <VoucherDetails />
                </ProtectedRoute>
              }
            />
            <Route
              path="/partner-instructions"
              element={<PartnerInstructions />}
            />
            <Route
              path="/opportunities"
              element={
                <ProtectedRoute>
                  <Opportunities />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};
