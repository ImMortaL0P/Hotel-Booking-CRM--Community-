import { Suspense, lazy } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router';
import { useData } from './data/DataContext';
import { StaffSignIn } from './pages/StaffSignIn';
import { AppShell } from './components/AppShell';
import { Toaster } from 'sonner';

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
const Logs = lazy(() => import('./pages/Logs').then(m => ({ default: m.Logs })));

const LoadingFallback = () => (
  <div className="h-full flex items-center justify-center bg-background">
    <div className="relative">
      <div className="w-12 h-12 border-4 border-border rounded-full"></div>
      <div className="w-12 h-12 border-4 border-transparent border-t-primary rounded-full animate-spin absolute inset-0"></div>
    </div>
  </div>
);

export default function App() {
  const { user } = useData();

  if (!user) {
    return (
      <HashRouter>
        <StaffSignIn />
        <Toaster />
      </HashRouter>
    );
  }

  return (
    <HashRouter>
      <AppShell>
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
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
            <Route path="/logs" element={<Logs />} />
          </Routes>
        </Suspense>
      </AppShell>
      <Toaster />
    </HashRouter>
  );
}
