import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  Users,
  MapPin,
  Settings,
  MoreVertical,
  ArrowUpRight,
  ChevronDown,
  Activity,
} from 'lucide-react';
import api from '../api';
import Navbar from '../components/Navbar';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('analytics');
  const [stats, setStats] = useState(null);
  const [topCities, setTopCities] = useState([]);

  // Security Verification
  useEffect(() => {
    let ignore = false;

    const verifyAdminAccess = async () => {
      try {
        const response = await api.get('/api/auth/me');
        const isAdmin = Boolean(response.data?.is_admin);
        if (ignore) return;
        if (!isAdmin) {
          navigate('/dashboard');
          return;
        }
        localStorage.setItem('is_admin', 'true');
        localStorage.setItem('username', response.data?.username || localStorage.getItem('username') || '');
      } catch {
        if (ignore) return;
        localStorage.removeItem('token');
        localStorage.removeItem('access_token');
        localStorage.removeItem('username');
        localStorage.removeItem('is_admin');
        navigate('/login');
      }
    };

    verifyAdminAccess();
    return () => {
      ignore = true;
    };
  }, [navigate]);

  useEffect(() => {
    const fetchAdminData = async () => {
      try {
        const [statsRes, topCitiesRes] = await Promise.all([
          api.get('/api/admin/stats'),
          api.get('/api/admin/analytics/top-cities')
        ]);
        setStats(statsRes.data);

        const cities = (topCitiesRes.data.top_destinations || []).map(city => ({
          name: city.city,
          count: city.visits
        }));
        setTopCities(cities);
      } catch (err) {
        console.error('Failed to fetch admin dashboard stats:', err);
      }
    };
    
    fetchAdminData();
  }, []);

  const recentUsers = stats?.recent_users || [];
  const tripAdoption = stats?.trip_adoption || [];
  const trendsData = stats?.trends || [];
  const destinationData = topCities.length > 0 ? topCities : [];
  const totalTripsCount = stats?.active_trips !== undefined ? stats.active_trips : 0;
  const totalUsersCount = stats?.total_users !== undefined ? stats.total_users : 0;

  return (
    <div className="min-h-screen bg-[#0b0c14] text-white selection:bg-blue-500/30">
      
      <Navbar />

      <main className="mx-auto max-w-400 px-6 pt-32 pb-24 space-y-12">
        
        {/* Secondary Nav & Toggles */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-8">
           <div className="space-y-1">
              <h1 className="text-4xl font-black uppercase tracking-tight">Command <span className="text-blue-500">Center</span></h1>
              <p className="text-slate-500 font-medium text-sm">
                System Status: <span className="text-green-500">{stats?.system_status || 'Operational'}</span>
              </p>
           </div>
           
           <div className="flex bg-[#161827] border border-white/10 p-1.5 rounded-full">
              {[
                { id: 'analytics', label: 'Analytics', icon: <TrendingUp size={14} /> },
                { id: 'users', label: 'Manage Users', icon: <Users size={14} /> },
                { id: 'cities', label: 'Popular Cities', icon: <MapPin size={14} /> },
                { id: 'settings', label: 'Settings', icon: <Settings size={14} /> }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-xs font-black uppercase tracking-widest transition-all ${
                    activeTab === tab.id 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
                    : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
           </div>
        </header>

        {/* Analytics Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
           
           {/* Card 1: User Management */}
           <section className="lg:col-span-5 bg-[#161827] border border-white/10 rounded-4xl p-8 flex flex-col space-y-8 shadow-2xl">
              <header className="flex items-center justify-between">
                 <div className="space-y-1">
                    <h2 className="text-xl font-black uppercase tracking-tight">Recent Signups ({totalUsersCount} Total)</h2>
                    <p className="text-[10px] text-white/30 uppercase tracking-[0.2em]">Live user onboarding</p>
                 </div>
                 <button className="p-2 hover:bg-white/5 rounded-xl transition-all">
                    <MoreVertical size={18} className="text-white/20" />
                 </button>
              </header>

              <div className="flex-1 space-y-6">
                 {recentUsers.map(user => (
                   <div key={user.id} className="flex items-center justify-between group">
                      <div className="flex items-center gap-4">
                         <div className="w-11 h-11 rounded-2xl bg-white/5 border border-white/5 overflow-hidden">
                            <img src={user.avatar} alt={user.name} />
                         </div>
                         <div>
                            <p className="text-sm font-black uppercase tracking-tight">{user.name}</p>
                            <p className="text-[10px] text-white/30">{user.email}</p>
                         </div>
                      </div>
                      <div className="flex items-center gap-4">
                         <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${
                           user.status === 'New' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'
                         }`}>
                           {user.status}
                         </span>
                         <button className="p-2 text-white/0 group-hover:text-white/20 hover:text-white transition-all">
                            <ArrowUpRight size={16} />
                         </button>
                      </div>
                   </div>
                 ))}
              </div>

              <button className="w-full py-4 bg-white/5 border border-white/10 rounded-3xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all">
                 View All System Users
              </button>
           </section>

           {/* Card 2: Trip Adoption (Pie Chart) */}
           <section className="lg:col-span-7 bg-[#161827] border border-white/10 rounded-4xl p-8 space-y-8 shadow-2xl overflow-hidden relative">
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/5 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2" />
              
              <header className="relative z-10 flex items-center justify-between">
                 <div className="space-y-1">
                    <h2 className="text-xl font-black uppercase tracking-tight">Trip Type Adoption</h2>
                    <p className="text-[10px] text-white/30 uppercase tracking-[0.2em]">Preferred travel styles</p>
                 </div>
                 <div className="flex gap-2">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-lg border border-white/10">
                       <div className="w-2 h-2 rounded-full bg-blue-500" />
                       <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Popular</span>
                    </div>
                 </div>
              </header>

              <div className="h-75 w-full relative z-10">
                 <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                       <Pie
                         data={tripAdoption}
                         cx="50%"
                         cy="50%"
                         innerRadius={80}
                         outerRadius={120}
                         paddingAngle={8}
                         dataKey="value"
                       >
                         {tripAdoption.map((entry, index) => (
                           <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                         ))}
                       </Pie>
                       <Tooltip 
                        contentStyle={{ backgroundColor: '#161827', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px' }}
                        itemStyle={{ color: '#fff', fontSize: '12px' }}
                       />
                    </PieChart>
                 </ResponsiveContainer>
                 {/* Center Label */}
                 <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <p className="text-3xl font-black text-white">{totalTripsCount}</p>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Total Trips</p>
                 </div>
              </div>
           </section>

           {/* Card 3: Top Destinations (Bar Chart) */}
           <section className="lg:col-span-8 bg-[#161827] border border-white/10 rounded-4xl p-8 space-y-8 shadow-2xl relative overflow-hidden">
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-600/5 blur-3xl rounded-full -translate-x-1/2 translate-y-1/2" />
              
              <header className="relative z-10 flex items-center justify-between">
                 <div className="space-y-1">
                    <h2 className="text-xl font-black uppercase tracking-tight">Global Demand</h2>
                    <p className="text-[10px] text-white/30 uppercase tracking-[0.2em]">Top cities by itinerary count</p>
                 </div>
                 <button className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all">
                    Last 30 Days <ChevronDown size={14} />
                 </button>
              </header>

              <div className="h-75 w-full relative z-10">
                 <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={destinationData}>
                       <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                       <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: 900 }}
                       />
                       <YAxis hide />
                       <Tooltip 
                        cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                        contentStyle={{ backgroundColor: '#161827', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px' }}
                       />
                       <Bar dataKey="count" radius={[10, 10, 0, 0]}>
                         {destinationData.map((entry, index) => (
                           <Cell key={`cell-${index}`} fill={`url(#barGradient)`} />
                         ))}
                       </Bar>
                       <defs>
                          <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                             <stop offset="0%" stopColor="#3b82f6" />
                             <stop offset="100%" stopColor="#6366f1" />
                          </linearGradient>
                       </defs>
                    </BarChart>
                 </ResponsiveContainer>
              </div>
           </section>

           {/* Card 4: Activity Trends (Line Chart) */}
           <section className="lg:col-span-4 bg-[#161827] border border-white/10 rounded-4xl p-8 space-y-8 shadow-2xl overflow-hidden relative">
              <header className="flex items-center justify-between">
                 <div className="space-y-1">
                    <h2 className="text-xl font-black uppercase tracking-tight">Growth Trends</h2>
                    <p className="text-[10px] text-white/30 uppercase tracking-[0.2em]">New itineraries per day</p>
                 </div>
              </header>

              <div className="space-y-2">
                 <div className="flex items-end gap-2">
                    <p className="text-4xl font-black">+24%</p>
                    <div className="flex items-center text-green-500 mb-1">
                       <ArrowUpRight size={16} strokeWidth={3} />
                    </div>
                 </div>
                 <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">vs last month</p>
              </div>

              <div className="h-50 w-full">
                 <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendsData}>
                       <defs>
                          <linearGradient id="colorTrips" x1="0" y1="0" x2="0" y2="1">
                             <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                             <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                          </linearGradient>
                       </defs>
                       <Tooltip 
                        contentStyle={{ backgroundColor: '#161827', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px' }}
                       />
                       <Area 
                        type="monotone" 
                        dataKey="trips" 
                        stroke="#6366f1" 
                        strokeWidth={3} 
                        fillOpacity={1} 
                        fill="url(#colorTrips)" 
                       />
                    </AreaChart>
                 </ResponsiveContainer>
              </div>
              
              <div className="pt-4 flex items-center justify-between">
                 <div className="flex items-center gap-2">
                    <Activity size={14} className="text-blue-500" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Peak Volume: 92/day</span>
                 </div>
              </div>
           </section>

        </div>
      </main>

      <footer className="py-20 text-center border-t border-white/5">
         <p className="text-[10px] text-white/5 font-black uppercase tracking-[0.5em]">Traveloop Operations • Internal Secure Monitor</p>
      </footer>
    </div>
  );
}
