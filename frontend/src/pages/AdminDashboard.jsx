import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Users,
  TrendingUp,
  MapPin,
  Calendar,
  Search,
  Filter,
  ArrowUpRight,
  MoreVertical,
  Activity,
  Globe,
  LayoutDashboard,
  ShieldCheck,
  Settings,
  ChevronDown,
} from 'lucide-react';
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

const USER_DATA = [
  { id: 1, name: 'Alex Rivera', email: 'alex@traveloop.com', status: 'Active', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex' },
  { id: 2, name: 'Sarah Chen', email: 'sarah@globetrotter.io', status: 'New', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah' },
  { id: 3, name: 'Marcus Bell', email: 'marcus.b@gmail.com', status: 'Active', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Marcus' },
  { id: 4, name: 'Elena Petrova', email: 'elena@explore.ru', status: 'Active', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Elena' },
];

const TRIP_ADOPTION_DATA = [
  { name: 'Adventure', value: 400 },
  { name: 'Relaxation', value: 300 },
  { name: 'Foodie', value: 300 },
  { name: 'Culture', value: 200 },
];

const DESTINATION_DATA = [
  { name: 'Singapore', count: 450 },
  { name: 'Tokyo', count: 380 },
  { name: 'Dubai', count: 320 },
  { name: 'Paris', count: 290 },
  { name: 'Rome', count: 250 },
];

const TRENDS_DATA = [
  { day: '01', trips: 12 },
  { day: '05', trips: 18 },
  { day: '10', trips: 45 },
  { day: '15', trips: 32 },
  { day: '20', trips: 68 },
  { day: '25', trips: 55 },
  { day: '30', trips: 92 },
];

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('analytics');

  // Security Placeholder for Hackathon Demo
  React.useEffect(() => {
    const userRole = localStorage.getItem('user_role'); // Placeholder for role-based auth
    const username = localStorage.getItem('username');
    
    // For demo: Allow if username contains 'admin' or if role is explicitly set
    const isAdmin = userRole === 'admin' || username?.toLowerCase().includes('admin');
    
    if (!isAdmin) {
      // navigate('/dashboard'); // Uncomment to enable redirection
      console.warn("Non-admin user accessed the dashboard. Redirection is currently disabled for demo purposes.");
    }
  }, [navigate]);

  return (
    <div className="min-h-screen bg-[#0b0c14] text-white selection:bg-blue-500/30">
      
      {/* Admin Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-[#0b0c14]/80 px-6 py-4 backdrop-blur-md">
        <div className="mx-auto flex max-w-400 items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <ShieldCheck size={18} />
            </div>
            <div className="flex flex-col -space-y-1">
              <span className="text-sm font-black tracking-tighter uppercase">Traveloop</span>
              <span className="text-[10px] font-black uppercase text-blue-500 tracking-widest">Admin Panel</span>
            </div>
          </Link>

          {/* Search Bar */}
          <div className="hidden lg:flex flex-1 max-w-xl mx-12">
            <div className="relative w-full">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20" size={18} />
              <input 
                type="text" 
                placeholder="Search users, trips, or system logs..."
                className="w-full pl-14 pr-6 py-3 bg-[#161827] border border-white/10 rounded-full focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-sm"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
             <button className="p-2.5 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 transition-all relative">
                <Activity size={18} className="text-blue-400" />
                <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-[#0b0c14] rounded-full" />
             </button>
             <div className="h-8 w-px bg-white/5 mx-2" />
             <div className="flex items-center gap-3">
                <div className="text-right">
                   <p className="text-xs font-black uppercase">Root Admin</p>
                   <p className="text-[10px] text-white/40">Superuser Access</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-white/10 border border-white/10 overflow-hidden">
                   <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Admin" alt="Admin" />
                </div>
             </div>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-400 px-6 pt-32 pb-24 space-y-12">
        
        {/* Secondary Nav & Toggles */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-8">
           <div className="space-y-1">
              <h1 className="text-4xl font-black uppercase tracking-tight">Command <span className="text-blue-500">Center</span></h1>
              <p className="text-slate-500 font-medium text-sm">System Status: <span className="text-green-500">All Nodes Operational</span></p>
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
                    <h2 className="text-xl font-black uppercase tracking-tight">Recent Signups</h2>
                    <p className="text-[10px] text-white/30 uppercase tracking-[0.2em]">Live user onboarding</p>
                 </div>
                 <button className="p-2 hover:bg-white/5 rounded-xl transition-all">
                    <MoreVertical size={18} className="text-white/20" />
                 </button>
              </header>

              <div className="flex-1 space-y-6">
                 {USER_DATA.map(user => (
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
                         data={TRIP_ADOPTION_DATA}
                         cx="50%"
                         cy="50%"
                         innerRadius={80}
                         outerRadius={120}
                         paddingAngle={8}
                         dataKey="value"
                       >
                         {TRIP_ADOPTION_DATA.map((entry, index) => (
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
                    <p className="text-3xl font-black text-white">1.2K</p>
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
                    <BarChart data={DESTINATION_DATA}>
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
                         {DESTINATION_DATA.map((entry, index) => (
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
                    <AreaChart data={TRENDS_DATA}>
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
