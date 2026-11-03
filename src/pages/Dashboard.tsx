import React from 'react';
import { useAuth } from '../context/AuthContext';
import { HostDashboard } from './HostDashboard';
import { AttendeeDashboard } from './AttendeeDashboard';

export const Dashboard: React.FC = () => {
  const { isHost, activeView } = useAuth();

  // If user is purely an attendee and has not activated host mode, render AttendeeDashboard
  if (!isHost && activeView === 'attendee') {
    return <AttendeeDashboard />;
  }

  // Otherwise, render dedicated HostDashboard with real-time flyer telemetry & analytics
  return <HostDashboard />;
};
