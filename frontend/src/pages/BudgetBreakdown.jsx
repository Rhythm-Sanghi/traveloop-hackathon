import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  FileText,
  Download,
  Printer,
  CheckCircle,
  AlertTriangle,
  Wallet,
  PieChart as PieIcon,
  Loader2,
  TrendingUp,
  CreditCard,
  Receipt,
  MapPin,
  Calendar,
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
} from 'recharts';
import api from '../api';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

export default function BudgetBreakdown() {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isPaid, setIsPaid] = useState(false);

  const getImageUrl = (url) => {
    if (!url) return "https://images.unsplash.com/photo-1506929113675-80af2454a32b?auto=format&fit=crop&w=300&q=80";
    if (url.startsWith('http')) return url;
    return `http://localhost:8000${url.startsWith('/') ? '' : '/'}${url}`;
  };

  useEffect(() => {
    const fetchTripDetails = async () => {
      if (!tripId) {
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        const response = await api.get(`/api/trips/${tripId}`);
        if (response.data) {
          setTrip(response.data);
        } else {
          setTrip(null);
        }
      } catch (err) {
        console.error('Budget fetch failed:', err);
        setTrip(null);
      } finally {
        setLoading(false);
      }
    };
    fetchTripDetails();
  }, [tripId]);

  const financialData = useMemo(() => {
    if (!trip) return null;

    // 1. Map all activities into a single expenses array
    const items = [];
    if (trip.stops) {
      trip.stops.forEach((stop, stopIdx) => {
        if (stop.activities) {
          stop.activities.forEach((activity, actIdx) => {
            const cost = typeof activity === 'object' ? (parseFloat(activity.cost) || 0) : 0;
            items.push({
              id: `${stopIdx}-${actIdx}`, // Unique ID for table rows
              name: typeof activity === 'object' ? activity.name : activity,
              category: (typeof activity === 'object' && activity.category) ? activity.category : 'General',
              city: stop.city_name || 'Various',
              cost: cost,
            });
          });
        }
      });
    }

    // 2. Financial Logic
    const subtotal = items.reduce((sum, item) => sum + item.cost, 0);
    const tax = subtotal * 0.05;
    const grandTotal = subtotal + tax;
    const plannedBudget = trip.total_budget || 0;

    // 3. Chart Data (Group by Category)
    const breakdown = trip.budget?.breakdown || {};
    // Ensure we only show categories with actual value > 0
    const chartData = Object.entries(breakdown)
      .filter(([_, value]) => value > 0)
      .map(([name, value]) => ({ name, value }));

    // Fallback for chart if breakdown is empty but we have items
    if (chartData.length === 0 && items.length > 0) {
      const manualBreakdown = items.reduce((acc, item) => {
        acc[item.category] = (acc[item.category] || 0) + item.cost;
        return acc;
      }, {});
      Object.entries(manualBreakdown).forEach(([name, value]) => {
        if (value > 0) chartData.push({ name, value });
      });
    }

    return {
      subtotal,
      tax,
      grandTotal,
      plannedBudget,
      items,
      chartData,
      isOverBudget: grandTotal > plannedBudget,
      remaining: plannedBudget - grandTotal
    };
  }, [trip]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b0c14] flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="min-h-screen bg-[#0b0c14] flex flex-col items-center justify-center text-white space-y-4">
        <AlertTriangle size={48} className="text-rose-500" />
        <p className="text-xl font-black uppercase tracking-tight">Financial record not found</p>
        <button onClick={() => navigate('/dashboard')} className="px-6 py-2 bg-white/5 border border-white/10 rounded-full text-xs font-black uppercase tracking-widest hover:bg-white/10 transition-all">
          Return to Hub
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0c14] text-white selection:bg-blue-500/30 pb-32">
      {/* Header */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0b0c14]/80 backdrop-blur-md border-b border-white/5 px-6 py-4 flex justify-between items-center">
        <Link to="/dashboard" className="flex items-center gap-4 group">
          <ArrowLeft size={18} className="text-white/40 group-hover:text-white group-hover:-translate-x-1 transition-all" />
          <span className="text-xs font-black uppercase tracking-widest">Back to My Trips</span>
        </Link>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
            <div className="w-4 h-4 bg-[#0b0c14] rounded-sm rotate-45" />
          </div>
          <span className="text-xl font-black tracking-tighter uppercase">Traveloop</span>
        </div>
      </nav>

      <main className="max-w-350 mx-auto px-6 pt-32 space-y-12">
        
        {/* Invoice Header Card */}
        <section className="bg-[#161827] border border-white/10 rounded-4xl p-10 flex flex-col lg:flex-row justify-between items-center gap-8 shadow-2xl relative overflow-hidden">
           <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/5 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2" />
           
           <div className="flex items-center gap-8 relative z-10">
              <div className="w-24 h-24 rounded-3xl overflow-hidden border-2 border-white/10 shadow-2xl">
                 <img 
                  src={getImageUrl(trip.image_url)} 
                  className="w-full h-full object-cover"
                  alt={trip.name || "Trip"}
                  onError={(e) => {
                    e.target.src = "https://images.unsplash.com/photo-1506929113675-80af2454a32b?auto=format&fit=crop&w=300&q=80";
                  }}
                 />
              </div>
              <div className="space-y-2">
                 <h1 className="text-4xl font-black uppercase tracking-tight">{trip.name}</h1>
                 <div className="flex items-center gap-4 text-slate-500 text-xs font-bold uppercase tracking-widest">
                    <span className="flex items-center gap-2"><MapPin size={14} /> {trip.stops.length} Cities</span>
                    <span className="flex items-center gap-2"><Calendar size={14} /> {trip.start_date}</span>
                 </div>
              </div>
           </div>

           <div className="flex flex-col items-center lg:items-end gap-4 relative z-10">
              <div className="text-center lg:text-right">
                 <p className="text-[10px] font-black uppercase tracking-widest text-white/20">Invoice ID: TRP-{trip.id}-2026</p>
                 <p className="text-xs font-bold text-slate-400">Generated: {new Date().toLocaleDateString()}</p>
              </div>
              <div className={`px-6 py-2 rounded-full border flex items-center gap-2 transition-all ${
                isPaid 
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.1)]' 
                : 'bg-orange-500/10 border-orange-500/20 text-orange-400 animate-pulse'
              }`}>
                 <div className={`w-2 h-2 rounded-full ${isPaid ? 'bg-emerald-500' : 'bg-orange-500'}`} />
                 <span className="text-[10px] font-black uppercase tracking-widest">
                    Payment Status: {isPaid ? 'Settled' : 'Pending'}
                 </span>
              </div>
           </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
           
           {/* Itemized Table */}
           <div className="lg:col-span-8 bg-[#161827] border border-white/10 rounded-4xl shadow-2xl overflow-hidden">
              <header className="bg-white/5 border-b border-white/5 p-8 flex items-center justify-between">
                 <div className="flex items-center gap-3">
                    <Receipt size={20} className="text-blue-500" />
                    <h2 className="text-xl font-black uppercase tracking-tight">Itemized Breakdown</h2>
                 </div>
                 <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{financialData.items.length} Entries</span>
              </header>

              <div className="overflow-x-auto">
                 <table className="w-full text-left">
                    <thead className="bg-white/2 text-[10px] font-black uppercase tracking-widest text-slate-500 border-b border-white/5">
                       <tr>
                          <th className="px-8 py-6">Description</th>
                          <th className="px-8 py-6">Category</th>
                          <th className="px-8 py-6">Location</th>
                          <th className="px-8 py-6 text-right">Amount</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                       {financialData.items.length > 0 ? (
                         financialData.items.map((item) => (
                           <tr key={item.id} className="group hover:bg-white/2 transition-all">
                              <td className="px-8 py-6 text-sm font-bold text-white group-hover:text-blue-400 transition-colors">
                                 {item.name}
                              </td>
                              <td className="px-8 py-6">
                                 <span className="px-3 py-1 bg-white/5 border border-white/5 rounded-full text-[8px] font-black uppercase tracking-widest text-slate-400">
                                    {item.category}
                                 </span>
                              </td>
                              <td className="px-8 py-6 text-xs font-medium text-slate-500">
                                 {item.city}
                              </td>
                              <td className="px-8 py-6 text-right font-black text-sm">
                                 ₹{item.cost.toLocaleString()}
                              </td>
                           </tr>
                         ))
                       ) : (
                         <tr>
                           <td colSpan="4" className="px-8 py-20 text-center">
                              <div className="flex flex-col items-center gap-4 text-slate-500">
                                 <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">
                                    <Receipt size={20} className="opacity-20" />
                                 </div>
                                 <p className="text-xs font-black uppercase tracking-widest">No expenses recorded yet</p>
                                 <Link to={`/trip/${tripId}/edit`} className="text-[10px] text-blue-500 hover:underline font-black uppercase tracking-widest">Add activities to get started</Link>
                              </div>
                           </td>
                         </tr>
                       )}
                    </tbody>
                 </table>
              </div>

              {/* Totals Block */}
              <footer className="p-8 bg-linear-to-br from-white/2 to-blue-600/5 space-y-4 border-t border-white/5">
                 <div className="flex justify-between items-center text-slate-400">
                    <span className="text-xs font-black uppercase tracking-widest">Subtotal</span>
                    <span className="font-bold">₹{financialData.subtotal.toLocaleString()}</span>
                 </div>
                 <div className="flex justify-between items-center text-slate-400">
                    <span className="text-xs font-black uppercase tracking-widest">Gov. Tax (5%)</span>
                    <span className="font-bold">₹{financialData.tax.toLocaleString()}</span>
                 </div>
                 <div className="pt-4 border-t border-white/10 flex justify-between items-center">
                    <div className="space-y-1">
                       <span className="text-xs font-black uppercase tracking-widest text-blue-500">Grand Total</span>
                       <p className="text-[10px] text-slate-500 uppercase tracking-widest">Fully inclusive of all activities</p>
                    </div>
                    <span className="text-4xl font-black text-white">₹{financialData.grandTotal.toLocaleString()}</span>
                 </div>
              </footer>
           </div>

           {/* Budget Insights Sidebar */}
           <aside className="lg:col-span-4 space-y-8">
              <section className="bg-[#161827] border border-white/10 rounded-3xl p-8 shadow-2xl space-y-8 relative overflow-hidden min-h-75">
                 <div className="absolute bottom-0 right-0 w-32 h-32 bg-blue-600/5 blur-3xl rounded-full translate-x-1/2 translate-y-1/2" />
                 
                 <header className="flex items-center gap-3 relative z-10">
                    <PieIcon size={18} className="text-emerald-500" />
                    <h2 className="text-lg font-black uppercase tracking-tight">Budget Insights</h2>
                 </header>
 
                  <div className="w-full h-80 min-w-0 flex items-center justify-center relative z-10">
                    {financialData?.chartData?.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={financialData.chartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                            isAnimationActive={false}
                          >
                            {financialData.chartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <RechartsTooltip 
                            contentStyle={{ backgroundColor: '#161827', border: 'none', borderRadius: '12px' }}
                            itemStyle={{ color: '#fff', fontSize: '10px', fontWeight: 'bold' }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex flex-col items-center gap-3 text-slate-500 font-bold uppercase tracking-widest text-[10px]">
                        <PieIcon size={24} className="opacity-20" />
                        No data available
                      </div>
                    )}
                 </div>
 
                 <div className="space-y-4 relative z-10">
                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                       <div className="flex items-center gap-3">
                          <Wallet size={16} className="text-blue-500" />
                          <span className="text-[10px] font-black uppercase tracking-widest">Total Budget</span>
                       </div>
                       <span className="font-bold">₹{financialData.plannedBudget.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                       <div className="flex items-center gap-3">
                          <TrendingUp size={16} className="text-rose-500" />
                          <span className="text-[10px] font-black uppercase tracking-widest">Total Spent</span>
                       </div>
                       <span className="font-bold">₹{financialData.grandTotal.toLocaleString()}</span>
                    </div>
                    <div className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
                      financialData.isOverBudget 
                      ? 'bg-rose-500/10 border-rose-500/20 shadow-[0_0_20px_rgba(244,63,94,0.1)]' 
                      : 'bg-emerald-500/10 border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.1)]'
                    }`}>
                       <div className="flex items-center gap-3">
                          {financialData.isOverBudget ? <AlertTriangle size={16} className="text-rose-500" /> : <CheckCircle size={16} className="text-emerald-500" />}
                          <span className={`text-[10px] font-black uppercase tracking-widest ${financialData.isOverBudget ? 'text-rose-400' : 'text-emerald-400'}`}>
                             {financialData.isOverBudget ? 'Deficit' : 'Remaining'}
                          </span>
                       </div>
                       <span className={`font-black ${financialData.isOverBudget ? 'text-rose-500' : 'text-emerald-500'}`}>
                          ₹{Math.abs(financialData.remaining).toLocaleString()}
                       </span>
                    </div>
                 </div>
              </section>

              <div className="p-8 bg-blue-600/5 border border-blue-500/20 rounded-4xl flex flex-col items-center text-center space-y-4">
                 <CreditCard size={32} className="text-blue-500" />
                 <div className="space-y-1">
                    <p className="text-xs font-black uppercase tracking-widest">Smart Traveloop Savings</p>
                    <p className="text-[10px] text-slate-500 font-medium">We've saved you ₹12,400 on this trip using platform group discounts.</p>
                 </div>
              </div>
           </aside>
        </div>

        {/* Global Action Buttons */}
        <footer className="flex flex-col sm:flex-row justify-center items-center gap-6 pt-12 border-t border-white/5">
           <button className="flex items-center justify-center gap-3 px-10 py-5 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 transition-all group">
              <Download size={20} className="text-white/40 group-hover:text-white group-hover:translate-y-0.5 transition-all" />
              <span className="text-[10px] font-black uppercase tracking-widest">Download Invoice</span>
           </button>
           <button className="flex items-center justify-center gap-3 px-10 py-5 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 transition-all group">
              <Printer size={20} className="text-white/40 group-hover:text-white transition-all" />
              <span className="text-[10px] font-black uppercase tracking-widest">Export as PDF</span>
           </button>
           <button 
            onClick={() => setIsPaid(!isPaid)}
            className={`flex items-center justify-center gap-3 px-12 py-5 rounded-full font-black text-xs uppercase tracking-[0.2em] transition-all shadow-2xl active:scale-[0.98] ${
              isPaid 
              ? 'bg-white/10 text-white border border-white/20' 
              : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-600/20'
            }`}
           >
              {isPaid ? <CheckCircle size={20} /> : <FileText size={20} />}
              {isPaid ? 'Payment Confirmed' : 'Mark as Settled'}
           </button>
        </footer>
      </main>

      <footer className="py-24 text-center">
         <p className="text-[10px] text-white/5 font-black uppercase tracking-[0.5em]">Traveloop Financial Services • Secure Ledger</p>
      </footer>
    </div>
  );
}
