import { useState, useEffect } from 'react';
import { Eye, EyeOff, MapPin, Phone, Clock, Bed } from 'lucide-react';
import { useData } from '../data/DataContext';
import { apiFetch, API_BASE_URL } from '../lib/api';
import logoUrl from '../../assets/logo.png';

export function StaffSignIn() {
  const { login } = useData();
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Wake the (free-tier, sleep-on-idle) backend while the user is still typing
  // their credentials, so the login request doesn't pay the whole cold start.
  useEffect(() => {
    fetch(`${API_BASE_URL}/api/health`).catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !password) return;

    setError('');
    setIsLoading(true);

    const cleanId = userId.trim().toLowerCase();
    const OFFLINE_CREDENTIALS: Record<string, { pass: string; user: any }> = {
      'mangalam': {
        pass: 'Kukku404#',
        user: { id: 'mangalam', name: 'Mangalam', email: 'mangalam@shardapalace.in', role: 'superadmin', avatar: 'M' }
      },
      'harsh': {
        pass: 'Harsh#123',
        user: { id: 'harsh', name: 'Harsh Chandra', email: 'harsh@shardapalace.in', role: 'owner', avatar: 'H' }
      },
      'arya': {
        pass: 'Ekta#143',
        user: { id: 'arya', name: 'Arya Chandra', email: 'arya@shardapalace.in', role: 'owner', avatar: 'A' }
      },
      'frontdesk1': {
        pass: 'sharda#321',
        user: { id: 'frontdesk1', name: 'Front Desk', email: 'frontdesk@shardapalace.in', role: 'front-desk', avatar: 'F' }
      }
    };

    try {
      // 3.5 second network timeout so slow/sleeping cold servers don't lock up the login screen
      const result = await apiFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          userId: userId.trim(),
          password
        })
      }, { timeoutMs: 3500 });

      if (result.token && result.user) {
        await login(result.user, result.token);
      } else {
        throw new Error('Unexpected response from server.');
      }
    } catch (err: any) {
      // Offline fallback: allow local sign-in instantly if credentials match staff records
      if (OFFLINE_CREDENTIALS[cleanId] && OFFLINE_CREDENTIALS[cleanId].pass === password) {
        const fallback = OFFLINE_CREDENTIALS[cleanId];
        const syntheticToken = `mock-token-${cleanId}-${Date.now()}`;
        await login(fallback.user, syntheticToken);
        return;
      }
      setError(err.message || 'Invalid User ID or Password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex font-sans bg-background">
      {/* Left Panel: Brand / Hotel Info */}
      <div className="hidden lg:flex w-1/2 bg-primary text-primary-foreground flex-col justify-between p-12 relative overflow-hidden">
        {/* Logo Background with reduced opacity */}
        <div className="absolute inset-0 opacity-10 pointer-events-none flex items-center justify-center p-8">
          <img src={logoUrl} alt="" className="w-full h-full object-contain invert brightness-0" />
        </div>

        <div className="relative z-10 mt-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 border border-primary-foreground/25 rounded-full text-xs font-mono font-medium mb-6 backdrop-blur-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-primary-foreground animate-pulse"></span>
            Hospitality Operations Engine
          </div>
          <h1 className="text-5xl font-bold tracking-tight mb-4">ShardaCRM</h1>
          <p className="text-primary-foreground/85 text-lg mb-12 max-w-md leading-relaxed">
            Engineered hotel management for reservations, guest profiles, room allocations, and finances.
          </p>

          <div className="space-y-5 text-primary-foreground/80 font-sans text-sm">
            <div className="flex items-start gap-4">
              <MapPin className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-primary-foreground">Sharda Palace</p>
                <p className="text-xs opacity-90">Main Shivganga Road, Bam Bam Baba Path, near Matri Mandir, Deoghar 814112, Jharkhand</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Phone className="w-5 h-5 shrink-0" />
              <p className="font-mono text-xs">+91 79707 35251</p>
            </div>

            <div className="flex items-center gap-4">
              <Clock className="w-5 h-5 shrink-0" />
              <p className="text-xs">500m from Baba Baidyanath Mandir (6 min walk)</p>
            </div>

            <div className="flex items-center gap-4">
              <Bed className="w-5 h-5 shrink-0" />
              <p className="font-mono text-xs">3 rooms · 2 categories</p>
            </div>
          </div>
        </div>

        <div className="relative z-10 text-primary-foreground/80 font-mono text-xs uppercase tracking-wider">
          जय बाबा बैद्यनाथ · Jai Baba Baidyanath
        </div>
      </div>

      {/* Right Panel: Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-8 bg-background">
        <div className="w-full max-w-md bg-card p-5 sm:p-8 md:p-10 rounded-xl border border-border shadow-none">
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-bold text-foreground tracking-tight mb-1.5">Staff Sign In</h2>
            <p className="text-sm text-muted-foreground">Sign in to access property management</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">

            {error && (
              <div className="p-3 text-xs font-mono text-destructive bg-destructive/10 border border-destructive/20 rounded-lg">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="userId" className="block text-xs font-mono font-medium text-foreground mb-1.5 uppercase tracking-wider">User ID</label>
              <input
                id="userId"
                name="username"
                type="text"
                required
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                value={userId}
                onChange={e => setUserId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-sm font-mono placeholder:text-muted-foreground/60 transition-colors"
                placeholder="Enter your User ID"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-mono font-medium text-foreground mb-1.5 uppercase tracking-wider">Password</label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPwd ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary pr-10 text-sm font-mono placeholder:text-muted-foreground/60 transition-colors"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center">
              <input type="checkbox" id="keep" className="w-4 h-4 rounded border-border text-primary focus:ring-primary accent-primary" />
              <label htmlFor="keep" className="ml-2 text-xs text-muted-foreground cursor-pointer">Keep me signed in</label>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-primary text-primary-foreground py-2.5 rounded-full font-semibold hover:opacity-90 transition-opacity text-sm mt-2 disabled:opacity-50 cursor-pointer shadow-none"
            >
              {isLoading ? 'Signing In...' : 'Sign Into Dashboard'}
            </button>
          </form>

        </div>
      </div>
    </div>
  );
}