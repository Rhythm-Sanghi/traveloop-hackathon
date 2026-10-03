import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Search,
  Clock,
  Tag,
  Plus,
  ChevronDown,
  X,
  Star,
  SlidersHorizontal,
  Info,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import api from '../api';
import Navbar from '../components/Navbar';

export default function ActivitySearch() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  
  const [searchInput, setSearchInput] = useState(query);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [filterType, setFilterType] = useState('All');
  const [filterCost, setFilterCost] = useState('All');

  // Trip selection integration state
  const [trips, setTrips] = useState([]);
  const [tripsLoading, setTripsLoading] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [targetActivity, setTargetActivity] = useState(null);
  
  const [selectedTripId, setSelectedTripId] = useState(null);
  const [stops, setStops] = useState([]);
  const [stopsLoading, setStopsLoading] = useState(false);
  const [selectedStopId, setSelectedStopId] = useState(null);
  const [addLoading, setAddLoading] = useState(false);
  const [addSuccess, setAddSuccess] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [providerError, setProviderError] = useState('');

  useEffect(() => {
    const fetchTrips = async () => {
      try {
        setTripsLoading(true);
        const res = await api.get('/api/trips');
        setTrips(res.data || []);
      } catch (err) {
        console.error('Failed to fetch trips:', err);
      } finally {
        setTripsLoading(false);
      }
    };
    fetchTrips();
  }, []);

  useEffect(() => {
    if (!selectedTripId) {
      return undefined;
    }

    const fetchStops = async () => {
      try {
        setStopsLoading(true);
        const res = await api.get(`/api/trips/${selectedTripId}/itinerary`);
        setStops(res.data.stops || []);
        if (res.data.stops && res.data.stops.length > 0) {
          setSelectedStopId(res.data.stops[0].id);
        } else {
          setSelectedStopId(null);
        }
      } catch (err) {
        console.error('Failed to fetch stops:', err);
      } finally {
        setStopsLoading(false);
      }
    };

    fetchStops();
    return undefined;
  }, [selectedTripId]);

  const handleConfirmAddActivity = async () => {
    if (!selectedTripId || !selectedStopId || !targetActivity) return;
    try {
      setAddLoading(true);
      await api.post(`/api/trips/${selectedTripId}/itinerary/stops/${selectedStopId}/activities`, {
        name: targetActivity.title,
        cost: parseFloat(targetActivity.price) || 0.0,
        category: targetActivity.category || 'Sightseeing'
      });
      setAddSuccess(true);
      setTimeout(() => {
        setIsAddModalOpen(false);
        setAddSuccess(false);
        setTargetActivity(null);
        setSelectedTripId(null);
        setSelectedStopId(null);
      }, 1000);
    } catch (err) {
      console.error('Failed to add activity:', err);
    } finally {
      setAddLoading(false);
    }
  };
  
  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      try {
        setSearchLoading(true);
        const params = new URLSearchParams();
        if (searchInput.trim()) params.set('q', searchInput.trim());
        if (filterType !== 'All') params.set('category', filterType);
        if (filterCost !== 'All') params.set('cost', filterCost);

        if (!searchInput.trim()) {
          setSearchResults([]);
          setProviderError('');
          return;
        }
        const res = await api.get('/api/search/places', {
          params: { q: searchInput.trim(), limit: 20 },
        });
        setProviderError('');
        setSearchResults((Array.isArray(res.data) ? res.data : []).map((place) => ({
          id: place.provider_id || `${place.latitude}-${place.longitude}-${place.name}`,
          title: place.name || place.address || searchInput.trim(),
          category: 'Place',
          description: place.address || 'Place discovered through the configured provider.',
          image: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1200&q=80',
          rating: '—',
          duration: 'Manual duration',
          price: 0,
          longDescription: place.address || '',
          extraImages: [],
          provider: place.provider,
          provider_id: place.provider_id,
        })));
      } catch (err) {
        console.error('Failed to fetch search results:', err);
        setSearchResults([]);
        setProviderError(err.response?.status === 503
          ? 'Place discovery is unavailable. Add your activity manually instead.'
          : 'Place discovery failed. Try again or add your activity manually.');
      } finally {
        setSearchLoading(false);
      }
    }, 200);

    return () => clearTimeout(timeoutId);
  }, [searchInput, filterType, filterCost]);

  const filteredActivities = searchResults;

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setSearchParams({ q: searchInput });
  };

  return (
    <div className="min-h-screen bg-[#0b0c14] text-white selection:bg-blue-500/30">
      
      <Navbar />

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 pt-32 pb-32">
        <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-8 pb-8 border-b border-white/5">
          <div className="space-y-2">
            <h1 className="text-4xl font-black uppercase tracking-tight">
              Discover <span className="text-blue-500">Experiences</span>
            </h1>
            <p className="text-slate-500 font-medium">
              Found {filteredActivities.length} activities matching your search
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 items-center w-full md:w-auto">
            <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-80">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-white/20">
                <Search size={16} strokeWidth={1.5} />
              </div>
              <input
                type="text"
                placeholder="Search experiences..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-full py-3.5 pl-10 pr-4 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-white placeholder:text-white/20"
              />
            </form>

            <div className="flex items-center gap-3 overflow-x-auto w-full sm:w-auto scrollbar-hide pb-2 sm:pb-0">
              <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-2 text-[10px] font-black uppercase tracking-widest whitespace-nowrap">
                <Tag size={12} className="text-blue-500" />
                <span>Type:</span>
                <select 
                  value={filterType} 
                  onChange={(e) => setFilterType(e.target.value)}
                  className="bg-transparent focus:outline-none cursor-pointer text-blue-400 font-bold"
                >
                  <option value="All">All</option>
                  <option value="Adventure">Adventure</option>
                  <option value="Foodie">Foodie</option>
                  <option value="Culture">Culture</option>
                  <option value="Relaxation">Relaxation</option>
                </select>
              </div>

              <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-2 text-[10px] font-black uppercase tracking-widest whitespace-nowrap">
                <SlidersHorizontal size={12} className="text-emerald-500" />
                <span>Cost:</span>
                <select 
                  value={filterCost} 
                  onChange={(e) => setFilterCost(e.target.value)}
                  className="bg-transparent focus:outline-none cursor-pointer text-emerald-400 font-bold"
                >
                  <option value="All">All</option>
                  <option value="Budget">Budget</option>
                  <option value="Mid-range">Mid-range</option>
                  <option value="Luxury">Luxury</option>
                </select>
              </div>
            </div>
          </div>
        </header>

        <div className="space-y-8">
          {searchLoading ? (
            <div className="py-16 text-center text-slate-300">
              <Loader2 className="mx-auto mb-3 h-6 w-6 animate-spin text-blue-500" />
              <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Searching itineraries…</p>
            </div>
          ) : filteredActivities.length > 0 ? (
            filteredActivities.map((activity) => (
              <div 
                key={activity.id}
                onClick={() => setSelectedActivity(activity)}
                className="group flex flex-col md:flex-row bg-[#161827] border border-white/10 rounded-[2.5rem] overflow-hidden hover:border-white/20 hover:bg-white/4 transition-all cursor-pointer shadow-2xl"
              >
                {/* Image Side */}
                <div className="w-full md:w-80 h-64 md:h-auto overflow-hidden">
                  <img 
                    src={activity.image} 
                    alt={activity.title} 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  />
                </div>

                {/* Content Side */}
                <div className="flex-1 p-8 md:p-10 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between mb-4">
                      <span className="bg-blue-600/20 text-blue-400 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                        {activity.category}
                      </span>
                      <div className="flex items-center gap-1 text-yellow-500">
                        <Star size={14} fill="currentColor" />
                        <span className="text-xs font-black">{activity.rating}</span>
                      </div>
                    </div>
                    <h2 className="text-2xl font-black uppercase tracking-tight group-hover:text-blue-400 transition-colors mb-4 leading-tight">
                      {activity.title}
                    </h2>
                    <p className="text-slate-400 text-sm leading-relaxed line-clamp-2">
                      {activity.description}
                    </p>
                  </div>

                  <div className="mt-8 pt-8 border-t border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-2 text-white/40">
                        <Clock size={16} />
                        <span className="text-xs font-bold">{activity.duration}</span>
                      </div>
                      <div className="flex items-center gap-2 text-emerald-400">
                        <Tag size={16} />
                        <span className="text-xs font-black uppercase tracking-widest">${activity.price}</span>
                      </div>
                    </div>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setTargetActivity(activity);
                        setIsAddModalOpen(true);
                      }}
                      className="p-3 bg-blue-600 rounded-2xl hover:scale-110 active:scale-95 transition-all shadow-xl shadow-blue-600/20"
                    >
                      <Plus size={20} strokeWidth={3} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : providerError ? (
            <div className="rounded-3xl border border-amber-400/20 bg-amber-400/10 p-8 text-center">
              <p className="text-sm font-bold text-amber-200">{providerError}</p>
              <button
                type="button"
                onClick={() => setSelectedActivity({
                  id: `manual-${searchInput}`,
                  title: searchInput.trim(),
                  category: 'Manual',
                  description: 'Manually entered activity',
                  image: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1200&q=80',
                  rating: '—',
                  duration: 'Set in itinerary',
                  price: 0,
                  longDescription: 'Add this activity to a trip and adjust its cost in the itinerary.',
                  extraImages: [],
                })}
                className="mt-4 rounded-full bg-blue-600 px-6 py-3 text-[10px] font-black uppercase tracking-widest"
              >
                Add manually
              </button>
            </div>
          ) : (
            <div className="py-24 text-center bg-white/1 border-2 border-dashed border-white/5 rounded-[3rem]">
               <Info size={48} className="mx-auto text-white/5 mb-6" />
               <h3 className="text-xl font-black uppercase tracking-widest text-white/20">No matching activities found</h3>
               <p className="text-slate-600 mt-2">Try adjusting your filters or search terms.</p>
               <button 
                onClick={() => { setSearchInput(''); setFilterType('All'); setFilterCost('All'); setSearchParams({}); }}
                className="mt-8 text-blue-500 text-xs font-black uppercase tracking-[0.2em] hover:underline"
               >
                 Clear all filters
               </button>
            </div>
          )}
        </div>
      </main>

      {/* Modal / Quick View */}
      {selectedActivity && (
        <div className="fixed inset-0 z-100 flex items-center justify-center px-6 py-20">
          <div 
            className="absolute inset-0 bg-[#0b0c14]/95 backdrop-blur-2xl"
            onClick={() => setSelectedActivity(null)}
          />
          <div className="relative w-full max-w-4xl max-h-full bg-[#161827] border border-white/10 rounded-[3rem] overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.5)] animate-in fade-in zoom-in-95 duration-300 overflow-y-auto">
            <button 
              onClick={() => setSelectedActivity(null)}
              className="absolute top-6 right-6 z-10 p-3 bg-white/5 hover:bg-white/10 rounded-full transition-all"
            >
              <X size={20} />
            </button>

            <div className="flex flex-col md:flex-row">
              <div className="w-full md:w-1/2 h-80 md:h-auto bg-slate-800">
                 <img src={selectedActivity.image} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 p-10 lg:p-14 space-y-8">
                <div className="space-y-4">
                  <span className="bg-blue-600/20 text-blue-400 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                    {selectedActivity.category}
                  </span>
                  <h2 className="text-4xl font-black uppercase tracking-tight leading-none">
                    {selectedActivity.title}
                  </h2>
                  <div className="flex items-center gap-4 text-xs font-bold text-slate-500">
                    <div className="flex items-center gap-1 text-yellow-500">
                      <Star size={14} fill="currentColor" />
                      <span>{selectedActivity.rating}</span>
                    </div>
                    <span>•</span>
                    <div className="flex items-center gap-1">
                      <Clock size={14} />
                      <span>{selectedActivity.duration}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <h4 className="text-xs font-black uppercase tracking-[0.3em] text-white/40">About the experience</h4>
                  <p className="text-slate-400 leading-relaxed font-medium">
                    {selectedActivity.longDescription}
                  </p>
                </div>

                <div className="flex gap-4 pt-4">
                  {selectedActivity.extraImages.map((img, i) => (
                    <div key={i} className="flex-1 h-32 rounded-3xl overflow-hidden border border-white/5">
                      <img src={img} className="w-full h-full object-cover hover:scale-110 transition-transform duration-500" />
                    </div>
                  ))}
                </div>

                <div className="pt-8 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-1">Total Cost</p>
                    <p className="text-3xl font-black text-emerald-400 tracking-tight">${selectedActivity.price}</p>
                  </div>
                  <button 
                    onClick={() => {
                      setTargetActivity(selectedActivity);
                      setIsAddModalOpen(true);
                      setSelectedActivity(null); // Close the preview modal
                    }}
                    className="px-12 py-5 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-black text-xs uppercase tracking-widest transition-all shadow-2xl shadow-blue-600/20 active:scale-95"
                  >
                    Add to Itinerary
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add to Itinerary Trip/Stop Selector Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center px-6 py-20">
          <div 
            className="absolute inset-0 bg-[#0b0c14]/90 backdrop-blur-md"
            onClick={() => setIsAddModalOpen(false)}
          />
          <div className="relative w-full max-w-md bg-[#161827] border border-white/10 rounded-[2.5rem] p-8 md:p-10 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <button 
              onClick={() => setIsAddModalOpen(false)}
              className="absolute top-6 right-6 p-2 bg-white/5 hover:bg-white/10 rounded-full transition-all"
            >
              <X size={16} />
            </button>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500">Add To Itinerary</p>
                <h3 className="text-2xl font-black uppercase tracking-tight">Select Trip & Stop</h3>
                <p className="text-xs text-white/40 font-medium">
                  Select where you want to add: <strong className="text-white">{targetActivity?.title}</strong>
                </p>
              </div>

              {addSuccess ? (
                <div className="py-8 flex flex-col items-center justify-center space-y-4">
                  <CheckCircle2 size={48} className="text-emerald-500 animate-bounce" />
                  <p className="text-sm font-black uppercase tracking-widest text-emerald-400">Added Successfully!</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Select Trip */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Choose Trip</label>
                    <div className="relative">
                      <select 
                        value={selectedTripId || ''}
                        onChange={(e) => setSelectedTripId(e.target.value ? parseInt(e.target.value) : null)}
                        className="w-full appearance-none pl-6 pr-10 py-4 bg-[#0b0c14] border border-white/10 rounded-2xl text-xs font-black uppercase tracking-widest outline-none cursor-pointer hover:border-white/20 transition-all text-white bg-slate-900"
                      >
                        <option value="">-- Select Trip --</option>
                        {tripsLoading ? (
                          <option disabled>Loading trips...</option>
                        ) : trips.length === 0 ? (
                          <option disabled>No trips found</option>
                        ) : (
                          trips.map(trip => (
                            <option key={trip.id} value={trip.id}>{trip.name}</option>
                          ))
                        )}
                      </select>
                      <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 pointer-events-none" />
                    </div>
                  </div>

                  {/* Select Stop */}
                  {selectedTripId && (
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Choose Stop</label>
                      <div className="relative">
                        <select 
                          value={selectedStopId || ''}
                          onChange={(e) => setSelectedStopId(e.target.value ? parseInt(e.target.value) : null)}
                          className="w-full appearance-none pl-6 pr-10 py-4 bg-[#0b0c14] border border-white/10 rounded-2xl text-xs font-black uppercase tracking-widest outline-none cursor-pointer hover:border-white/20 transition-all text-white bg-slate-900"
                        >
                          <option value="">-- Select Stop --</option>
                          {stopsLoading ? (
                            <option disabled>Loading stops...</option>
                          ) : stops.length === 0 ? (
                            <option disabled>No stops for this trip</option>
                          ) : (
                            stops.map(stop => (
                              <option key={stop.id} value={stop.id}>{stop.city_name} ({stop.arrival_date})</option>
                            ))
                          )}
                        </select>
                        <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 pointer-events-none" />
                      </div>
                    </div>
                  )}

                  <div className="pt-4 flex gap-4">
                    <button 
                      onClick={() => setIsAddModalOpen(false)}
                      className="flex-1 py-4 border border-white/10 rounded-full text-xs font-black uppercase tracking-widest hover:bg-white/5 transition-all text-white/60"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={handleConfirmAddActivity}
                      disabled={addLoading || !selectedTripId || !selectedStopId}
                      className="flex-1 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-full text-xs font-black uppercase tracking-widest transition-all shadow-xl shadow-blue-600/10 active:scale-95 disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center gap-2"
                    >
                      {addLoading && <Loader2 size={14} className="animate-spin" />}
                      Add to Stop
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
