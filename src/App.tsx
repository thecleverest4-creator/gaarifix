import { useEffect } from 'react';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { RouterProvider, useRouter, matchPath } from '@/context/RouterContext';
import { FullPageSpinner } from '@/components/Spinner';
import { HomePage } from '@/pages/HomePage';
import { LoginPage, SignupPage } from '@/pages/AuthPages';
import { CustomerDashboard } from '@/pages/CustomerDashboard';
import { BookingPage } from '@/pages/BookingPage';
import { BookingDetailPage } from '@/pages/BookingDetailPage';
import { MechanicRegisterPage } from '@/pages/MechanicRegisterPage';
import { MechanicDashboard } from '@/pages/MechanicDashboard';
import { MechanicBookingDetailPage } from '@/pages/MechanicBookingDetailPage';
import { AdminDashboard } from '@/pages/AdminDashboard';

function AppRoutes() {
  const { profile, loading } = useAuth();
  const { path, navigate } = useRouter();

  // While the initial auth/session check is running, show a loading state.
  if (loading) return <FullPageSpinner label="Loading MechanicMate…" />;

  const role = profile?.role ?? null;

  // Helper to guard a route for a specific role
  const guard = (allowed: ('customer' | 'mechanic' | 'admin')[], element: React.ReactNode): React.ReactNode => {
    if (!profile) {
      navigate('/login');
      return <FullPageSpinner />;
    }
    if (!allowed.includes(role as 'customer' | 'mechanic' | 'admin')) {
      navigate('/');
      return <FullPageSpinner />;
    }
    return element;
  };

  // Public routes
  if (path === '/' || path === '') return <HomePage />;
  if (path === '/login') {
    if (profile) {
      navigate(role === 'admin' ? '/admin' : role === 'mechanic' ? '/mechanic/dashboard' : '/dashboard');
      return <FullPageSpinner />;
    }
    return <LoginPage />;
  }
  if (path === '/signup') {
    if (profile) {
      navigate(role === 'admin' ? '/admin' : role === 'mechanic' ? '/mechanic/dashboard' : '/dashboard');
      return <FullPageSpinner />;
    }
    return <SignupPage />;
  }
  if (path === '/mechanic/register') {
    // Anyone can register as a mechanic; if already a mechanic, send to dashboard
    if (role === 'mechanic') {
      navigate('/mechanic/dashboard');
      return <FullPageSpinner />;
    }
    return <MechanicRegisterPage />;
  }

  // Customer routes
  if (path === '/dashboard' || path === '/dashboard/vehicles' || path === '/dashboard/bookings' || path === '/dashboard/profile') {
    return guard(['customer'], <CustomerDashboard />);
  }
  if (path === '/book') {
    return guard(['customer'], <BookingPage />);
  }
  const customerBookingMatch = matchPath('/bookings/:id', path);
  if (customerBookingMatch) {
    return guard(['customer'], <BookingDetailPage bookingId={customerBookingMatch.id} />);
  }

  // Mechanic routes
  if (path === '/mechanic/dashboard' || path.startsWith('/mechanic/dashboard/')) {
    return guard(['mechanic'], <MechanicDashboard />);
  }
  const mechanicBookingMatch = matchPath('/mechanic/bookings/:id', path);
  if (mechanicBookingMatch) {
    return guard(['mechanic'], <MechanicBookingDetailPage bookingId={mechanicBookingMatch.id} />);
  }

  // Admin routes
  if (path === '/admin' || path.startsWith('/admin/')) {
    return guard(['admin'], <AdminDashboard />);
  }

  // Fallback — unknown route
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4">
      <h1 className="text-2xl font-bold text-navy-700">Page not found</h1>
      <p className="mt-2 text-sm text-navy-400">The page you're looking for doesn't exist.</p>
      <button onClick={() => navigate('/')} className="mt-6 btn-primary">Back to home</button>
    </div>
  );
}

export default function App() {
  return (
    <RouterProvider>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </RouterProvider>
  );
}
