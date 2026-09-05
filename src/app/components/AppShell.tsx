import { ReactNode, useState } from 'react';
import { NavLink, useLocation } from 'react-router';
import { LayoutDashboard, BookOpenText, Users, BedDouble, CalendarDays, MessageSquare, CreditCard, LogOut, ChevronLeft, ChevronRight, Building, FileText, Receipt, History } from 'lucide-react';
import { useData } from '../data/DataContext';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import logoUrl from '../../assets/logo.png';

export function AppShell({ children }: { children: ReactNode }) {
  const { user, logout, bookings, payments } = useData();
  const [collapsed, setCollapsed] = useState(false);
  
  // Calculate badges
  // Today's date is roughly 2026-09-05 per seed data
  const today = '2026-09-05';
  
  const todaysCheckins = bookings.filter(b => b.checkIn === today).length;
  const pendingPayments = payments.filter(p => p.status === 'Pending').length + bookings.filter(b => b.balance > 0).length;

  const NavItem = ({ to, icon: Icon, label, badge }: any) => (
    <NavLink 
      to={to} 
      className={({ isActive }) => cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition-colors text-sm font-medium",
        isActive 
          ? "bg-[#7B1E22] text-white" 
          : "text-gray-600 hover:bg-[#f4ede4] hover:text-[#7B1E22]"
      )}
    >
      <Icon className="w-5 h-5 shrink-0" />
      {!collapsed && (
        <div className="flex-1 flex items-center justify-between">
          <span>{label}</span>
          {badge > 0 && (
            <span className={cn("px-2 py-0.5 rounded-full text-xs", "bg-red-100 text-red-700")}>
              {badge}
            </span>
          )}
        </div>
      )}
    </NavLink>
  );

  return (
    <div className="min-h-screen bg-[#FAF6F0] flex">
      {/* Sidebar */}
      <aside className={cn(
        "bg-white border-r border-[#e6dfd8] flex flex-col transition-all duration-300",
        collapsed ? "w-20" : "w-64"
      )}>
        {/* Header */}
        <div className="p-4 border-b border-[#e6dfd8] flex items-center justify-between shrink-0">
          {!collapsed ? (
            <div className="flex items-center gap-3 overflow-hidden">
              <img src={logoUrl} alt="Logo" className="w-8 h-8 rounded shrink-0 object-cover" />
              <div className="truncate">
                <h2 className="font-bold text-[#2d1b1c] truncate">Sharda Palace</h2>
                <p className="text-xs text-gray-500 truncate">Deoghar, Jharkhand</p>
              </div>
            </div>
          ) : (
            <img src={logoUrl} alt="Logo" className="w-8 h-8 rounded shrink-0 object-cover mx-auto" />
          )}
          
          <button 
            onClick={() => setCollapsed(!collapsed)}
            className="p-1 text-gray-400 hover:text-[#7B1E22] rounded-md transition-colors"
          >
            {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          </button>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-1">
          {!collapsed && <p className="text-xs font-semibold text-gray-400 mb-2 px-2 uppercase tracking-wider">Main Menu</p>}
          <NavItem to="/dashboard" icon={LayoutDashboard} label="Dashboard" />
          <NavItem to="/bookings" icon={BookOpenText} label="Bookings" badge={todaysCheckins} />
          <NavItem to="/guests" icon={Users} label="Guests" />
          <NavItem to="/rooms" icon={BedDouble} label="Rooms" />
          <NavItem to="/calendar" icon={CalendarDays} label="Calendar" />
          <NavItem to="/communications" icon={MessageSquare} label="Communications" />
          {user?.role === 'manager' && (
            <NavItem to="/payments" icon={CreditCard} label="Payments" badge={pendingPayments} />
          )}
          <NavItem to="/checkout" icon={Receipt} label="Checkout & Bill" />
          <NavItem to="/invoices" icon={FileText} label="Custom Invoice" />
          <NavItem to="/logs" icon={History} label="Activity Logs" />
          
          {!collapsed && (
            <div className="mt-8 p-4 bg-[#FAF6F0] rounded-xl border border-[#e6dfd8]">
              <div className="flex items-center gap-2 mb-2 text-[#7B1E22]">
                <Building className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">Hotel Info</span>
              </div>
              <p className="text-xs text-[#2d1b1c] font-medium leading-relaxed">
                Sharda Palace<br/>
                Shivganga Road, Deoghar<br/>
                Jharkhand 814112
              </p>
              <p className="text-xs font-medium mt-2 text-[#7B1E22]">+91 79707 35251</p>
            </div>
          )}
        </div>

        {/* User Footer */}
        <div className="p-4 border-t border-[#e6dfd8] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold shrink-0">
              {user?.avatar}
            </div>
            {!collapsed && (
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-semibold text-[#2d1b1c] truncate">{user?.name}</p>
                <p className="text-xs text-gray-500 capitalize truncate">{user?.role.replace('-', ' ')}</p>
              </div>
            )}
            <button 
              onClick={logout} 
              className="p-2 text-gray-400 hover:text-red-600 rounded-md transition-colors"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* We can add a top bar here if needed, but per requirements most screens manage their own header area in Main */}
        <div className="flex-1 overflow-auto p-6 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
