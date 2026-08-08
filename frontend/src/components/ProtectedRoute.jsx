import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../utils/authContext';

export default function ProtectedRoute({ children }) {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
