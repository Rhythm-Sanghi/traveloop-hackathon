import React, { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import {
  User,
  MapPin,
  Search,
  Calendar,
  Plus,
  TentTree,
  Building2,
  Waves,
  Mountain,
  Trees,
  UtensilsCrossed,
  Camera,
  Plane,
  Compass,
  ChevronDown,
  Users,
  Globe,
  ArrowRight,
  Wallet,
  Share2,
  BarChart3,
} from 'lucide-react';
import api from '../api';

const categoryItems = [
  { id: 'camping', label: 'Camping', icon: TentTree },
  { id: 'urban', label: 'Urban', icon: Building2 },
  { id: 'coastal', label: 'Coastal', icon: Waves },
  { id: 'mountains', label: 'Mountains', icon: Mountain },
  { id: 'outdoors', label: 'Outdoors', icon: Trees },
  { id: 'food', label: 'Food Trails', icon: UtensilsCrossed },
  { id: 'culture', label: 'Culture', icon: Camera },
  { id: 'weekend', label: 'Quick Getaway', icon: Plane },
];

const coverImages = [
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1200&q=80',
];

const featuredDestinations = [
  { id: 1, title: 'Kyoto Neon Nights', category: 'urban', image: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=800&q=80', icon: Building2 },
  { id: 2, title: 'Patagonian Ice Treks', category: 'mountains', image: 'https://images.unsplash.com/photo-1517021897933-0e0319cfbc28?auto=format&fit=crop&w=800&q=80', icon: Mountain },
  { id: 3, title: 'Icelandic Aurora Basecamp', category: 'camping', image: 'https://images.unsplash.com/photo-1579033461380-adb47c3eb938?auto=format&fit=crop&w=800&q=80', icon: TentTree },
  { id: 4, title: 'Maldives Crystal Coasts', category: 'coastal', image: 'https://images.unsplash.com/photo-1514282401047-d79a71a590e8?auto=format&fit=crop&w=800&q=80', icon: Waves },
  { id: 5, title: 'Amazonian Canopy Trails', category: 'outdoors', image: 'https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?auto=format&fit=crop&w=800&q=80', icon: Trees },
  { id: 6, title: 'Bangkok Street Food', category: 'food', image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=80', icon: UtensilsCrossed },
];

const heroImage =
  'https://images.unsplash.com/photo-1500835556837-99ac94a94552?auto=format&fit=crop&w=2000&q=80';

const formatTripDates = (startDate, endDate) => {
  if (!startDate || !endDate) return 'Dates not set';

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 'Dates not set';

  const sameYear = start.getFullYear() === end.getFullYear();
  const sameMonth = start.getMonth() === end.getMonth() && sameYear;

  if (sameMonth) {
    return `${start.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })} - ${end.toLocaleDateString('en-US', {
      day: 'numeric',
      year: 'numeric',
    })}`;
  }

  if (sameYear) {
    return `${start.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })} - ${end.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })}`;
  }

  return `${start.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })} - ${end.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })}`;
};

const getTripStatus = (trip) => {
  if (!trip.start_date || !trip.end_date) {
    return { label: 'Draft', className: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' };
  }

  const now = new Date();
  const start = new Date(trip.start_date);
  const end = new Date(trip.end_date);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return { label: 'Draft', className: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' };
  }

  if (end < now) {
    return { label: 'Past', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' };
  }

  if (start > now) {
    return { label: 'Upcoming', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' };
  }

  return { label: 'Ongoing', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' };
};

const TripCardSkeleton = () => (
  <div className="overflow-hidden rounded-3xl border border-white/5 bg-[#161827] shadow-lg animate-pulse">
    <div className="h-48 bg-white/5" />
    <div className="p-6 space-y-4">
      <div className="h-6 w-2/3 rounded-lg bg-white/5" />
      <div className="h-4 w-1/2 rounded-lg bg-white/5" />
    </div>
  </div>
);

const Dashboard = () => {
  const token = localStorage.getItem('token') || localStorage.getItem('access_token');
  const navigate = useNavigate();

  const [trips, setTrips] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState(null);

  const username = useMemo(() => {
    const storedUsername = localStorage.getItem('username');
    if (storedUsername?.trim()) return storedUsername;

    const storedEmail = localStorage.getItem('email');
    if (storedEmail?.trim()) return storedEmail.split('@')[0];

    return 'Traveler';
  }, []);

  useEffect(() => {
    const fetchTrips = async () => {
      setLoading(true);
      try {
        const response = await api.get('/api/trips');
        setTrips(Array.isArray(response.data) ? response.data : []);
      } catch (err) {
        if (err.response?.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('access_token');
          navigate('/login');
        }
        setTrips([]);
      } finally {
        setLoading(false);
      }
    };
    if (token) fetchTrips();
  }, [token]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  if (!token) return <Navigate to="/login" replace />;

  return (
    <div className="min-h-screen bg-[#0b0c14] text-white selection:bg-blue-500/30">
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-[#0b0c14]/80 px-6 py-4 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
              <div className="w-4 h-4 bg-[#0b0c14] rounded-sm rotate-45" />
            </div>
            <span className="text-xl font-black tracking-tighter">TRAVELOOP</span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            <button 
              onClick={() => navigate('/dashboard')} 
              className="text-xs font-black uppercase tracking-widest text-white border-b-2 border-blue-500 pb-1"
            >
              Explore
            </button>
            <button 
              onClick={() => navigate('/community')} 
              className="text-xs font-black uppercase tracking-widest text-slate-400 hover:text-white transition-colors"
            >
              Community
            </button>
            <button 
              onClick={() => navigate('/packing-list')} 
              className="text-xs font-black uppercase tracking-widest text-slate-400 hover:text-white transition-colors"
            >
              Packing List
            </button>
            {localStorage.getItem('is_admin') === 'true' && (
              <button 
                onClick={() => navigate('/admin')} 
                className="text-xs font-black uppercase tracking-widest text-blue-500 hover:text-blue-400 transition-colors"
              >
                Admin
              </button>
            )}
            <button 
              onClick={() => navigate('/notes')} 
              className="text-xs font-black uppercase tracking-widest text-slate-400 hover:text-white transition-colors"
            >
              Journal
            </button>
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => navigate('/profile')}
              className="group flex items-center gap-3 rounded-full border border-white/10 bg-white/5 p-1 transition hover:bg-white/10 hover:border-white/20 active:scale-95"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white shadow-inner overflow-hidden">
                <img
                  src="https://api.dicebear.com/7.x/avataaars/svg?seed=Traveloop"
                  alt="User avatar"
                  className="h-full w-full object-cover"
                />
              </div>
              <ChevronDown className="h-4 w-4 text-white/40 mr-2 group-hover:text-white transition-colors" />
            </button>
          </div>
        </div>
      </nav>

      <main className="mx-auto flex w-full max-w-7xl flex-col gap-16 px-6 pb-32 pt-28 sm:px-8">
        <section className="relative overflow-hidden rounded-4xl group">
          <div
            className="h-96 w-full bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
            style={{ backgroundImage: `url(${heroImage})` }}
          />
          <div className="absolute inset-0 bg-linear-to-t from-[#0b0c14] via-[#0b0c14]/40 to-transparent" />

          <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center space-y-8">
            <h1 className="text-4xl font-black tracking-tight text-white sm:text-6xl uppercase leading-tight">
              Where to next,<br/>
              <span className="bg-clip-text text-transparent bg-linear-to-r from-blue-400 to-indigo-400">{username}?</span>
            </h1>

            <form 
              onSubmit={handleSearch}
              className="mt-6 flex w-full max-w-2xl items-center rounded-full bg-white/5 backdrop-blur-md px-6 py-4 border border-white/10 shadow-2xl focus-within:ring-2 focus-within:ring-blue-500/20 transition-all group"
            >
              <Search className="mr-4 h-5 w-5 text-white/40 group-focus-within:text-blue-400 transition-colors" />
              <input
                type="text"
                placeholder="Search destinations, stays, or experiences"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent text-sm text-white placeholder:text-white/20 focus:outline-none"
              />
            </form>
          </div>
        </section>

        <section className="space-y-8">
          <header className="flex items-center justify-between">
            <div className="space-y-1">
              <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Curated Experiences</h2>
              <p className="text-2xl font-black uppercase tracking-tight">Explore <span className="text-blue-500">Destinations</span></p>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => setSelectedCategory(null)}
                className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${!selectedCategory ? 'bg-blue-600 text-white' : 'bg-white/5 text-slate-500 hover:text-white'}`}
              >
                All
              </button>
              {categoryItems.slice(0, 4).map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${selectedCategory === cat.id ? 'bg-blue-600 text-white' : 'bg-white/5 text-slate-500 hover:text-white'}`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </header>
 
          <div className="flex gap-8 overflow-x-auto pb-8 pt-4 custom-scrollbar-show snap-x">
            {featuredDestinations
              .filter(dest => !selectedCategory || dest.category === selectedCategory)
              .map((dest) => (
              <div
                key={dest.id}
                className="min-w-[320px] h-100 snap-center rounded-4xl overflow-hidden relative group cursor-pointer transition-all duration-500 hover:scale-[1.02] hover:-rotate-1 active:scale-[0.98]"
              >
                <img 
                  src={dest.image} 
                  alt={dest.title} 
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  onError={(e) => {
                    e.target.src = "https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=800&q=80";
                  }}
                />
                <div className="absolute inset-0 bg-linear-to-t from-[#0b0c14] via-[#0b0c14]/20 to-transparent opacity-80 group-hover:opacity-60 transition-opacity" />
                
                <div className="absolute bottom-0 left-0 right-0 p-8 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-white border border-white/10">
                      <dest.icon size={20} />
                    </div>
                    <span className="px-3 py-1 bg-blue-500/20 border border-blue-500/30 rounded-full text-[8px] font-black uppercase tracking-widest text-blue-400">
                      {dest.category}
                    </span>
                  </div>
                  <h3 className="text-2xl font-black uppercase tracking-tight leading-none group-hover:text-blue-400 transition-colors">
                    {dest.title}
                  </h3>
                  <button className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/40 group-hover:text-white transition-colors">
                    Explore Details <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Community Highlight Section */}
        <section 
          onClick={() => navigate('/community')}
          className="bg-white/5 border border-white/10 rounded-4xl p-10 flex flex-col md:flex-row items-center justify-between gap-8 cursor-pointer hover:bg-white/10 transition-all group overflow-hidden relative"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2" />
          
          <div className="space-y-4 relative z-10 max-w-xl">
             <div className="flex items-center gap-3 text-blue-400">
               <Users size={20} />
               <span className="text-xs font-black uppercase tracking-widest">Community Hub</span>
             </div>
             <h2 className="text-3xl font-black tracking-tight">Discover Where Others Are Traveling</h2>
             <p className="text-slate-400 font-medium">Explore public itineraries, clone trending trips, and get inspired by the Traveloop community.</p>
          </div>

          <div className="flex items-center gap-4 px-8 py-4 bg-white text-black rounded-full font-black text-xs uppercase tracking-widest group-hover:scale-105 transition-all shadow-2xl relative z-10">
            Explore Community
            <ArrowRight size={18} />
          </div>
        </section>

        <section className="space-y-8">
          <header className="flex items-center justify-between border-b border-white/5 pb-4">
            <h2 className="text-3xl font-black">Your Itineraries</h2>
          </header>

          {loading ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, idx) => (
                <TripCardSkeleton key={idx} />
              ))}
            </div>
          ) : trips.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-4xl border border-white/5 bg-[#161827] px-8 py-20 text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-blue-500 to-transparent" />
              <div className="mb-6 rounded-3xl bg-white/5 p-6 text-white/20 border border-white/5 shadow-inner">
                <Compass size={48} strokeWidth={1} />
              </div>
              <h3 className="text-2xl font-black mb-2 uppercase">Your adventure journal is empty</h3>
              <p className="mt-2 max-w-md text-slate-400 font-medium">
                Start planning your next trip and organize your journey in one place.
              </p>
              <Link
                to="/trip/new"
                className="mt-10 rounded-full bg-blue-600 px-10 py-4 text-sm font-black uppercase tracking-widest text-white shadow-2xl shadow-blue-500/20 transition hover:scale-105 active:scale-95"
              >
                Start Planning
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {trips.map((trip, index) => {
                const status = getTripStatus(trip);
                const image = coverImages[index % coverImages.length];

                return (
                  <article
                    key={trip.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => navigate(`/trip/${trip.id}/edit`)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        navigate(`/trip/${trip.id}/edit`);
                      }
                    }}
                    className="group cursor-pointer overflow-hidden rounded-3xl border border-white/10 bg-[#161827] shadow-2xl transition-all hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <div className="relative h-48 w-full overflow-hidden">
                      <img src={image} alt={trip.name || 'Trip cover'} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" />
                      <div className="absolute inset-0 bg-linear-to-t from-[#161827] via-transparent to-transparent" />
                      <div className="absolute top-4 right-4">
                        <span className={`inline-flex rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest backdrop-blur-md border border-white/10 ${status.className.replace('bg-slate-100', 'bg-white/10').replace('text-slate-700', 'text-white')}`}>
                          {status.label}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-4 p-6">
                      <h3 className="line-clamp-1 text-xl font-black group-hover:text-blue-400 transition-colors uppercase">{trip.name || 'Untitled Trip'}</h3>
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                        <Calendar size={14} className="opacity-40" />
                        <span>{formatTripDates(trip.start_date, trip.end_date)}</span>
                      </div>

                        <div className="pt-4 border-t border-white/5 flex gap-2">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/trip/${trip.id}/budget`);
                            }}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-xs font-black uppercase tracking-widest text-slate-300 transition-all group"
                          >
                             <Wallet size={14} className="text-emerald-500" />
                             Budget
                          </button>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/trip/${trip.id}/view`);
                            }}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-xs font-black uppercase tracking-widest text-slate-300 transition-all group"
                          >
                             <Compass size={14} className="text-blue-500" />
                             View
                          </button>
                        </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>

      <Link
        to="/trip/new"
        className="fixed bottom-10 right-10 z-50 inline-flex items-center gap-3 rounded-full bg-blue-600 text-white px-8 py-5 text-sm font-black uppercase tracking-widest shadow-2xl transition hover:scale-105 active:scale-95 group"
      >
        <Plus size={20} strokeWidth={3} className="group-hover:rotate-90 transition-transform" />
        Plan a trip
      </Link>
    </div>

  );
};

export default Dashboard;
