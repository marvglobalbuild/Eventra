import React from 'react';
import { useAuth } from '../context/AuthContext';
import { HostDashboard } from './HostDashboard';
import { AttendeeDashboard } from './AttendeeDashboard';

export const Dashboard: React.FC = () => {
  const { isHost, activeView } = useAuth();

  // If user has not activated Host experience, or their active view preference is 'attendee', render AttendeeDashboard
  if (!isHost || activeView === 'attendee') {
    return <AttendeeDashboard />;
  }

  // Otherwise, render dedicated HostDashboard
  return <HostDashboard />;
};
