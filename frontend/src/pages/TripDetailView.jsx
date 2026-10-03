import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  MapPin,
  Clock,
  Wallet,
  Calendar,
  ArrowLeft,
  Loader2,
  Share2,
  Download,
  MoreVertical,
  Layers,
  LayoutGrid,
  Compass,
  Banknote,
} from 'lucide-react';
import api from '../api';
import Navbar from '../components/Navbar';
import { resolveApiUrl } from '../utils/media';

export default function TripDetailView() {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'calendar'
  const [isPublic, setIsPublic] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isOfflineSnapshot, setIsOfflineSnapshot] = useState(false);
  const cacheKey = useMemo(
    () => `traveloop:private:${localStorage.getItem('auth_user_id') || localStorage.getItem('username')}:trip:${tripId}:itinerary`,
    [tripId],
  );

  const getImageUrl = (url) => {
    return resolveApiUrl(url, "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=2000&q=80");
  };

  const fetchTripData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/trips/${tripId}/itinerary`);
      setTrip(response.data);
      setIsPublic(response.data.is_public === 1);
      localStorage.setItem(cacheKey, JSON.stringify({
        trip: response.data,
        savedAt: new Date().toISOString(),
      }));
      setIsOfflineSnapshot(false);
    } catch (err) {
      console.error('Error fetching trip details:', err);
      try {
        const cached = JSON.parse(localStorage.getItem(cacheKey) || 'null');
        if (cached?.trip) {
          setTrip(cached.trip);
          setIsPublic(cached.trip.is_public === 1);
          setIsOfflineSnapshot(true);
        }
      } catch (cacheError) {
        console.error('Trip offline snapshot could not be read:', cacheError);
      }
    } finally {
      setLoading(false);
    }
  }, [tripId, cacheKey]);

  useEffect(() => {
    queueMicrotask(fetchTripData);
  }, [fetchTripData]);

  const handlePublishToggle = async () => {
    if (isOfflineSnapshot) return;
    try {
      const response = await api.post(`/api/trips/${tripId}/publish`);
      setIsPublic(response.data.is_public === 1);
    } catch (err) {
      console.error('Error toggling trip publish status:', err);
    }
  };

  const handleCopyLink = () => {
    const publicUrl = `${window.location.origin}/trip/public/${tripId}`;
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const totalStats = useMemo(() => {
    if (!trip || !trip.stops) return { budget: 0, days: 0 };
    
    const totalCost = trip.stops.reduce((sum, stop) => {
      const stopBudget = parseFloat(stop.budget) || 0;
      const activitiesCost = (stop.activities || []).reduce((acc, act) => {
          const cost = typeof act === 'object' ? parseFloat(act.cost) || 0 : 0;
          return acc + cost;
      }, 0);
      return sum + stopBudget + activitiesCost;
    }, 0);
    
    const start = new Date(trip.start_date);
    const end = new Date(trip.end_date);
    const diffTime = Math.abs(end - start);
    const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    return { budget: totalCost, days };
  }, [trip]);

  // Dynamic Calendar Days based on trip duration with padding for weekdays
  const calendarDays = useMemo(() => {
    if (!trip || !trip.start_date || !trip.end_date) return [];
    const days = [];
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const start = new Date(trip.start_date);
    const end = new Date(trip.end_date);
    
    // Add empty padding days to align with starting day of the week
    const startDayOfWeek = start.getDay(); // 0 (Sun) to 6 (Sat)
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push({ isPadding: true });
    }
    
    const current = new Date(start);
    let count = 0;
    while (current <= end && count < 90) { // Limit to 90 days max
      days.push({
        dateString: current.toISOString().split('T')[0],
        day: current.getDate(),
        month: current.toLocaleString('default', { month: 'short' }),
        weekday: weekdays[current.getDay()],
        isPadding: false
      });
      current.setDate(current.getDate() + 1);
      count++;
    }
    return days;
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
      <div className="min-h-screen bg-[#0b0c14] flex flex-col items-center justify-center p-6 text-center">
        <h2 className="text-2xl font-black uppercase text-white mb-4">Trip not found</h2>
        <button 
          onClick={() => navigate('/dashboard')}
          className="px-8 py-3 bg-white text-black rounded-full font-black text-xs uppercase tracking-widest"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0c14] text-white selection:bg-blue-500/30 pb-32">
      <Navbar />
      
      {/* Hero Header */}
      <section className="relative h-[50vh] min-h-[400px] w-full overflow-hidden">
        <img 
          src={getImageUrl(trip.image_url)} 
          alt="Destination" 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0b0c14] via-[#0b0c14]/60 to-transparent" />
        
        {/* Top Controls */}
        <div className="absolute top-24 left-0 right-0 p-6 flex justify-between items-center z-20">
          <button 
            onClick={() => navigate(`/trip/${tripId}/edit`)}
            className="flex items-center gap-2 px-5 py-2.5 bg-black/40 backdrop-blur-md border border-white/10 rounded-full hover:bg-black/60 transition-all group"
          >
            <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
            <span className="text-xs font-black uppercase tracking-widest">Back to Builder</span>
          </button>

          <div className="flex items-center gap-3">
            <button 
              onClick={handlePublishToggle}
              className={`px-4 py-2 border rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${isPublic ? 'bg-blue-600/30 border-blue-500 text-blue-400 hover:bg-blue-600/50' : 'bg-white/5 border-white/10 text-white/40 hover:text-white hover:bg-white/10'}`}
            >
              {isPublic ? '🌐 Public Feed' : '🔒 Private'}
            </button>
            {isPublic && (
              <button 
                onClick={handleCopyLink}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 hover:text-white transition-all active:scale-95 shadow-md shadow-emerald-500/10"
              >
                <Share2 size={12} />
                {copied ? 'Copied!' : 'Copy Link'}
              </button>
            )}
            <button aria-label="Download itinerary" className="p-2.5 bg-black/40 backdrop-blur-md border border-white/10 rounded-full hover:bg-white/10 transition-all">
              <Download size={18} />
            </button>
          </div>
        </div>

        {/* Hero Content */}
        <div className="absolute bottom-0 left-0 right-0 p-10 max-w-4xl mx-auto text-center space-y-6">
          <div className="space-y-2">
            <h1 className="text-5xl md:text-7xl font-black uppercase tracking-tighter leading-none">
              {trip.name}
            </h1>
            <div className="flex items-center justify-center gap-4 text-sm font-bold text-blue-400">
              <div className="flex items-center gap-2">
                <Calendar size={16} />
                <span>{new Date(trip.start_date).toLocaleDateString()} — {new Date(trip.end_date).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-center gap-6">
            <div className="inline-flex p-1.5 bg-white/5 backdrop-blur-xl border border-white/10 rounded-full shadow-2xl">
              <button 
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'list' ? 'bg-white text-black' : 'text-white/40 hover:text-white'}`}
              >
                <LayoutGrid size={14} />
                List
              </button>
              <button 
                onClick={() => setViewMode('calendar')}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'calendar' ? 'bg-white text-black' : 'text-white/40 hover:text-white'}`}
              >
                <Calendar size={14} />
                Calendar
              </button>
            </div>

            <button 
              onClick={() => navigate(`/trip/${tripId}/budget`)}
              className="flex items-center gap-3 px-8 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-[10px] font-black uppercase tracking-widest transition-all group shadow-2xl"
            >
               <Wallet size={16} className="text-emerald-500 group-hover:scale-110 transition-transform" />
               Financial Summary
            </button>
          </div>
        </div>
      </section>

      {/* Content Section */}
      <main className="max-w-4xl mx-auto px-6 py-20 relative min-h-[600px]">
        {isOfflineSnapshot && (
          <div className="mb-8 rounded-2xl border border-amber-400/20 bg-amber-400/10 px-5 py-4 text-xs font-bold text-amber-200">
            Travel Mode: showing the last saved itinerary snapshot. Editing and publishing require a connection.
          </div>
        )}
        {viewMode === 'list' ? (
          <div className="relative animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Timeline Line */}
            <div className="absolute left-10 top-20 bottom-20 w-[1px] bg-gradient-to-b from-blue-500/50 via-white/10 to-transparent hidden md:block" />

            <div className="space-y-24 relative z-10">
              {trip.stops && trip.stops.map((stop) => (
                <div key={stop.id} className="space-y-10 group">
                  
                  {/* City Header */}
                  <div className="flex items-center gap-6 md:-ml-4">
                    <div className="w-8 h-8 rounded-full bg-blue-600 border-4 border-[#0b0c14] hidden md:flex items-center justify-center shadow-[0_0_20px_rgba(37,99,235,0.4)]">
                      <MapPin size={12} className="text-white" />
                    </div>
                    <div className="space-y-1">
                      <h2 className="text-3xl font-black uppercase tracking-tight">{stop.city_name}</h2>
                      <p className="text-blue-400 text-[10px] font-black uppercase tracking-[0.2em]">
                        {new Date(stop.arrival_date).toLocaleDateString()} — {new Date(stop.departure_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {/* Activity Cards */}
                  <div className="grid gap-6 md:pl-10">
                    {stop.activities && stop.activities.length > 0 ? (
                      stop.activities.map((activity, idx) => (
                        <div 
                          key={idx} 
                          className="bg-[#161827] border border-white/5 p-6 rounded-3xl flex items-center justify-between hover:border-white/20 transition-all hover:scale-[1.01] shadow-xl group/card"
                        >
                          <div className="flex items-center gap-5">
                            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center group-hover/card:bg-blue-600 transition-colors duration-500">
                              <Layers size={20} className="text-white/40 group-hover/card:text-white" />
                            </div>
                            <div>
                              <h4 className="text-lg font-black uppercase tracking-tight mb-1">
                                {typeof activity === 'object' ? activity.name : activity}
                              </h4>
                              <div className="flex items-center gap-3">
                                <span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase">
                                  <Clock size={12} />
                                  Planned
                                </span>
                                {typeof activity === 'object' && activity.cost > 0 && (
                                  <>
                                    <span className="w-1 h-1 rounded-full bg-white/10" />
                                    <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest flex items-center gap-1">
                                      <Wallet size={10} />
                                      ₹{activity.cost.toLocaleString()}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-4">
                             {typeof activity === 'object' && activity.cost > 0 && (
                               <div className="text-right hidden sm:block">
                                 <p className="text-xs font-black text-white/80">₹{activity.cost.toLocaleString()}</p>
                                 <p className="text-[8px] font-black text-white/20 uppercase tracking-widest">Est. Cost</p>
                               </div>
                             )}
                            <button aria-label={`More options for ${typeof activity === 'object' ? activity.name : activity}`} className="p-2 text-white/20 hover:text-white transition-colors">
                              <MoreVertical size={20} />
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-10 border border-dashed border-white/5 rounded-3xl text-center">
                        <p className="text-slate-600 text-xs font-black uppercase tracking-widest">No activities planned</p>
                      </div>
                    )}
                    
                    {/* Stop Notes & Budget */}
                    {(stop.description || stop.budget > 0) && (
                      <div className="flex flex-col md:flex-row gap-6">
                        {stop.description && (
                          <div className="flex-1 bg-white/[0.02] p-6 rounded-3xl border-l-4 border-blue-500/40">
                            <p className="text-slate-400 text-sm italic">"{stop.description}"</p>
                          </div>
                        )}
                        {stop.budget > 0 && (
                          <div className="w-full md:w-48 bg-emerald-500/5 p-6 rounded-3xl border border-emerald-500/20 flex flex-col justify-center">
                             <p className="text-[10px] font-black text-emerald-500/60 uppercase tracking-widest mb-1">Stop Budget</p>
                             <p className="text-xl font-black text-emerald-400">₹{stop.budget.toLocaleString()}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Calendar View Placeholder */
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <header className="mb-10 text-center space-y-2">
              <h2 className="text-2xl font-black uppercase tracking-tight">Trip <span className="text-blue-500">Timeline</span></h2>
              <p className="text-slate-500 text-xs font-black uppercase tracking-widest">Visual Calendar View</p>
            </header>

            <div className="bg-[#161827] rounded-[2.5rem] border border-white/10 overflow-hidden shadow-2xl">
              {/* Weekdays Header */}
              <div className="grid grid-cols-7 border-b border-white/5 bg-white/[0.02]">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="py-4 text-center text-[10px] font-black uppercase tracking-widest text-white/20">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 min-h-[400px]">
                {calendarDays.map((item, i) => {
                   if (item.isPadding) {
                     return <div key={i} className="aspect-square border-r border-b border-white/5 bg-white/[0.01]" />;
                   }

                   const stopOnThisDay = trip.stops?.find(s => {
                      return item.dateString >= s.arrival_date && item.dateString <= s.departure_date;
                   });

                   const isFirstOfMonthOrTrip = i === 0 || (calendarDays[i-1] && !calendarDays[i-1].isPadding && calendarDays[i-1].month !== item.month);

                   return (
                    <div key={i} className="aspect-square border-r border-b border-white/5 p-4 relative group hover:bg-white/[0.02] transition-colors">
                      <span className={`text-xs font-bold ${stopOnThisDay ? 'text-white' : 'text-white/20'} group-hover:text-blue-400 transition-colors`}>
                        {isFirstOfMonthOrTrip ? `${item.month} ${item.day}` : item.day}
                      </span>
                      
                      {stopOnThisDay && (
                        <div className="absolute inset-x-2 bottom-4 p-2 bg-blue-600 rounded-lg shadow-lg animate-in zoom-in-50 duration-300">
                          <p className="text-[8px] font-black uppercase truncate text-white">
                            {stopOnThisDay.city_name}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {(!trip.stops || trip.stops.length === 0) && (
          <div className="py-32 text-center space-y-6">
            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto border border-white/10">
              <Compass size={32} className="text-white/20" />
            </div>
            <h3 className="text-xl font-black uppercase tracking-widest text-white/40">Itinerary is empty</h3>
            <button 
              onClick={() => navigate(`/trip/${tripId}/edit`)}
              className="px-10 py-4 bg-blue-600 text-white rounded-full font-black text-xs uppercase tracking-widest shadow-2xl shadow-blue-600/20"
            >
              Go to Builder
            </button>
          </div>
        )}
      </main>

      {/* Sticky Stats Bar */}
      <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 w-full max-w-2xl px-6">
        <div className="bg-white/10 backdrop-blur-2xl border border-white/10 rounded-full p-4 flex items-center justify-between shadow-[0_0_50px_rgba(0,0,0,0.5)]">
          <div className="flex items-center gap-10 px-6">
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Total Budget</p>
              <div className="flex items-center gap-2">
                <Banknote size={16} className="text-emerald-500" />
                <p className="text-xl font-black text-emerald-400">₹{totalStats.budget.toLocaleString()}</p>
              </div>
            </div>
            <div className="h-8 w-[1px] bg-white/10" />
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Journey Time</p>
              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-blue-500" />
                <p className="text-xl font-black">{totalStats.days} Days</p>
              </div>
            </div>
          </div>
          
          <button 
            onClick={() => navigate(`/trip/${tripId}/edit`)}
            className="h-14 px-10 bg-white text-black rounded-full font-black text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl"
          >
            Edit Trip
          </button>
        </div>
      </div>
    </div>
  );
}
