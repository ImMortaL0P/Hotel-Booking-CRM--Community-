import { useState } from 'react';
import { Dashboard } from './components/Dashboard';
import { Customers } from './components/Customers';
import { Bookings } from './components/Bookings';
import { Rooms } from './components/Rooms';
import { AdminUsers } from './components/AdminUsers';
import { AdminProfile } from './components/AdminProfile';
import { Reports } from './components/Reports';
import { Hotel, Users, Calendar, Bed, UserCog, DollarSign } from 'lucide-react';

type View = 'dashboard' | 'customers' | 'bookings' | 'rooms' | 'reports' | 'admin-users' | 'profile';

export default function App() {
  const [currentView, setCurrentView] = useState<View>('dashboard');

  const handleNavigate = (view: string) => {
    setCurrentView(view as View);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Sidebar */}
      <div className="fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <Hotel className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1>HotelCRM</h1>
              <p className="text-gray-500">Management System</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4">
          <button
            onClick={() => handleNavigate('dashboard')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg mb-2 transition-colors ${
              currentView === 'dashboard'
                ? 'bg-blue-50 text-blue-600'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Hotel className="w-5 h-5" />
            <span>Dashboard</span>
          </button>

          <button
            onClick={() => handleNavigate('customers')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg mb-2 transition-colors ${
              currentView === 'customers'
                ? 'bg-blue-50 text-blue-600'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Users className="w-5 h-5" />
            <span>Customers</span>
          </button>

          <button
            onClick={() => handleNavigate('bookings')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg mb-2 transition-colors ${
              currentView === 'bookings'
                ? 'bg-blue-50 text-blue-600'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Calendar className="w-5 h-5" />
            <span>Bookings</span>
          </button>

          <button
            onClick={() => handleNavigate('reports')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg mb-2 transition-colors ${
              currentView === 'reports'
                ? 'bg-blue-50 text-blue-600'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            <DollarSign className="w-5 h-5" />
            <span>Reports</span>
          </button>

          <button
            onClick={() => handleNavigate('rooms')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg mb-2 transition-colors ${
              currentView === 'rooms'
                ? 'bg-blue-50 text-blue-600'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Bed className="w-5 h-5" />
            <span>Rooms</span>
          </button>

          <button
            onClick={() => setCurrentView('admin-users')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg mb-2 transition-colors ${
              currentView === 'admin-users'
                ? 'bg-blue-50 text-blue-600'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            <UserCog className="w-5 h-5" />
            <span>Admin Users</span>
          </button>

          <button
            onClick={() => setCurrentView('profile')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg mb-2 transition-colors ${
              currentView === 'profile'
                ? 'bg-blue-50 text-blue-600'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            <UserCog className="w-5 h-5" />
            <span>Profile</span>
          </button>
        </nav>

        <div className="p-4 border-t border-gray-200">
          <button 
            onClick={() => setCurrentView('profile')}
            className="flex items-center gap-3 px-4 py-3 w-full hover:bg-gray-50 rounded-lg transition-colors"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white">
              AS
            </div>
            <div className="text-left">
              <p>Admin User</p>
              <p className="text-gray-500">admin@hotel.com</p>
            </div>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="ml-64 p-8">
        {currentView === 'dashboard' && <Dashboard onNavigate={handleNavigate} />}
        {currentView === 'customers' && <Customers />}
        {currentView === 'bookings' && <Bookings />}
        {currentView === 'rooms' && <Rooms />}
        {currentView === 'reports' && <Reports />}
        {currentView === 'admin-users' && <AdminUsers />}
        {currentView === 'profile' && <AdminProfile onBack={() => setCurrentView('dashboard')} />}
      </div>
    </div>
  );
}