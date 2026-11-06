import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './useAuth';
import { LoadingState } from '../../components/ui/States';

/**
 * Prepared for Task 002. Wrap private routes (prayer journal, notes) in this
 * once Supabase is connected. Client-side guards are a convenience only —
 * real protection comes from Row Level Security on the database.
 */
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <LoadingState />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <>{children}</>;
}
