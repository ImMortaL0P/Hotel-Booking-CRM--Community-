import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import { useData } from './data/DataContext';
import { StaffSignIn } from './pages/StaffSignIn';
import { AppShell } from './components/AppShell';
import { Dashboard } from './pages/Dashboard';
import { Bookings } from './pages/Bookings';
import { GuestProfiles } from './pages/GuestProfiles';
import { Rooms } from './pages/Rooms';
import { Calendar } from './pages/Calendar';
import { Communications } from './pages/Communications';
import { Payments } from './pages/Payments';
import { Toaster } from 'sonner';

export default function App() {
  const { user } = useData();

  if (!user) {
    return (
      <BrowserRouter>
        <StaffSignIn />
        <Toaster />
      </BrowserRouter>
    );
  }

  return (
    <BrowserRouter>
      <AppShell>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/bookings" element={<Bookings />} />
          <Route path="/guests" element={<GuestProfiles />} />
          <Route path="/rooms" element={<Rooms />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/communications" element={<Communications />} />
          <Route path="/payments" element={<Payments />} />
        </Routes>
      </AppShell>
      <Toaster />
    </BrowserRouter>
  );
}
