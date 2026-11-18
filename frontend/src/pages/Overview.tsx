import React from 'react';
import { useAuth } from '../context/AuthContext.js';

export const Overview: React.FC = () => {
  const { user } = useAuth();
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-slate-100">Overview</h2>
      <p className="text-sm text-slate-400">Welcome back, {user?.fullName}.</p>
    </div>
  );
};
