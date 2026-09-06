import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Users, Calendar, DollarSign, TrendingUp, Bed } from 'lucide-react';
import { mockBookings, mockCustomers, mockRooms } from '../lib/mockData';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { motion } from 'motion/react';

interface DashboardProps {
  onNavigate: (view: string) => void;
}

export function Dashboard({ onNavigate }: DashboardProps) {
  const totalRevenue = mockBookings.reduce((sum, booking) => sum + booking.totalPrice, 0);
  const activeBookings = mockBookings.filter(b => b.status === 'confirmed' || b.status === 'checked-in').length;
  const occupiedRooms = mockRooms.filter(r => r.status === 'occupied').length;
  const occupancyRate = ((occupiedRooms / mockRooms.length) * 100).toFixed(1);

  const revenueData = [
    { month: 'Jun', revenue: 12000 },
    { month: 'Jul', revenue: 15000 },
    { month: 'Aug', revenue: 18000 },
    { month: 'Sep', revenue: 16000 },
    { month: 'Oct', revenue: 19000 },
    { month: 'Nov', revenue: 21000 }
  ];

  const bookingsByType = [
    { type: 'Single', count: 15 },
    { type: 'Double', count: 28 },
    { type: 'Deluxe', count: 22 },
    { type: 'Suite', count: 18 }
  ];

  const recentBookings = mockBookings.slice(0, 5);

  return (
    <div>
      <motion.div 
        className="mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1>Dashboard</h1>
        <p className="text-muted-foreground">Welcome back! Here's what's happening today.</p>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card 
            className="group cursor-pointer transition-all duration-300 hover:shadow-sm hover:-translate-y-2 hover:border-green-300"
            onClick={() => onNavigate('reports')}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle>Total Revenue</CardTitle>
              <DollarSign className="w-5 h-5 text-muted-foreground group-hover:text-green-600 group-hover:scale-110 transition-all duration-300" />
            </CardHeader>
            <CardContent>
              <div className="text-foreground group-hover:text-green-900 transition-colors">${totalRevenue.toLocaleString()}</div>
              <p className="text-green-600 whitespace-nowrap">+12.5% vs last mo.</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card 
            className="group cursor-pointer transition-all duration-300 hover:shadow-sm hover:-translate-y-2 hover:border-blue-300"
            onClick={() => onNavigate('bookings')}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle>Active Bookings</CardTitle>
              <Calendar className="w-5 h-5 text-muted-foreground group-hover:text-blue-600 group-hover:scale-110 transition-all duration-300" />
            </CardHeader>
            <CardContent>
              <div className="text-foreground group-hover:text-blue-900 transition-colors">{activeBookings}</div>
              <p className="text-blue-600">{mockBookings.length} total bookings</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Card 
            className="group cursor-pointer transition-all duration-300 hover:shadow-sm hover:-translate-y-2 hover:border-purple-300"
            onClick={() => onNavigate('customers')}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle>Total Customers</CardTitle>
              <Users className="w-5 h-5 text-muted-foreground group-hover:text-purple-600 group-hover:scale-110 transition-all duration-300" />
            </CardHeader>
            <CardContent>
              <div className="text-foreground group-hover:text-purple-900 transition-colors">{mockCustomers.length}</div>
              <p className="text-purple-600">{mockCustomers.filter(c => c.vipStatus).length} VIP members</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <Card 
            className="group cursor-pointer transition-all duration-300 hover:shadow-sm hover:-translate-y-2 hover:border-orange-300"
            onClick={() => onNavigate('rooms')}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle>Occupancy Rate</CardTitle>
              <Bed className="w-5 h-5 text-muted-foreground group-hover:text-orange-600 group-hover:scale-110 transition-all duration-300" />
            </CardHeader>
            <CardContent>
              <div className="text-foreground group-hover:text-orange-900 transition-colors">{occupancyRate}%</div>
              <p className="text-orange-600">{occupiedRooms} of {mockRooms.length} rooms</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          <Card className="transition-all duration-300 hover:shadow-sm hover:scale-[1.02]">
            <CardHeader>
              <CardTitle>Revenue Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={revenueData}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                    </linearGradient>
                    <filter id="glow">
                      <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                      <feMerge>
                        <feMergeNode in="coloredBlur"/>
                        <feMergeNode in="SourceGraphic"/>
                      </feMerge>
                    </filter>
                    <filter id="shadow3d" height="200%">
                      <feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#3b82f6" floodOpacity="0.4"/>
                    </filter>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.5} />
                  <XAxis 
                    dataKey="month" 
                    tick={{ fill: '#6b7280' }}
                    axisLine={{ stroke: '#d1d5db', strokeWidth: 2 }}
                  />
                  <YAxis 
                    tick={{ fill: '#6b7280' }}
                    axisLine={{ stroke: '#d1d5db', strokeWidth: 2 }}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      border: 'none',
                      borderRadius: '12px',
                      boxShadow: '0 10px 25px rgba(59, 130, 246, 0.2)',
                      padding: '12px 16px'
                    }}
                    labelStyle={{ 
                      color: '#111827',
                      marginBottom: '4px'
                    }}
                    itemStyle={{ color: '#3b82f6' }}
                    cursor={{ stroke: '#3b82f6', strokeWidth: 2, strokeOpacity: 0.3 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="#3b82f6" 
                    strokeWidth={4}
                    fill="url(#colorRevenue)"
                    filter="url(#glow)"
                    dot={{ 
                      r: 6, 
                      fill: '#3b82f6', 
                      stroke: '#fff', 
                      strokeWidth: 3,
                      filter: 'url(#shadow3d)'
                    }}
                    activeDot={{ 
                      r: 8, 
                      fill: '#3b82f6',
                      stroke: '#fff',
                      strokeWidth: 4,
                      filter: 'url(#glow)'
                    }}
                    animationDuration={1500}
                    animationBegin={500}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          <Card className="transition-all duration-300 hover:shadow-sm hover:scale-[1.02]">
            <CardHeader>
              <CardTitle>Bookings by Room Type</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={bookingsByType}>
                  <defs>
                    <linearGradient id="colorBar" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8b5cf6" stopOpacity={1}/>
                      <stop offset="100%" stopColor="#6366f1" stopOpacity={0.8}/>
                    </linearGradient>
                    <filter id="shadow" height="200%">
                      <feDropShadow dx="0" dy="4" stdDeviation="4" floodOpacity="0.3"/>
                    </filter>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.5} />
                  <XAxis 
                    dataKey="type" 
                    tick={{ fill: '#6b7280' }}
                    axisLine={{ stroke: '#d1d5db' }}
                  />
                  <YAxis 
                    tick={{ fill: '#6b7280' }}
                    axisLine={{ stroke: '#d1d5db' }}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      border: 'none',
                      borderRadius: '12px',
                      boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                      padding: '12px 16px'
                    }}
                    labelStyle={{ 
                      color: '#111827',
                      marginBottom: '4px'
                    }}
                    itemStyle={{ color: '#8b5cf6' }}
                    cursor={{ fill: 'rgba(139, 92, 246, 0.1)' }}
                  />
                  <Bar 
                    dataKey="count" 
                    fill="url(#colorBar)"
                    radius={[12, 12, 0, 0]}
                    filter="url(#shadow)"
                    animationDuration={1000}
                    animationBegin={500}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Recent Bookings */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.7 }}
      >
        <Card className="transition-all duration-300 hover:shadow-sm">
          <CardHeader>
            <CardTitle>Recent Bookings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentBookings.map((booking, index) => (
                <motion.div 
                  key={booking.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: 0.8 + index * 0.1 }}
                  className="flex items-center justify-between p-4 border border-border rounded-lg hover:border-blue-300 hover:bg-blue-50/50 transition-all duration-300 hover:scale-[1.02] cursor-pointer"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <Users className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-foreground">{booking.customerName}</p>
                        <p className="text-muted-foreground">Room {booking.roomNumber} • {booking.roomType}</p>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-foreground">${booking.totalPrice}</p>
                    <p className="text-muted-foreground">{booking.checkIn} - {booking.checkOut}</p>
                  </div>
                  <div className="ml-4">
                    <span
                      className={`px-3 py-1 rounded-full ${
                        booking.status === 'confirmed'
                          ? 'bg-blue-100 text-blue-700'
                          : booking.status === 'checked-in'
                          ? 'bg-green-100 text-green-700'
                          : booking.status === 'checked-out'
                          ? 'bg-muted text-foreground/80'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {booking.status}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}