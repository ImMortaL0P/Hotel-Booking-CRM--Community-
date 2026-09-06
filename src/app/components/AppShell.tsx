import { ReactNode, useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router';
import { LayoutDashboard, BookOpenText, Users, BedDouble, CalendarDays, MessageSquare, CreditCard, LogOut, ChevronLeft, ChevronRight, Building, FileText, Receipt, History, Moon, Sun, Bell, Search, WalletCards, Activity, Globe, Server, Database } from 'lucide-react';
import { useData } from '../data/DataContext';
import { useTheme } from './ThemeProvider';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import logoUrl from '../../assets/logo.png';
import { CommandPalette } from './CommandPalette';

export function AppShell({ children }: { children: ReactNode }) {
  const { user, logout, bookings, payments, rooms } = useData();
  const [collapsed, setCollapsed] = useState(false);
  const { theme, setTheme } = useTheme();
    const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  // Health Status
  const [health, setHealth] = useState({
    frontend: 'Online',
    backend: 'Checking...',
    database: 'Checking...',
    pingMs: 0
  });

  const checkHealth = async () => {
    const start = Date.now();
    try {
      const { apiFetch } = await import('../lib/api');
      const res = await apiFetch('/api/health', { method: 'GET' }).catch(() => null);
      if (res && res.status === 'ok') {
        setHealth({
          frontend: 'Online',
          backend: 'Online',
          database: res.dbStatus || 'Connected',
          pingMs: Date.now() - start
        });
      } else {
        setHealth({
          frontend: 'Online',
          backend: 'Offline',
          database: 'Offline',
          pingMs: 0
        });
      }
    } catch (err) {
      setHealth({
        frontend: 'Online',
        backend: 'Offline',
        database: 'Offline',
        pingMs: 0
      });
    }
  };

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);


  // Calculate badges
    // Using real dynamic date per IST
  const getISTDate = () => {
    const d = new Date();
    const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
    return new Date(utc + (3600000 * 5.5));
  };
  const today = format(getISTDate(), 'yyyy-MM-dd');

  const todaysCheckins = bookings.filter(b => b.checkIn.split('T')[0] === today).length;
  const pendingPayments = payments.filter(p => p.status === 'Pending').length + bookings.filter(b => b.balance > 0).length;
  const cleaningRooms = rooms.filter(r => r.status === 'Cleaning').length;

  const notifications = [
    ...(todaysCheckins > 0 ? [{ id: 'n1', title: 'Check-ins Today', message: `${todaysCheckins} guests arriving today.`, type: 'info' }] : []),
    ...(pendingPayments > 0 ? [{ id: 'n2', title: 'Pending Payments', message: `${pendingPayments} transactions require attention.`, type: 'alert' }] : []),
    ...(cleaningRooms > 0 ? [{ id: 'n3', title: 'Rooms to Clean', message: `${cleaningRooms} rooms are currently marked for cleaning.`, type: 'warning' }] : []),
  ];

  const NavItem = ({ to, icon: Icon, label, badge }: any) => (
    <NavLink
      to={to}
      className={({ isActive }) => cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition-colors text-sm font-medium",
        isActive
          ? "bg-primary text-primary-foreground dark:bg-primary dark:text-primary-foreground"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      <Icon className="w-5 h-5 shrink-0" />
      {!collapsed && (
        <div className="flex-1 flex items-center justify-between">
          <span>{label}</span>
          {badge > 0 && (
            <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold", "bg-destructive text-destructive-foreground")}>
              {badge}
            </span>
          )}
        </div>
      )}
    </NavLink>
  );

  return (
    <div className="min-h-screen bg-background flex text-foreground print:block print:bg-white">
      {/* Sidebar */}
      <aside className={cn(
        "bg-card border-r border-border flex flex-col transition-all duration-300 print:hidden",
        collapsed ? "w-20" : "w-64"
      )}>
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between shrink-0 h-[73px]">
          {!collapsed ? (
            <div className="flex items-center gap-3 overflow-hidden">
              <img src={logoUrl} alt="Logo" className="w-10 h-10 rounded shrink-0 object-cover dark:bg-card dark:p-1" />
              <div className="truncate">
                <h2 className="font-bold text-foreground truncate leading-tight">Sharda Palace</h2>
                <p className="text-[10px] text-muted-foreground truncate">Deoghar, Jharkhand</p>
              </div>
            </div>
          ) : (
            <img src={logoUrl} alt="Logo" className="w-10 h-10 rounded shrink-0 object-cover mx-auto dark:bg-card dark:p-1" />
          )}

          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1 text-muted-foreground hover:text-foreground rounded-md transition-colors"
          >
            {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          </button>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-1">
          {!collapsed && <p className="text-xs font-semibold text-muted-foreground opacity-70 mb-2 px-2 uppercase tracking-wider">Main</p>}
          <NavItem to="/dashboard" icon={LayoutDashboard} label="Dashboard" />
          <NavItem to="/bookings" icon={BookOpenText} label="Bookings" badge={todaysCheckins} />
          <NavItem to="/guests" icon={Users} label="Guests" />
          <NavItem to="/rooms" icon={BedDouble} label="Rooms" />
          <NavItem to="/calendar" icon={CalendarDays} label="Calendar" />
          <NavItem to="/communications" icon={MessageSquare} label="Communications" />
          {['manager', 'owner', 'superadmin'].includes(user?.role || '') && (
            <NavItem to="/payments" icon={CreditCard} label="Payments" badge={pendingPayments} />
          )}
          <NavItem to="/checkout" icon={Receipt} label="Checkout & Bill" />
          <NavItem to="/invoices" icon={FileText} label="Custom Invoice" />
          {['manager', 'owner', 'superadmin'].includes(user?.role || '') && (
            <NavItem to="/expenses" icon={WalletCards} label="Expenses & Ledger" />
          )}

          <NavItem to="/logs" icon={History} label="Activity Logs" />
        </div>

        {/* System Health Monitor */}
        {!collapsed && ['manager', 'owner', 'superadmin'].includes(user?.role || '') && (
          <div className="mx-4 mb-4 p-3 bg-secondary/30 rounded-lg border border-border/50 shrink-0">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Activity className="w-3 h-3" /> System Health
              </h3>
              <button
                onClick={() => {
                  setHealth(h => ({ ...h, backend: 'Checking...', database: 'Checking...' }));
                  checkHealth();
                }}
                className="text-[9px] font-semibold text-muted-foreground hover:text-foreground transition-colors"
                title="Refresh Status"
              >
                Refresh
              </button>
            </div>
            
            <div className="flex flex-col gap-2">
              {/* Frontend Status */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Globe className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs font-medium text-foreground">Frontend</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${health.frontend === 'Online' ? 'bg-green-500 shadow-[0_0_4px_#22c55e]' : 'bg-red-500'}`}></span>
                  <span className="text-[10px] text-muted-foreground">{health.frontend}</span>
                </div>
              </div>

              {/* Backend Status */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Server className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs font-medium text-foreground">Backend</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${health.backend === 'Online' ? 'bg-green-500 shadow-[0_0_4px_#22c55e]' : 'bg-amber-500 animate-pulse'}`}></span>
                  <span className="text-[10px] text-muted-foreground">{health.backend} {health.pingMs > 0 ? `(${health.pingMs}ms)` : ''}</span>
                </div>
              </div>

              {/* DB Status */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Database className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs font-medium text-foreground">Database</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${(health.database === 'Connected' || health.database === 'Online') ? 'bg-green-500 shadow-[0_0_4px_#22c55e]' : 'bg-amber-500 animate-pulse'}`}></span>
                  <span className="text-[10px] text-muted-foreground">{health.database}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* User Footer */}

        <div className="p-4 border-t border-border shrink-0">
          <div className="flex justify-around mb-4 border-b border-border pb-3">
             <button
                onClick={() => setShowCommandPalette(true)}
                className="text-muted-foreground hover:text-foreground transition-colors p-1"
                title="Search (Cmd+K)"
             >
                <Search className="w-5 h-5" />
             </button>
             <div className="relative">
               <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="text-muted-foreground hover:text-foreground transition-colors p-1 relative"
                  title="Notifications"
               >
                  <Bell className="w-5 h-5" />
                  {notifications.length > 0 && (
                    <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full"></span>
                  )}
               </button>
               {showNotifications && (
                 <>
                   <div
                     className="fixed inset-0 z-40"
                     onClick={() => setShowNotifications(false)}
                   ></div>
                   <div className="absolute bottom-12 left-0 w-72 bg-popover text-popover-foreground border border-border rounded-lg shadow-sm z-50 overflow-hidden animate-in fade-in slide-in-from-bottom-2">
                     <div className="p-3 border-b border-border font-semibold flex items-center justify-between">
                       Notifications
                       <span className="text-xs bg-muted px-2 py-0.5 rounded-full">{notifications.length}</span>
                     </div>
                     <div className="max-h-64 overflow-y-auto">
                       {notifications.length === 0 ? (
                         <div className="p-4 text-center text-sm text-muted-foreground">No new notifications</div>
                       ) : (
                         notifications.map(n => (
                           <div key={n.id} className="p-3 border-b border-border last:border-0 hover:bg-muted/50 transition-colors cursor-pointer">
                             <div className="flex items-start gap-2">
                               <div className={cn(
                                 "w-2 h-2 rounded-full mt-1.5 shrink-0",
                                 n.type === 'alert' ? 'bg-destructive' : n.type === 'warning' ? 'bg-amber-500' : 'bg-primary'
                               )}></div>
                               <div>
                                 <p className="text-sm font-semibold">{n.title}</p>
                                 <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                               </div>
                             </div>
                           </div>
                         ))
                       )}
                     </div>
                   </div>
                 </>
               )}
             </div>
             <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="text-muted-foreground hover:text-foreground transition-colors p-1"
                title="Toggle Theme"
             >
                {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
             </button>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold shrink-0">
              {user?.avatar}
            </div>
            {!collapsed && (
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-semibold text-foreground truncate">{user?.name}</p>
                <p className="text-xs text-muted-foreground capitalize truncate">{user?.role.replace('-', ' ')}</p>
              </div>
            )}
            <button
              onClick={logout}
              className="p-1.5 text-muted-foreground hover:text-destructive rounded-md transition-colors"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden print:h-auto print:overflow-visible print:block">
        {/* We can add a top bar here if needed, but per requirements most screens manage their own header area in Main */}
        <div className="flex-1 overflow-auto p-4 md:p-6 bg-background print:p-0 print:overflow-visible print:block text-black">
          {children}
        </div>
      </main>

      <CommandPalette open={showCommandPalette} setOpen={setShowCommandPalette} />
    </div>
  );
}
