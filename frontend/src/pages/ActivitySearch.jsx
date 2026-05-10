import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import {
  Search,
  Filter,
  Clock,
  Tag,
  Plus,
  ChevronDown,
  X,
  Star,
  MapPin,
  ArrowLeft,
  SlidersHorizontal,
  Info,
} from 'lucide-react';

const mockActivities = [
  {
    id: 1,
    title: 'Sunrise Paragliding Over the Alps',
    description: 'Experience the ultimate adrenaline rush as you soar above the snow-capped peaks of the Swiss Alps during a breathtaking sunrise.',
    longDescription: 'Join our expert pilots for a once-in-a-lifetime paragliding adventure. We start before dawn to catch the first light hitting the peaks. You will glide for 45 minutes over pristine glaciers and alpine lakes. No experience required, as this is a tandem flight. All safety equipment and a Go-Pro video of your flight are included.',
    category: 'Adventure',
    cost: 'Luxury',
    price: 350,
    duration: '3 Hours',
    rating: 4.9,
    image: 'https://images.unsplash.com/photo-1533310266094-8898a03807dd?auto=format&fit=crop&w=800&q=80',
    extraImages: [
      'https://images.unsplash.com/photo-1524222717473-739b62a4b1d1?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80'
    ]
  },
  {
    id: 2,
    title: 'Midnight Food Tour in Tokyo',
    description: 'Discover the hidden culinary gems of Shinjuku and Shibuya after dark. Taste authentic ramen, yakitori, and local delicacies.',
    longDescription: 'Tokyo comes alive at night, and its food scene is no exception. Our local guide will take you through narrow alleyways (Yokocho) to visit three award-winning eateries that only locals know about. Learn about the history of Japanese street food and enjoy sake pairings at each stop.',
    category: 'Foodie',
    cost: 'Mid-range',
    price: 120,
    duration: '4 Hours',
    rating: 4.8,
    image: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=800&q=80',
    extraImages: [
      'https://images.unsplash.com/photo-1542372147193-a7aca54189cd?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1582450871972-ab5ca641643d?auto=format&fit=crop&w=800&q=80'
    ]
  },
  {
    id: 3,
    title: 'Ancient Mayan Ruins Expedition',
    description: 'Step back in time as you explore the hidden temples of Tikal deep within the Guatemalan rainforest.',
    longDescription: 'This expedition takes you off the beaten path to the heart of the Mayan civilization. Led by a professional archaeologist, you will climb the Great Jaguar Temple and witness the sunrise from Temple IV. Discover the secrets of Mayan astronomy and social structure while observing howler monkeys and toucans in their natural habitat.',
    category: 'Culture',
    cost: 'Mid-range',
    price: 85,
    duration: '6 Hours',
    rating: 4.7,
    image: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80',
    extraImages: [
      'https://images.unsplash.com/photo-1531315630201-bb15abeb1653?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1533035353720-f1c6a75cd8ab?auto=format&fit=crop&w=800&q=80'
    ]
  },
  {
    id: 4,
    title: 'Balinese Spa & Meditation Retreat',
    description: 'Find your inner peace with a full day of traditional Balinese healing, yoga, and meditation in the heart of Ubud.',
    longDescription: 'Escape the hustle and bustle of daily life in our tranquil jungle retreat. Your day begins with a gentle Vinyasa yoga session, followed by a traditional Balinese massage using local herbs and oils. Enjoy an organic plant-based lunch overlooking the Ayung River before concluding with a guided mindfulness meditation session.',
    category: 'Relaxation',
    cost: 'Luxury',
    price: 280,
    duration: 'Full Day',
    rating: 5.0,
    image: 'https://images.unsplash.com/photo-1544161515-4ae6ce6e8347?auto=format&fit=crop&w=800&q=80',
    extraImages: [
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1590523277543-a94d2e4eb00b?auto=format&fit=crop&w=800&q=80'
    ]
  },
  {
    id: 5,
    title: 'Surfing the Skeleton Coast',
    description: 'Ride the world-longest left-hand wave in the remote and hauntingly beautiful Namibia.',
    longDescription: 'For experienced surfers looking for the ultimate challenge, the Skeleton Coast offers waves that go on for miles. This guided tour includes 4x4 transport across the desert, beach camping under the stars, and expert knowledge of the local swells and currents. A truly rugged and unforgettable surf adventure.',
    category: 'Adventure',
    cost: 'Budget',
    price: 45,
    duration: '5 Hours',
    rating: 4.6,
    image: 'https://images.unsplash.com/photo-1502680390469-be75c86b636f?auto=format&fit=crop&w=800&q=80',
    extraImages: [
      'https://images.unsplash.com/photo-1459749411177-ec427d62a484?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80'
    ]
  }
];

export default function ActivitySearch() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const query = searchParams.get('q') || '';
  
  const [searchInput, setSearchInput] = useState(query);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [filterType, setFilterType] = useState('All');
  const [filterCost, setFilterCost] = useState('All');
  
  const filteredActivities = useMemo(() => {
    return mockActivities.filter(activity => {
      const matchesQuery = activity.title.toLowerCase().includes(query.toLowerCase()) || 
                          activity.description.toLowerCase().includes(query.toLowerCase());
      const matchesType = filterType === 'All' || activity.category === filterType;
      const matchesCost = filterCost === 'All' || activity.cost === filterCost;
      
      return matchesQuery && matchesType && matchesCost;
    });
  }, [query, filterType, filterCost]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setSearchParams({ q: searchInput });
  };

  return (
    <div className="min-h-screen bg-[#0b0c14] text-white selection:bg-blue-500/30">
      
      {/* Top Bar / Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0b0c14]/90 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col md:flex-row gap-6 items-center">
          <button 
            onClick={() => navigate('/dashboard')}
            className="hidden md:flex items-center gap-2 text-white/40 hover:text-white transition-colors"
          >
            <ArrowLeft size={20} />
            <span className="text-xs font-black uppercase tracking-widest">Back</span>
          </button>

          <form onSubmit={handleSearchSubmit} className="flex-1 w-full relative">
            <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none text-white/20">
              <Search size={20} strokeWidth={1.5} />
            </div>
            <input
              type="text"
              placeholder="Search for your next adventure..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-full py-4 pl-16 pr-6 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all placeholder:text-white/10"
            />
          </form>

          <div className="flex items-center gap-3 overflow-x-auto w-full md:w-auto scrollbar-hide pb-2 md:pb-0">
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-2 text-xs font-black uppercase tracking-widest whitespace-nowrap">
              <Tag size={14} className="text-blue-500" />
              <span>Type:</span>
              <select 
                value={filterType} 
                onChange={(e) => setFilterType(e.target.value)}
                className="bg-transparent focus:outline-none cursor-pointer text-blue-400"
              >
                <option value="All">All</option>
                <option value="Adventure">Adventure</option>
                <option value="Foodie">Foodie</option>
                <option value="Culture">Culture</option>
                <option value="Relaxation">Relaxation</option>
              </select>
            </div>

            <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-2 text-xs font-black uppercase tracking-widest whitespace-nowrap">
              <SlidersHorizontal size={14} className="text-emerald-500" />
              <span>Cost:</span>
              <select 
                value={filterCost} 
                onChange={(e) => setFilterCost(e.target.value)}
                className="bg-transparent focus:outline-none cursor-pointer text-emerald-400"
              >
                <option value="All">All</option>
                <option value="Budget">Budget</option>
                <option value="Mid-range">Mid-range</option>
                <option value="Luxury">Luxury</option>
              </select>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 pt-48 pb-32">
        <header className="mb-12">
          <h1 className="text-4xl font-black uppercase tracking-tight">
            Discover <span className="text-blue-500">Experiences</span>
          </h1>
          <p className="text-slate-500 mt-2 font-medium">
            Found {filteredActivities.length} activities matching your search
          </p>
        </header>

        <div className="space-y-8">
          {filteredActivities.length > 0 ? (
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
                    <button className="p-3 bg-blue-600 rounded-2xl hover:scale-110 active:scale-95 transition-all shadow-xl shadow-blue-600/20">
                      <Plus size={20} strokeWidth={3} />
                    </button>
                  </div>
                </div>
              </div>
            ))
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
                  <button className="px-12 py-5 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-black text-xs uppercase tracking-widest transition-all shadow-2xl shadow-blue-600/20 active:scale-95">
                    Add to Itinerary
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
