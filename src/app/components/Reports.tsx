import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { DollarSign, TrendingUp, TrendingDown, ArrowUpRight, Calendar, Globe } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend } from 'recharts';
import { useData } from '../data/DataContext';
import { formatCurrency, formatDate } from '../lib/utils';

export function Reports() {
  const [activeTab, setActiveTab] = useState<'financial' | 'channel'>('financial');
  const { bookings } = useData();
  const revenueData = [
    { month: 'Jan', revenue: 15000, expenses: 8000, profit: 7000 },
    { month: 'Feb', revenue: 18000, expenses: 9000, profit: 9000 },
    { month: 'Mar', revenue: 16000, expenses: 8500, profit: 7500 },
    { month: 'Apr', revenue: 22000, expenses: 10000, profit: 12000 },
    { month: 'May', revenue: 20000, expenses: 9500, profit: 10500 },
    { month: 'Jun', revenue: 24000, expenses: 11000, profit: 13000 },
    { month: 'Jul', revenue: 28000, expenses: 12000, profit: 16000 },
    { month: 'Aug', revenue: 26000, expenses: 11500, profit: 14500 },
    { month: 'Sep', revenue: 23000, expenses: 10500, profit: 12500 },
    { month: 'Oct', revenue: 27000, expenses: 12000, profit: 15000 },
    { month: 'Nov', revenue: 29000, expenses: 13000, profit: 16000 },
    { month: 'Dec', revenue: 32000, expenses: 14000, profit: 18000 }
  ];

  const roomTypeRevenue = [
    { type: 'Double Bed Room', revenue: 78000, percentage: 65 },
    { type: 'Family Bed Room', revenue: 42000, percentage: 35 }
  ];

  const monthlyComparison = [
    { category: 'Room Revenue', current: 185000, previous: 165000 },
    { category: 'Services', current: 42000, previous: 38000 },
    { category: 'Restaurant', current: 28000, previous: 25000 },
    { category: 'Other', current: 15000, previous: 12000 }
  ];

  const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b'];

  const currentMonthRevenue = 270000;
  const previousMonthRevenue = 240000;
  const revenueGrowth = ((currentMonthRevenue - previousMonthRevenue) / previousMonthRevenue * 100).toFixed(1);

  const ytdRevenue = 260000;
  const ytdExpenses = 120000;
  const ytdProfit = ytdRevenue - ytdExpenses;

  // Channel Analytics calculation
  const [channelDateRange, setChannelDateRange] = useState('all');
  const filteredBookings = bookings.filter(b => {
    if (channelDateRange === 'all') return true;
    const now = new Date();
    const bDate = new Date(b.createdAt);
    if (channelDateRange === 'this_month') {
      return bDate.getMonth() === now.getMonth() && bDate.getFullYear() === now.getFullYear();
    }
    if (channelDateRange === 'last_month') {
      const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return bDate.getMonth() === lm.getMonth() && bDate.getFullYear() === lm.getFullYear();
    }
    if (channelDateRange === 'this_year') {
      return bDate.getFullYear() === now.getFullYear();
    }
    return true;
  });

  const channelStatsBySource = filteredBookings.reduce((acc, b) => {
    const src = b.source || 'Direct';
    if (!acc[src]) {
      acc[src] = { count: 0, revenue: 0, commission: 0, netRevenue: 0 };
    }
    acc[src].count += 1;
    acc[src].revenue += b.total;
    acc[src].commission += b.commission || 0;
    acc[src].netRevenue += b.netRevenue || b.total;
    return acc;
  }, {} as Record<string, { count: number, revenue: number, commission: number, netRevenue: number }>);

  const channelPieData = Object.keys(channelStatsBySource).map(src => ({
    name: src,
    value: channelStatsBySource[src].count
  }));

  const channelRevenueData = Object.keys(channelStatsBySource).map(src => ({
    name: src,
    Revenue: channelStatsBySource[src].revenue,
    NetRevenue: channelStatsBySource[src].netRevenue,
    Commission: channelStatsBySource[src].commission
  }));

  return (
    <div>
      <div className="mb-4">
        <h1>Reports & Analytics</h1>
        <p className="text-muted-foreground">Track revenue, expenses, and channel performance</p>
      </div>

      <div className="flex gap-4 mb-8">
        <button
          onClick={() => setActiveTab('financial')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'financial' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
        >
          <DollarSign className="w-4 h-4 inline-block mr-2" /> Financial Reports
        </button>
        <button
          onClick={() => setActiveTab('channel')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'channel' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
        >
          <Globe className="w-4 h-4 inline-block mr-2" /> Channel Performance
        </button>
      </div>

      {activeTab === 'financial' && (
        <>
          {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="group cursor-pointer transition-all duration-300 hover:shadow-sm hover:-translate-y-2 hover:border-green-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-500 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
                <DollarSign className="w-6 h-6 text-green-600 group-hover:text-primary-foreground transition-colors" />
              </div>
              <Badge className="bg-green-100 text-green-700">
                <TrendingUp className="w-3 h-3 mr-1" />
                +{revenueGrowth}%
              </Badge>
            </div>
            <p className="text-muted-foreground group-hover:text-green-700 transition-colors">Monthly Revenue</p>
            <p className="text-foreground group-hover:text-green-900 transition-colors">${currentMonthRevenue.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card className="group cursor-pointer transition-all duration-300 hover:shadow-sm hover:-translate-y-2 hover:border-blue-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-500 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
                <TrendingUp className="w-6 h-6 text-blue-600 group-hover:text-primary-foreground transition-colors" />
              </div>
              <Badge className="bg-blue-100 text-blue-700">YTD</Badge>
            </div>
            <p className="text-muted-foreground group-hover:text-blue-700 transition-colors">Total Revenue</p>
            <p className="text-foreground group-hover:text-blue-900 transition-colors">${ytdRevenue.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card className="group cursor-pointer transition-all duration-300 hover:shadow-sm hover:-translate-y-2 hover:border-red-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center group-hover:bg-red-500 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
                <TrendingDown className="w-6 h-6 text-red-600 group-hover:text-primary-foreground transition-colors" />
              </div>
              <Badge className="bg-red-100 text-red-700">YTD</Badge>
            </div>
            <p className="text-muted-foreground group-hover:text-red-700 transition-colors">Total Expenses</p>
            <p className="text-foreground group-hover:text-red-900 transition-colors">${ytdExpenses.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card className="group cursor-pointer transition-all duration-300 hover:shadow-sm hover:-translate-y-2 hover:border-purple-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center group-hover:bg-purple-500 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
                <ArrowUpRight className="w-6 h-6 text-purple-600 group-hover:text-primary-foreground transition-colors" />
              </div>
              <Badge className="bg-purple-100 text-purple-700">YTD</Badge>
            </div>
            <p className="text-muted-foreground group-hover:text-purple-700 transition-colors">Net Profit</p>
            <p className="text-foreground group-hover:text-purple-900 transition-colors">${ytdProfit.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Select defaultValue="2024">
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2024">2024</SelectItem>
              <SelectItem value="2023">2023</SelectItem>
              <SelectItem value="2022">2022</SelectItem>
            </SelectContent>
          </Select>
          <Select defaultValue="all">
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              <SelectItem value="rooms">Rooms</SelectItem>
              <SelectItem value="restaurant">Restaurant</SelectItem>
              <SelectItem value="services">Services</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card className="transition-all duration-300 hover:shadow-sm">
          <CardHeader>
            <CardTitle>Revenue vs Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} name="Revenue" />
                <Line type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={2} name="Expenses" />
                <Line type="monotone" dataKey="profit" stroke="#3b82f6" strokeWidth={2} name="Profit" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="transition-all duration-300 hover:shadow-sm">
          <CardHeader>
            <CardTitle>Revenue by Room Type</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <PieChart>
                <Pie
                  data={roomTypeRevenue}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ type, percentage }) => `${type}: ${percentage}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="revenue"
                >
                  {roomTypeRevenue.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Breakdown */}
      <Card className="mb-8 transition-all duration-300 hover:shadow-sm">
        <CardHeader>
          <CardTitle>Year-to-Date Revenue Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="revenue" fill="#3b82f6" name="Revenue" />
              <Bar dataKey="profit" fill="#10b981" name="Profit" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Revenue Sources */}
      <Card className="transition-all duration-300 hover:shadow-sm">
        <CardHeader>
          <CardTitle>Revenue Sources Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {monthlyComparison.map((item, index) => {
              const growth = ((item.current - item.previous) / item.previous * 100).toFixed(1);
              const isPositive = parseFloat(growth) >= 0;
              
              return (
                <div key={index} className="p-4 border border-border rounded-lg hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 transition-all duration-200">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-foreground">{item.category}</h3>
                    <Badge className={isPositive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                      {isPositive ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                      {growth}%
                    </Badge>
                  </div>
                  <div className="flex items-center gap-6">
                    <div>
                      <p className="text-muted-foreground">Current Month</p>
                      <p className="text-foreground">${item.current.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Previous Month</p>
                      <p className="text-muted-foreground">${item.previous.toLocaleString()}</p>
                    </div>
                    <div className="flex-1">
                      <div className="w-full bg-muted/80 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${isPositive ? 'bg-green-500' : 'bg-red-500'}`}
                          style={{ width: `${Math.min((item.current / Math.max(item.current, item.previous)) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
      </>
      )}

      {activeTab === 'channel' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold">Channel Manager Performance</h2>
            <select
              value={channelDateRange}
              onChange={(e) => setChannelDateRange(e.target.value)}
              className="text-sm px-3 py-2 border border-border rounded-md"
            >
              <option value="all">All Time</option>
              <option value="this_month">This Month</option>
              <option value="last_month">Last Month</option>
              <option value="this_year">This Year</option>
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <Card>
              <CardHeader>
                <CardTitle>Bookings by Channel</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={channelPieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label
                    >
                      {channelPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Revenue & Commissions (₹)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={channelRevenueData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => `₹${value.toLocaleString()}`} />
                    <Legend />
                    <Bar dataKey="Revenue" fill="#3b82f6" />
                    <Bar dataKey="NetRevenue" fill="#10b981" />
                    <Bar dataKey="Commission" fill="#ef4444" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Channel Performance Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted text-muted-foreground p-4">
                    <tr>
                      <th className="px-4 py-3 font-semibold rounded-tl-lg">Source Channel</th>
                      <th className="px-4 py-3 font-semibold text-right">Bookings</th>
                      <th className="px-4 py-3 font-semibold text-right">Gross Revenue</th>
                      <th className="px-4 py-3 font-semibold text-right">OTA Commission</th>
                      <th className="px-4 py-3 font-semibold text-right rounded-tr-lg">Net Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(channelStatsBySource).map(([src, stats]) => (
                      <tr key={src} className="border-b border-border/50 hover:bg-muted/30">
                        <td className="px-4 py-3 font-medium text-foreground">{src}</td>
                        <td className="px-4 py-3 text-right">{stats.count}</td>
                        <td className="px-4 py-3 text-right">₹{stats.revenue.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right text-red-500">₹{stats.commission.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right text-green-600 font-medium">₹{stats.netRevenue.toLocaleString()}</td>
                      </tr>
                    ))}
                    {Object.keys(channelStatsBySource).length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-muted-foreground">No bookings found for the selected date range.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
