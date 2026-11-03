import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LandingPage } from './pages/LandingPage';
import { Login, Register, PasswordReset } from './pages/AuthPages';
import { Dashboard } from './pages/Dashboard';
import { CreateEvent } from './pages/CreateEvent';
import { TemplateEditor } from './pages/TemplateEditor';
import { ParticipantFlyerPage } from './pages/ParticipantFlyerPage';
import { AdminCRM } from './pages/AdminCRM';

const ProtectedRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F8FC] flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-[#6425E8] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  return user ? children : <Navigate to="/login" replace />;
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Visitor Pages */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/reset-password" element={<PasswordReset />} />

          {/* Public Participant Direct Sharing Route (No authentication required) */}
          <Route path="/e/:slug" element={<ParticipantFlyerPage />} />
          <Route path="/event/:slug" element={<ParticipantFlyerPage />} />
          <Route path="/flyer/:slug" element={<ParticipantFlyerPage />} />
          <Route path="/p/:slug" element={<ParticipantFlyerPage />} />

          {/* Protected Organiser Workspace Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/events"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/analytics"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/team"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/settings"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/create-event"
            element={
              <ProtectedRoute>
                <CreateEvent />
              </ProtectedRoute>
            }
          />
          <Route
            path="/editor/:eventId"
            element={
              <ProtectedRoute>
                <TemplateEditor />
              </ProtectedRoute>
            }
          />

          {/* Dedicated Platform Owner CMS / CRM & Telemetry Hub (Directly accessible to the platform owner) */}
          <Route path="/admin" element={<AdminCRM />} />
          <Route path="/crm" element={<AdminCRM />} />
          <Route path="/dashboard/admin" element={<AdminCRM />} />
          <Route path="/dashboard/crm" element={<AdminCRM />} />

          {/* Catch-all redirect to Home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
