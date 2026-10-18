import { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router';
import { useData } from './data/DataContext';
import { StaffSignIn } from './pages/StaffSignIn';
import { AppShell } from './components/AppShell';
import { Toaster } from 'sonner';
import { ContentAwareCursor } from './components/ContentAwareCursor';
import { CustomerBookingPage } from './pages/CustomerBookingPage';

const Dashboard = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const Bookings = lazy(() => import('./pages/Bookings').then(m => ({ default: m.Bookings })));
const GuestProfiles = lazy(() => import('./pages/GuestProfiles').then(m => ({ default: m.GuestProfiles })));
const Rooms = lazy(() => import('./pages/Rooms').then(m => ({ default: m.Rooms })));
const Calendar = lazy(() => import('./pages/Calendar').then(m => ({ default: m.Calendar })));
const Communications = lazy(() => import('./pages/Communications').then(m => ({ default: m.Communications })));
const Payments = lazy(() => import('./pages/Payments').then(m => ({ default: m.Payments })));
const Checkout = lazy(() => import('./pages/Checkout').then(m => ({ default: m.Checkout })));
const InvoiceGenerator = lazy(() => import('./pages/InvoiceGenerator').then(m => ({ default: m.InvoiceGenerator })));
const Expenses = lazy(() => import('./pages/Expenses').then(m => ({ default: m.Expenses })));
const EmailImport = lazy(() => import('./pages/EmailImport').then(m => ({ default: m.EmailImport })));
const Logs = lazy(() => import('./pages/Logs').then(m => ({ default: m.Logs })));
const ChannelSettings = lazy(() => import('./components/ChannelSettings').then(m => ({ default: m.ChannelSettings })));

// Lightweight non-blocking route fallback to prevent layout thrashing
const CrmTabLoading = () => (
  <div className="w-full min-h-[300px] flex flex-col items-center justify-center opacity-70">
    <div className="w-6 h-6 border-2 border-primary/25 border-t-primary rounded-full animate-spin mb-2.5" />
    <span className="text-[10.5px] font-mono uppercase tracking-widest text-muted-foreground font-semibold">Updating View...</span>
  </div>
);

function AuthenticatedLayout() {
  // Background pre-warm all CRM chunks so navigation is instant 0ms
  useEffect(() => {
    const prefetch = () => {
      import('./pages/Dashboard');
      import('./pages/Bookings');
      import('./pages/GuestProfiles');
      import('./pages/Rooms');
      import('./pages/Calendar');
      import('./pages/Communications');
      import('./pages/Payments');
      import('./pages/Checkout');
      import('./pages/InvoiceGenerator');
      import('./pages/Expenses');
      import('./pages/Logs');
    };

    if (typeof window !== 'undefined') {
      if ('requestIdleCallback' in window) {
        (window as any).requestIdleCallback(prefetch);
      } else {
        setTimeout(prefetch, 100);
      }
    }
  }, []);

  return (
    <AppShell>
      <Suspense fallback={<CrmTabLoading />}>
        <Outlet />
      </Suspense>
    </AppShell>
  );
}

export default function App() {
  const { user } = useData();

  return (
    <BrowserRouter>
      {/* Content-Aware Fluid Smooth Cursor */}
      <ContentAwareCursor />
      <Toaster />

      <Routes>
        {/* Public customer booking routes - accessible directly without staff login */}
        <Route path="/book" element={<CustomerBookingPage />} />
        <Route path="/reserve" element={<CustomerBookingPage />} />
        <Route path="/booking-request" element={<CustomerBookingPage />} />

        {/* Public Staff Auth routes */}
        <Route path="/login" element={!user ? <StaffSignIn /> : <Navigate to="/dashboard" replace />} />
        <Route path="/" element={!user ? <StaffSignIn /> : <Navigate to="/dashboard" replace />} />

        {/* Authenticated Staff Routes wrapped in persistent AppShell */}
        <Route element={user ? <AuthenticatedLayout /> : <Navigate to="/login" replace />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/bookings" element={<Bookings />} />
          <Route path="/guests" element={<GuestProfiles />} />
          <Route path="/rooms" element={<Rooms />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/communications" element={<Communications />} />
          <Route path="/payments" element={<Payments />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/invoices" element={<InvoiceGenerator />} />
          <Route path="/expenses" element={<Expenses />} />
          <Route path="/channel-settings" element={<ChannelSettings />} />
          <Route path="/email-import" element={<EmailImport />} />
          <Route path="/logs" element={<Logs />} />
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to={user ? "/dashboard" : "/login"} replace />} />
      </Routes>
    </BrowserRouter>
  );
}
