import { useState } from 'react';
import { Eye, EyeOff, MapPin, Phone, Clock, Bed, UserCircle, Briefcase } from 'lucide-react';
import { useData } from '../data/DataContext';
import { Role } from '../data/types';

export function StaffSignIn() {
  const { login } = useData();
  const [role, setRole] = useState<Role>('manager');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);

  // Demo accounts
  const accounts = [
    { name: 'Ravi Kumar', role: 'manager' as Role, email: 'ravi@shardapalace.in', emoji: '🧑‍💼' },
    { name: 'Seema Devi', role: 'front-desk' as Role, email: 'seema@shardapalace.in', emoji: '💁‍♀️' },
    { name: 'Arun Sharma', role: 'front-desk' as Role, email: 'arun@shardapalace.in', emoji: '👨‍💼' },
  ];

  const handleAutofill = (acc: typeof accounts[0]) => {
    setRole(acc.role);
    setEmail(acc.email);
    setPassword('demo123');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    
    // Find matched account
    const acc = accounts.find(a => a.email === email);
    login({
      id: acc ? acc.name.split(' ')[0].toLowerCase() : 'user-001',
      name: acc ? acc.name : 'Quick User',
      email: email,
      role: role,
      avatar: acc ? acc.name.charAt(0) : 'Q'
    });
  };

  return (
    <div className="min-h-screen flex font-sans bg-[#FAF6F0]">
      {/* Left Panel: Brand / Hotel Info */}
      <div className="hidden lg:flex w-1/2 bg-[#7B1E22] text-white flex-col justify-between p-12 relative overflow-hidden">
        {/* Faint subtle background pattern (arch shape) */}
        <div className="absolute inset-0 opacity-10 pointer-events-none flex items-center justify-center">
          <svg viewBox="0 0 100 100" className="w-[150%] h-[150%] text-white" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M 10,90 L 10,40 C 10,10 90,10 90,40 L 90,90" />
            <path d="M 30,90 L 30,50 C 30,30 70,30 70,50 L 70,90" />
          </svg>
        </div>

        <div className="relative z-10">
          <div className="w-16 h-16 bg-[#FAF6F0] text-[#7B1E22] flex items-center justify-center text-2xl font-bold rounded-xl mb-8">
            SP
          </div>
          <div className="inline-block px-3 py-1 bg-white/10 rounded-full text-sm font-medium mb-6">
            Hospitality Management System
          </div>
          <h1 className="text-5xl font-bold mb-4">ShardaCRM</h1>
          <p className="text-[#e6dfd8] text-xl mb-12 max-w-md">
            Complete hotel management for bookings, guests, rooms, and communications — all in one place.
          </p>

          <div className="space-y-6 text-[#e6dfd8]">
            <div className="flex items-start gap-4">
              <MapPin className="w-6 h-6 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-white">Sharda Palace</p>
                <p>Main Shivganga Road, Bam Bam Baba Path,<br/>near Matri Mandir, Deoghar 814112, Jharkhand</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <Phone className="w-6 h-6 shrink-0" />
              <p>+91 79707 35251</p>
            </div>
            
            <div className="flex items-center gap-4">
              <Clock className="w-6 h-6 shrink-0" />
              <p>12 min from Baba Baidyanath Mandir</p>
            </div>

            <div className="flex items-center gap-4">
              <Bed className="w-6 h-6 shrink-0" />
              <p>20 rooms · 4 room categories</p>
            </div>
          </div>
        </div>

        <div className="relative z-10 text-[#e6dfd8] text-sm font-medium">
          जय बाबा बैद्यनाथ · Jai Baba Baidyanath
        </div>
      </div>

      {/* Right Panel: Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gradient-to-br from-[#FAF6F0] to-[#F1EAE0]">
        <div className="w-full max-w-md bg-white p-10 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-[#e6dfd8]/50">
          <div className="mb-8 text-center">
            <h2 className="text-3xl font-bold text-[#2d1b1c] mb-2">Staff Sign In</h2>
            <p className="text-gray-500">Sign in to manage hotel operations</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Role Toggle */}
            <div className="flex p-1 bg-[#e6dfd8] rounded-lg">
              <button
                type="button"
                onClick={() => setRole('manager')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-colors ${role === 'manager' ? 'bg-white text-[#7B1E22] shadow-sm' : 'text-gray-600 hover:text-[#2d1b1c]'}`}
              >
                <Briefcase className="w-4 h-4" /> Manager
              </button>
              <button
                type="button"
                onClick={() => setRole('front-desk')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-colors ${role === 'front-desk' ? 'bg-white text-[#7B1E22] shadow-sm' : 'text-gray-600 hover:text-[#2d1b1c]'}`}
              >
                <UserCircle className="w-4 h-4" /> Front Desk
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#2d1b1c] mb-1">Email Address</label>
              <input 
                type="email" 
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-4 py-2 bg-white border border-[#e6dfd8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7B1E22] focus:border-transparent"
                placeholder="name@shardapalace.in"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#2d1b1c] mb-1">Password</label>
              <div className="relative">
                <input 
                  type={showPwd ? 'text' : 'password'} 
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full px-4 py-2 bg-white border border-[#e6dfd8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7B1E22] focus:border-transparent pr-10"
                  placeholder="••••••••"
                />
                <button 
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center">
              <input type="checkbox" id="keep" className="w-4 h-4 rounded border-[#e6dfd8] text-[#7B1E22] focus:ring-[#7B1E22]" />
              <label htmlFor="keep" className="ml-2 text-sm text-[#2d1b1c]">Keep me signed in</label>
            </div>

            <button type="submit" className="w-full bg-[#7B1E22] text-white py-3 rounded-lg font-medium hover:bg-[#8C1D24] transition-colors">
              Sign Into Dashboard
            </button>
          </form>

          {/* Demo Accounts */}
          <div className="mt-8 p-5 bg-[#FAF6F0] rounded-xl ring-1 ring-inset ring-[#e6dfd8]/70">
            <h3 className="text-sm font-semibold text-[#2d1b1c] mb-3 text-center">Demo Accounts — Click to autofill</h3>
            <div className="space-y-3">
              {accounts.map(acc => (
                <div key={acc.email} className="flex flex-wrap items-center justify-between gap-2 p-3 bg-white shadow-sm rounded-lg transition-all hover:-translate-y-0.5 hover:shadow-md cursor-pointer border border-[#e6dfd8]/40" onClick={() => handleAutofill(acc)}>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{acc.emoji}</span>
                    <div>
                      <p className="text-sm font-bold text-[#2d1b1c]">{acc.name} <span className="font-normal text-gray-500">({acc.role === 'manager' ? 'Manager' : 'Front Desk'})</span></p>
                      <p className="text-xs text-gray-400">{acc.email}</p>
                    </div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleAutofill(acc); }}
                    className="text-xs font-semibold text-[#7B1E22] bg-[#FAF6F0] px-3 py-1.5 rounded-full hover:bg-[#8C1D24] hover:text-white transition-colors"
                  >
                    Use
                  </button>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
