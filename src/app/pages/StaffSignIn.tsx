import { useState } from 'react';
import { Eye, EyeOff, MapPin, Phone, Clock, Bed } from 'lucide-react';
import { useData } from '../data/DataContext';
import { Role } from '../data/types';
import logoUrl from '../../assets/logo.png';

export function StaffSignIn() {
  const { login } = useData();
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState('');

  // Official accounts
  const accounts = [
    { name: 'Mangalam', role: 'superadmin' as Role, userId: 'mangalam', passHash: 'S3Vra3U0MDQj' },
    { name: 'Harsh Chandra', role: 'owner' as Role, userId: 'harsh', passHash: 'SGFyc2gjMTIz' },
    { name: 'Arya Chandra', role: 'owner' as Role, userId: 'arya', passHash: 'RWt0YSMxNDM=' },
    { name: 'Front Desk', role: 'front-desk' as Role, userId: 'frontdesk1', passHash: 'c2hhcmRhIzMyMQ==' }
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !password) return;

    // Find matched account
    const acc = accounts.find(a => a.userId === userId && a.passHash === btoa(password));

    if (acc) {
      setError('');
      login({
        id: acc.userId,
        name: acc.name,
        email: `${acc.userId}@shardapalace.in`,
        role: acc.role,
        avatar: acc.name.charAt(0).toUpperCase()
      });
    } else {
      setError('Invalid User ID or Password.');
    }
  };

  return (
    <div className="min-h-screen flex font-sans bg-[#FAF6F0]">
      {/* Left Panel: Brand / Hotel Info */}
      <div className="hidden lg:flex w-1/2 bg-[#7B1E22] text-white flex-col justify-between p-12 relative overflow-hidden">
        {/* Logo Background with reduced opacity */}
        <div className="absolute inset-0 opacity-15 pointer-events-none flex items-center justify-center p-8">
          <img src={logoUrl} alt="" className="w-full h-full object-contain" />
        </div>

        <div className="relative z-10 mt-8">
          <div className="inline-block px-3 py-1 bg-white/10 rounded-full text-sm font-medium mb-6 backdrop-blur-sm">
            Hospitality Management System
          </div>
          <h1 className="text-5xl font-bold mb-4 drop-shadow-md">ShardaCRM</h1>
          <p className="text-[#e6dfd8] text-xl mb-12 max-w-md drop-shadow-sm">
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
              <p>3 rooms · 2 room categories</p>
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

            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-[#2d1b1c] mb-1">User ID</label>
              <input
                type="text"
                required
                value={userId}
                onChange={e => setUserId(e.target.value)}
                className="w-full px-4 py-2 bg-white border border-[#e6dfd8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7B1E22] focus:border-transparent"
                placeholder="Enter your User ID"
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

            <button type="submit" className="w-full bg-[#7B1E22] text-white py-3 rounded-lg font-medium hover:bg-[#8C1D24] transition-colors mt-2">
              Sign Into Dashboard
            </button>
          </form>

        </div>
      </div>
    </div>
  );
}