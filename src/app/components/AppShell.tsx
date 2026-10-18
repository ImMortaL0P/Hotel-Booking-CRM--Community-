import { ReactNode, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router';
import { 
  LayoutDashboard, BookOpenText, Users, BedDouble, CalendarDays, 
  MessageSquare, CreditCard, LogOut, ChevronLeft, ChevronRight, 
  Building, FileText, Receipt, History, Moon, Sun, Bell, Search, 
  WalletCards, Mail, ExternalLink, Menu, X, Globe, RefreshCw
} from 'lucide-react';
import { useData } from '../data/DataContext';
import { useTheme } from './ThemeProvider';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import monogramUrl from '../../assets/logo-monogram.png';
import { CommandPalette } from './CommandPalette';
import { motion, AnimatePresence } from 'motion/react';

// Defined at module scope with tactile micro-interactions and active indicator bar
const NavItem = ({ to, icon: Icon, label, badge, collapsed, inactive, onClick }: any) => {
  if (inactive) {
    return (
      <div
        className={cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-xl mb-1 transition-all text-xs font-medium opacity-40 cursor-not-allowed select-none text-muted-foreground",
          collapsed && "justify-center px-0"
        )}
        title={`${label} (Inactive)`}
      >
        <Icon className="w-4 h-4 shrink-0 text-muted-foreground/60" />
        {!collapsed && (
          <div className="flex-1 flex items-center justify-between">
            <span className="tracking-tight text-muted-foreground/75">{label}</span>
            <span className="px-1.5 py-0.5 text-[8.5px] font-mono uppercase tracking-wider rounded border border-border/70 bg-muted/60 text-muted-foreground font-semibold">
              Inactive
            </span>
          </div>
        )}
      </div>
    );
  }

  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) => cn(
        "group relative flex items-center gap-3 px-3 py-2.5 rounded-xl mb-1 text-sm font-medium transition-all duration-200 select-none min-h-[44px]",
        isActive
          ? "bg-primary text-primary-foreground font-semibold shadow-sm shadow-primary/25"
          : "text-muted-foreground hover:bg-secondary/80 hover:text-foreground"
      )}
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-primary-foreground/90 shadow-sm" />
          )}
          <Icon className={cn(
            "w-4 h-4 shrink-0 transition-transform duration-200",
            isActive ? "scale-110" : "group-hover:scale-110 group-hover:text-foreground"
          )} />
          {!collapsed && (
            <div className="flex-1 flex items-center justify-between">
              <span className="tracking-tight text-xs sm:text-sm">{label}</span>
              {badge > 0 && (
                <span className={cn(
                  "px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold tracking-tight border transition-transform group-hover:scale-105",
                  isActive
                    ? "bg-primary-foreground/20 text-primary-foreground border-primary-foreground/30"
                    : "bg-primary/10 text-primary border-primary/25"
                )}>
                  {badge}
                </span>
              )}
            </div>
          )}
        </>
      )}
    </NavLink>
  );
};

export function AppShell({ children }: { children: ReactNode }) {
  const { user, logout, bookings, payments, rooms, isSyncing, syncProgressText } = useData();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const location = useLocation();
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const handleLogout = useCallback(() => {
    logout();
    navigate('/login', { replace: true });
  }, [logout, navigate]);

  // GPU-accelerated scroll container reference
  const scrollRef = useRef<HTMLDivElement>(null);

  // Instant hardware scroll reset and drawer close on route change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: 0, behavior: 'instant' });
    }
    setMobileDrawerOpen(false);
  }, [location.pathname]);

  // Prevent background scrolling when mobile drawer is open
  useEffect(() => {
    if (mobileDrawerOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileDrawerOpen]);



  // Calculate badges
  const getISTDate = () => {
    const d = new Date();
    const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
    return new Date(utc + (3600000 * 5.5));
  };
  const today = format(getISTDate(), 'yyyy-MM-dd');

  const { todaysCheckins, pendingPayments, cleaningRooms } = useMemo(() => {
    let todaysCheckins = 0, pendingBookings = 0;
    for (const b of bookings) {
      if (b.checkIn && b.checkIn.startsWith(today)) todaysCheckins++;
      if ((b.balance || 0) > 0) pendingBookings++;
    }
    return {
      todaysCheckins,
      pendingPayments: payments.filter(p => p.status === 'Pending').length + pendingBookings,
      cleaningRooms: rooms.filter(r => r.status === 'Cleaning').length
    };
  }, [bookings, payments, rooms, today]);

  const notifications = [
    ...(todaysCheckins > 0 ? [{ id: 'n1', title: 'Check-ins Today', message: `${todaysCheckins} guests arriving today.`, type: 'info' }] : []),
    ...(pendingPayments > 0 ? [{ id: 'n2', title: 'Pending Payments', message: `${pendingPayments} transactions require attention.`, type: 'alert' }] : []),
    ...(cleaningRooms > 0 ? [{ id: 'n3', title: 'Rooms to Clean', message: `${cleaningRooms} rooms are currently marked for cleaning.`, type: 'warning' }] : []),
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row text-foreground print:block print:bg-white selection:bg-primary/20 selection:text-primary">
      
      {/* =========================================================================
          AMBIENT TOP SYNC LOADER BAR (Active whenever priority or background sync is running)
          ========================================================================= */}
      <AnimatePresence>
        {isSyncing && (
          <motion.div
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ opacity: 1, scaleX: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed top-0 left-0 right-0 z-50 h-[2.5px] bg-gradient-to-r from-primary via-amber-500 to-emerald-500 origin-left shadow-sm pointer-events-none"
          >
            <div className="w-full h-full bg-white/40 animate-pulse" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* =========================================================================
          MOBILE TOP HEADER BAR (Strictly < md screens)
          ========================================================================= */}
      <header className="md:hidden sticky top-0 z-30 bg-card/95 backdrop-blur-md border-b border-border h-14 px-3 flex items-center justify-between shrink-0 print:hidden">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setMobileDrawerOpen(true)}
            className="p-2 -ml-1 text-muted-foreground hover:text-foreground active:scale-95 transition-transform rounded-xl cursor-pointer"
            aria-label="Open Navigation Menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <img src={monogramUrl} alt="Logo" className="w-8 h-8 rounded-lg object-contain p-0.5 border border-border shadow-2xs bg-card" />
            <span className="font-bold text-sm text-foreground tracking-tight">Sharda Palace</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {isSyncing && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25 shrink-0 animate-pulse">
              <RefreshCw className="w-2.5 h-2.5 animate-spin text-amber-500" />
              <span className="hidden xs:inline">Syncing</span>
            </div>
          )}
          <button
            onClick={() => setShowCommandPalette(true)}
            className="p-2 text-muted-foreground hover:text-foreground active:scale-95 transition-all rounded-lg cursor-pointer"
            title="Search (Cmd+K)"
          >
            <Search className="w-4 h-4" />
          </button>

          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 text-muted-foreground hover:text-foreground active:scale-95 transition-all rounded-lg relative cursor-pointer"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {notifications.length > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full" />
            )}
          </button>

          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="p-2 text-muted-foreground hover:text-foreground active:scale-95 transition-all rounded-lg cursor-pointer"
            title="Toggle Theme"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* =========================================================================
          MOBILE SLIDE-OUT DRAWER / SHEET (< md screens)
          ========================================================================= */}
      <AnimatePresence>
        {mobileDrawerOpen && (
          <div className="fixed inset-0 z-50 md:hidden flex" role="dialog" aria-modal="true">
            {/* Backdrop Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs"
              onClick={() => setMobileDrawerOpen(false)}
            />

            {/* Sliding Panel */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: '0%' }}
              exit={{ x: '-100%' }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="relative w-[85%] max-w-xs bg-card h-full flex flex-col border-r border-border shadow-2xl z-10"
            >
              {/* Header */}
              <div className="p-4 border-b border-border/70 flex items-center justify-between shrink-0 h-16">
                <div className="flex items-center gap-3">
                  <img src={monogramUrl} alt="Logo" className="w-10 h-10 rounded-xl object-contain p-1 border border-border shadow-xs bg-card" />
                  <div>
                    <h2 className="font-bold text-foreground text-sm leading-tight">Sharda Palace</h2>
                    <p className="text-[10px] font-mono text-muted-foreground">Deoghar · Ground Floor</p>
                  </div>
                </div>
                <button
                  onClick={() => setMobileDrawerOpen(false)}
                  className="p-2 text-muted-foreground hover:text-foreground active:scale-95 transition-all rounded-lg cursor-pointer"
                  aria-label="Close Navigation Menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Navigation Items */}
              <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-0.5">
                <p className="text-[10px] font-mono font-bold text-muted-foreground opacity-60 mb-1.5 px-3 uppercase tracking-[0.2em]">
                  Management
                </p>
                <NavItem to="/dashboard" icon={LayoutDashboard} label="Dashboard" onClick={() => setMobileDrawerOpen(false)} />
                <NavItem to="/bookings" icon={BookOpenText} label="Bookings" badge={todaysCheckins} onClick={() => setMobileDrawerOpen(false)} />
                <NavItem to="/guests" icon={Users} label="Guests" onClick={() => setMobileDrawerOpen(false)} />
                <NavItem to="/rooms" icon={BedDouble} label="Rooms" onClick={() => setMobileDrawerOpen(false)} />
                <NavItem to="/calendar" icon={CalendarDays} label="Calendar" onClick={() => setMobileDrawerOpen(false)} />
                <NavItem to="/email-import" icon={Mail} label="Email Import" inactive={true} />
                <NavItem to="/communications" icon={MessageSquare} label="Communications" onClick={() => setMobileDrawerOpen(false)} />
                {['manager', 'owner', 'superadmin'].includes(user?.role || '') && (
                  <NavItem to="/payments" icon={CreditCard} label="Payments" badge={pendingPayments} onClick={() => setMobileDrawerOpen(false)} />
                )}
                <NavItem to="/checkout" icon={Receipt} label="Checkout & Bill" onClick={() => setMobileDrawerOpen(false)} />
                <NavItem to="/invoices" icon={FileText} label="Custom Invoice" onClick={() => setMobileDrawerOpen(false)} />
                {['manager', 'owner', 'superadmin'].includes(user?.role || '') && (
                  <NavItem to="/expenses" icon={WalletCards} label="Expenses & Ledger" onClick={() => setMobileDrawerOpen(false)} />
                )}
                {['manager', 'owner', 'superadmin'].includes(user?.role || '') && (
                  <NavItem to="/channel-settings" icon={Globe} label="Channel Settings" inactive={true} />
                )}
                <NavItem to="/logs" icon={History} label="Activity Logs" onClick={() => setMobileDrawerOpen(false)} />

                {/* Direct Public Booking Page Link */}
                <div className="pt-2 mt-2 border-t border-border/50">
                  <a
                    href="/book"
                    target="_blank"
                    rel="noreferrer"
                    className="group relative flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all text-xs font-medium border border-primary/25 bg-primary/5 hover:bg-primary/10 text-primary shadow-xs"
                  >
                    <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <ExternalLink className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <div className="flex-1 flex items-center justify-between">
                      <span className="font-semibold tracking-tight font-mono">Guest Booking</span>
                      <span className="text-[9px] uppercase font-mono px-2 py-0.5 rounded-md bg-primary text-primary-foreground font-bold">
                        Public ↗
                      </span>
                    </div>
                  </a>
                </div>
              </div>

              {/* Mobile Drawer User Footer */}
              <div className="p-3 border-t border-border/70 shrink-0 bg-secondary/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold font-mono text-xs border border-primary/20">
                      {user?.avatar}
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-xs font-semibold text-foreground truncate">{user?.name || 'Staff'}</p>
                      <p className="text-[10px] font-mono text-muted-foreground capitalize truncate">{user?.role ? user.role.replace('-', ' ') : 'Staff'}</p>
                    </div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-all"
                    title="Logout"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* =========================================================================
          DESKTOP PERSISTENT SIDEBAR (Hidden on < md screens)
          ========================================================================= */}
      <aside className={cn(
        "hidden md:flex bg-card/95 backdrop-blur-md border-r border-border flex-col transition-all duration-300 print:hidden relative z-20 shadow-xs",
        collapsed ? "w-20" : "w-64"
      )}>
        {/* Header */}
        <div className="p-4 border-b border-border/70 flex items-center justify-between shrink-0 h-[73px]">
          {!collapsed ? (
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="relative group">
                <img src={monogramUrl} alt="Logo" className="w-10 h-10 rounded-xl shrink-0 object-contain p-1 border border-border shadow-xs transition-transform group-hover:scale-105 bg-card" />
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-card" />
              </div>
              <div className="truncate">
                <h2 className="font-bold text-foreground truncate leading-tight tracking-tight">Sharda Palace</h2>
                <p className="text-[10.5px] font-mono text-muted-foreground truncate">Deoghar · Ground Floor</p>
              </div>
            </div>
          ) : (
            <div className="mx-auto relative">
              <img src={monogramUrl} alt="Logo" className="w-10 h-10 rounded-xl shrink-0 object-contain p-1 border border-border shadow-xs bg-card" />
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-card" />
            </div>
          )}

          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-secondary transition-all tactile-btn cursor-pointer"
            title={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-0.5">
          {!collapsed && (
            <p className="text-[10px] font-mono font-bold text-muted-foreground opacity-60 mb-1.5 px-3 uppercase tracking-[0.2em]">
              Management
            </p>
          )}
          <NavItem collapsed={collapsed} to="/dashboard" icon={LayoutDashboard} label="Dashboard" />
          <NavItem collapsed={collapsed} to="/bookings" icon={BookOpenText} label="Bookings" badge={todaysCheckins} />
          <NavItem collapsed={collapsed} to="/guests" icon={Users} label="Guests" />
          <NavItem collapsed={collapsed} to="/rooms" icon={BedDouble} label="Rooms" />
          <NavItem collapsed={collapsed} to="/calendar" icon={CalendarDays} label="Calendar" />
          <NavItem collapsed={collapsed} to="/email-import" icon={Mail} label="Email Import" inactive={true} />
          <NavItem collapsed={collapsed} to="/communications" icon={MessageSquare} label="Communications" />
          {['manager', 'owner', 'superadmin'].includes(user?.role || '') && (
            <NavItem collapsed={collapsed} to="/payments" icon={CreditCard} label="Payments" badge={pendingPayments} />
          )}
          <NavItem collapsed={collapsed} to="/checkout" icon={Receipt} label="Checkout & Bill" />
          <NavItem collapsed={collapsed} to="/invoices" icon={FileText} label="Custom Invoice" />
          {['manager', 'owner', 'superadmin'].includes(user?.role || '') && (
            <NavItem collapsed={collapsed} to="/expenses" icon={WalletCards} label="Expenses & Ledger" />
          )}
          {['manager', 'owner', 'superadmin'].includes(user?.role || '') && (
            <NavItem collapsed={collapsed} to="/channel-settings" icon={Globe} label="Channel Settings" inactive={true} />
          )}

          <NavItem collapsed={collapsed} to="/logs" icon={History} label="Activity Logs" />

          {/* Quick link to public guest booking portal */}
          <div className="pt-2 mt-2 border-t border-border/50">
            <a
              href="/book"
              target="_blank"
              rel="noreferrer"
              className={cn(
                "group relative flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all duration-300 text-xs font-medium border border-primary/25 bg-primary/5 hover:bg-primary/10 text-primary shadow-xs hover:shadow-sm hover:border-primary/40",
                collapsed && "justify-center px-0"
              )}
              title="Open Public Customer Booking Page (/book)"
            >
              <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <ExternalLink className="w-3.5 h-3.5 text-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </div>
              {!collapsed && (
                <div className="flex-1 flex items-center justify-between">
                  <span className="font-semibold tracking-tight font-mono">Guest Booking</span>
                  <span className="text-[9px] uppercase font-mono px-2 py-0.5 rounded-md bg-primary text-primary-foreground font-bold shadow-xs">
                    Public ↗
                  </span>
                </div>
              )}
            </a>
          </div>
        </div>



        {/* User Footer */}
        <div className="p-3 border-t border-border/70 shrink-0">
          <div className="flex justify-around mb-3 border-b border-border/50 pb-2.5">
             <button
                onClick={() => setShowCommandPalette(true)}
                className="text-muted-foreground hover:text-foreground hover:bg-secondary p-1.5 rounded-lg transition-all tactile-btn cursor-pointer"
                title="Search (Cmd+K)"
             >
                <Search className="w-4 h-4" />
             </button>
             <div className="relative">
               <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="text-muted-foreground hover:text-foreground hover:bg-secondary p-1.5 rounded-lg transition-all tactile-btn cursor-pointer relative"
                  title="Notifications"
               >
                  <Bell className="w-4 h-4" />
                  {notifications.length > 0 && (
                    <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full animate-ping"></span>
                  )}
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
                   <div className="absolute bottom-12 left-0 w-72 bg-popover text-popover-foreground border border-border rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200">
                     <div className="p-3 border-b border-border/70 font-semibold flex items-center justify-between">
                       <span>Notifications</span>
                       <span className="text-xs bg-muted px-2 py-0.5 rounded-full font-mono">{notifications.length}</span>
                     </div>
                     <div className="max-h-64 overflow-y-auto">
                       {notifications.length === 0 ? (
                         <div className="p-4 text-center text-sm text-muted-foreground">No new notifications</div>
                       ) : (
                         notifications.map(n => (
                           <div key={n.id} className="p-3 border-b border-border/50 last:border-0 hover:bg-muted/50 transition-colors cursor-pointer">
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
                className="text-muted-foreground hover:text-foreground hover:bg-secondary p-1.5 rounded-lg transition-all tactile-btn cursor-pointer hover:rotate-45"
                title="Toggle Theme"
             >
                {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
             </button>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold font-mono shrink-0 border border-primary/20">
                {user?.avatar}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-card" />
            </div>
            {!collapsed && (
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-semibold text-foreground truncate tracking-tight">{user?.name || 'Staff'}</p>
                <p className="text-[11px] font-mono text-muted-foreground capitalize truncate">{user?.role ? user.role.replace('-', ' ') : 'Staff'}</p>
              </div>
            )}
            <button
              onClick={handleLogout}
              className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-all tactile-btn cursor-pointer"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* =========================================================================
          MAIN CONTENT AREA (GPU Compositor Scrolling + Mobile Padding)
          ========================================================================= */}
      <main className="flex-1 flex flex-col h-[calc(100vh-3.5rem)] md:h-screen overflow-hidden print:h-auto print:overflow-visible print:block bg-background gpu-layer">
        <div 
          ref={scrollRef}
          className="smooth-scroll-container flex-1 overflow-y-auto p-3.5 pb-24 md:p-6 md:pb-6 bg-background print:p-0 print:overflow-visible print:block text-foreground"
        >
          <div className="max-w-7xl mx-auto">
            {/* Real-time Progressive Hydration Indicator Banner */}
            <AnimatePresence>
              {isSyncing && (
                <motion.div
                  initial={{ opacity: 0, height: 0, y: -6 }}
                  animate={{ opacity: 1, height: 'auto', y: 0 }}
                  exit={{ opacity: 0, height: 0, y: -6 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden mb-3.5 print:hidden"
                >
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono font-medium bg-amber-500/10 border border-amber-500/25 text-amber-700 dark:text-amber-400 shadow-2xs backdrop-blur-sm">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0 text-amber-500" />
                    <span>{syncProgressText || 'Syncing property records...'}</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping ml-1" />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, transform: 'translate3d(0, 5px, 0)' }}
              animate={{ opacity: 1, transform: 'translate3d(0, 0px, 0)' }}
              transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
              style={{ willChange: 'opacity, transform' }}
            >
              {children}
            </motion.div>
          </div>
        </div>
      </main>

      {/* =========================================================================
          MOBILE BOTTOM NAVIGATION BAR (Thumb Ergonomics on < md screens)
          ========================================================================= */}
      <nav 
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-lg border-t border-border flex items-center justify-around py-1 px-2 pb-safe print:hidden shadow-lg"
        aria-label="Mobile Bottom Navigation"
      >
        <NavLink
          to="/dashboard"
          className={({ isActive }) => cn(
            "flex flex-col items-center justify-center min-w-[56px] py-1.5 px-2 rounded-xl text-[10px] font-medium transition-all min-h-[44px]",
            isActive ? "text-primary font-bold" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <LayoutDashboard className="w-5 h-5 mb-0.5" />
          <span>Desk</span>
        </NavLink>

        <NavLink
          to="/bookings"
          className={({ isActive }) => cn(
            "flex flex-col items-center justify-center min-w-[56px] py-1.5 px-2 rounded-xl text-[10px] font-medium transition-all relative min-h-[44px]",
            isActive ? "text-primary font-bold" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <div className="relative">
            <BookOpenText className="w-5 h-5 mb-0.5" />
            {todaysCheckins > 0 && (
              <span className="absolute -top-1 -right-2 px-1 py-0.2 bg-primary text-primary-foreground text-[8px] font-bold rounded-full font-mono">
                {todaysCheckins}
              </span>
            )}
          </div>
          <span>Bookings</span>
        </NavLink>

        <NavLink
          to="/rooms"
          className={({ isActive }) => cn(
            "flex flex-col items-center justify-center min-w-[56px] py-1.5 px-2 rounded-xl text-[10px] font-medium transition-all relative min-h-[44px]",
            isActive ? "text-primary font-bold" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <div className="relative">
            <BedDouble className="w-5 h-5 mb-0.5" />
            {cleaningRooms > 0 && (
              <span className="absolute -top-0.5 -right-1 w-2 h-2 bg-amber-500 rounded-full" />
            )}
          </div>
          <span>Rooms</span>
        </NavLink>

        <NavLink
          to="/checkout"
          className={({ isActive }) => cn(
            "flex flex-col items-center justify-center min-w-[56px] py-1.5 px-2 rounded-xl text-[10px] font-medium transition-all min-h-[44px]",
            isActive ? "text-primary font-bold" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Receipt className="w-5 h-5 mb-0.5" />
          <span>Checkout</span>
        </NavLink>

        <button
          type="button"
          onClick={() => setMobileDrawerOpen(true)}
          className="flex flex-col items-center justify-center min-w-[56px] py-1.5 px-2 rounded-xl text-[10px] font-medium text-muted-foreground hover:text-foreground cursor-pointer min-h-[44px]"
        >
          <Menu className="w-5 h-5 mb-0.5" />
          <span>Menu</span>
        </button>
      </nav>

      <CommandPalette open={showCommandPalette} setOpen={setShowCommandPalette} />
    </div>
  );
}
