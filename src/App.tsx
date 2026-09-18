import React, { Suspense, lazy } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import { QueryProvider } from './providers/QueryProvider';
import { ContactSite } from './components/public/ContactSite';
import { useAuth } from './hooks/useAuth';
import { Alert, AlertDescription } from './components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { Toaster } from './components/ui/sonner';
import { ErrorBoundary } from './components/ErrorBoundary';
import { RootErrorFallback } from './components/ErrorFallbacks';
import { reportError } from './lib/monitoring/sentry';

// Only the public contact page ships in the entry chunk. Every other route
// loads on demand so visitors to `/` never download the portals.
const FamilyOnboarding = lazy(() =>
  import('./components/onboarding/FamilyOnboarding').then((m) => ({
    default: m.FamilyOnboarding,
  })),
);
const DashboardV2 = lazy(() =>
  import('./components/DashboardV2').then((m) => ({ default: m.DashboardV2 })),
);
const AdminDashboardV2 = lazy(() =>
  import('./components/AdminDashboardV2').then((m) => ({
    default: m.AdminDashboardV2,
  })),
);
const PortalLoginPage = lazy(() =>
  import('./components/public/PortalLoginPage').then((m) => ({
    default: m.PortalLoginPage,
  })),
);
const AuthCallback = lazy(() =>
  import('./components/AuthCallback').then((m) => ({
    default: m.AuthCallback,
  })),
);
const BookingPage = lazy(() =>
  import('./pages/BookingPage').then((m) => ({ default: m.BookingPage })),
);
const ConfirmPage = lazy(() =>
  import('./pages/ConfirmPage').then((m) => ({ default: m.ConfirmPage })),
);
const PrivacyPage = lazy(() =>
  import('./pages/PrivacyPage').then((m) => ({ default: m.PrivacyPage })),
);
const TermsPage = lazy(() =>
  import('./pages/TermsPage').then((m) => ({ default: m.TermsPage })),
);

function RouteLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}

function ProtectedRoute({
  children,
  user,
  loading,
  accessState,
  requireAdmin = false,
}: {
  children: React.ReactNode;
  user: ReturnType<typeof useAuth>['user'];
  loading: ReturnType<typeof useAuth>['loading'];
  accessState: ReturnType<typeof useAuth>['accessState'];
  requireAdmin?: boolean;
}) {
  const location = useLocation();

  if (loading) {
    return <RouteLoading />;
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (accessState === 'blocked') {
    return <Navigate to="/" replace />;
  }

  if (
    accessState === 'needs_onboarding' &&
    location.pathname !== '/onboarding'
  ) {
    return <Navigate to="/onboarding" replace />;
  }

  if (requireAdmin && user.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  const {
    user,
    loading,
    accessState,
    accessMessage,
    signOut,
    refreshUser,
    isOwner,
  } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
  };

  // Redirect logged-in users from public home or auth callback to onboarding/dashboard.
  if (
    user &&
    (location.pathname === '/' ||
      location.pathname === '/auth/callback' ||
      location.pathname === '/portal')
  ) {
    if (accessState === 'needs_onboarding') {
      return <Navigate to="/onboarding" replace />;
    }
    return (
      <Navigate to={user.role === 'admin' ? '/admin' : '/dashboard'} replace />
    );
  }

  // Public route renders immediately; protected routes show loading via ProtectedRoute
  return (
    <Suspense fallback={<RouteLoading />}>
      <Routes>
        <Route
          path="/*"
          element={
            <>
              {accessMessage && (
                <div className="max-w-3xl mx-auto mt-6 px-4">
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{accessMessage}</AlertDescription>
                  </Alert>
                </div>
              )}
              <ContactSite />
            </>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute
              user={user}
              loading={loading}
              accessState={accessState}
            >
              {user?.role === 'admin' ? (
                <Navigate to="/admin" replace />
              ) : user ? (
                <DashboardV2
                  user={user}
                  onLogout={handleLogout}
                  onRefreshUser={refreshUser}
                />
              ) : null}
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute
              user={user}
              loading={loading}
              accessState={accessState}
              requireAdmin
            >
              {user && (
                <AdminDashboardV2
                  user={user}
                  onLogout={handleLogout}
                  onRefreshUser={refreshUser}
                  isOwner={isOwner}
                />
              )}
            </ProtectedRoute>
          }
        />
        <Route
          path="/onboarding"
          element={
            <ProtectedRoute
              user={user}
              loading={loading}
              accessState={accessState}
            >
              {user?.role === 'family' ? (
                <FamilyOnboarding
                  user={user}
                  onComplete={async () => {
                    await refreshUser();
                    navigate('/dashboard');
                  }}
                  onLogout={handleLogout}
                />
              ) : (
                <Navigate to="/dashboard" replace />
              )}
            </ProtectedRoute>
          }
        />
        <Route path="/portal" element={<PortalLoginPage />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/book/:token" element={<BookingPage />} />
        <Route path="/confirm/:token" element={<ConfirmPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <QueryProvider>
      <BrowserRouter>
        <ErrorBoundary
          fallback={() => <RootErrorFallback />}
          onError={reportError}
        >
          <AppRoutes />
        </ErrorBoundary>
        <Toaster richColors position="top-right" />
      </BrowserRouter>
    </QueryProvider>
  );
}
