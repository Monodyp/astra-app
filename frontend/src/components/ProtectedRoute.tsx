import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import type { Role } from '../data/index.js';
import { loginPathFor } from './portal/access.js';
import { AccessDenied } from './portal/AccessDenied.js';
import { LoadingState } from './portal/StatusViews.js';

export const ProtectedRoute: React.FC<{
  children: React.ReactElement;
  role?: Role;
}> = ({ children, role }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingState label="Restoring your session" />;
  }
  if (!user) {
    return <Navigate to={loginPathFor(location)} replace />;
  }
  if (role && user.role !== role) {
    return <AccessDenied />;
  }
  return children;
};
