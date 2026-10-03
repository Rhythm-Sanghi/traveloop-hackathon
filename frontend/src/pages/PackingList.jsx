import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Check,
  Plus,
  RotateCcw,
  Share2,
  Trash2,
  ChevronDown,
  Search,
  Filter,
  ArrowLeft,
  Briefcase,
  Smartphone,
  Shirt,
  FileText,
  Loader2,
  Compass,
} from 'lucide-react';
import api from '../api';
import Navbar from '../components/Navbar';

const CATEGORY_ICONS = {
  Documents: <FileText size={18} className="text-blue-500" />,
  Clothing: <Shirt size={18} className="text-emerald-500" />,
  Electronics: <Smartphone size={18} className="text-rose-500" />,
};

export default function PackingList() {
  const navigate = useNavigate();
  const [trips, setTrips] = useState([]);
  const [selectedTripId, setSelectedTripId] = useState(null);
  const [tripsLoading, setTripsLoading] = useState(true);
  const [packingLoading, setPackingLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [categories, setCategories] = useState({
    Documents: [],
    Clothing: [],
    Electronics: [],
  });
  const [newItemName, setNewItemName] = useState('');
  const [activeCategory, setActiveCategory] = useState('Documents');

  // Fetch all user trips on mount
  useEffect(() => {
    const fetchTrips = async () => {
      try {
        setTripsLoading(true);
        const res = await api.get('/api/trips');
        setTrips(res.data);
        if (res.data.length > 0) {
          setSelectedTripId(res.data[0].id);
        }
      } catch (err) {
        console.error('Failed to fetch trips:', err);
      } finally {
        setTripsLoading(false);
      }
    };
    fetchTrips();
  }, []);

  const initializeDefaultList = async (tripId) => {
    setPackingLoading(true);
    try {
      const defaultItems = [
        { name: 'Passport & Visa', category: 'Documents' },
        { name: 'Travel Insurance', category: 'Documents' },
        { name: 'Flight Tickets', category: 'Documents' },
        { name: 'Cotton T-shirts', category: 'Clothing' },
        { name: 'Comfortable Jeans', category: 'Clothing' },
        { name: 'Light Jacket', category: 'Clothing' },
        { name: 'Walking Shoes', category: 'Clothing' },
        { name: 'Universal Adapter', category: 'Electronics' },
        { name: 'Power Bank', category: 'Electronics' },
        { name: 'Camera & SD Cards', category: 'Electronics' },
        { name: 'Noise Cancelling Headphones', category: 'Electronics' },
      ];
      
      await Promise.all(defaultItems.map(item => 
        api.post(`/api/trips/${tripId}/packing`, item)
      ));
      
      await fetchPackingItems(tripId);
    } catch (err) {
      console.error('Failed to initialize default list:', err);
    } finally {
      setPackingLoading(false);
    }
  };

  async function fetchPackingItems(tripId) {
    setPackingLoading(true);
    try {
      const response = await api.get(`/api/trips/${tripId}/packing`);
      const items = response.data;
      if (items.length === 0) {
        await initializeDefaultList(tripId);
        return;
      }

      const grouped = {
        Documents: [],
        Clothing: [],
        Electronics: [],
      }
      
      items.forEach(item => {
        const cat = item.category || 'Documents';
        if (!grouped[cat]) {
          grouped[cat] = [];
        }
        grouped[cat].push({
          id: item.id,
          name: item.name,
          isPacked: item.is_packed === 1
        });
      });
      
      setCategories(grouped);
    } catch (err) {
      console.error('Failed to fetch packing list:', err);
    } finally {
      setPackingLoading(false);
    }
  };

  // Fetch packing items when selectedTripId changes
  useEffect(() => {
    if (selectedTripId) {
      fetchPackingItems(selectedTripId);
    }
    // This shared function also initializes an empty list, so it is intentionally not recreated per render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTripId]);

  const toggleItem = async (category, itemId) => {
    try {
      await api.put(`/api/packing/${itemId}/toggle`);
      setCategories((prev) => ({
        ...prev,
        [category]: prev[category].map((item) =>
          item.id === itemId ? { ...item, isPacked: !item.isPacked } : item
        ),
      }));
    } catch (err) {
      console.error('Failed to toggle packing item:', err);
    }
  };

  const addItem = async (e) => {
    e.preventDefault();
    if (!newItemName.trim() || !selectedTripId) return;

    try {
      const response = await api.post(`/api/trips/${selectedTripId}/packing`, {
        name: newItemName.trim(),
        category: activeCategory
      });
      const newItem = {
        id: response.data.id,
        name: response.data.name,
        isPacked: false,
      };

      setCategories((prev) => ({
        ...prev,
        [activeCategory]: [...(prev[activeCategory] || []), newItem],
      }));
      setNewItemName('');
    } catch (err) {
      console.error('Failed to add packing item:', err);
    }
  };

  const deleteItem = async (category, itemId) => {
    try {
      await api.delete(`/api/packing/${itemId}`);
      setCategories((prev) => ({
        ...prev,
        [category]: prev[category].filter((item) => item.id !== itemId),
      }));
    } catch (err) {
      console.error('Failed to delete packing item:', err);
    }
  };

  const resetList = async () => {
    if (!selectedTripId) return;
    try {
      await api.post(`/api/trips/${selectedTripId}/packing/reset`);
      setCategories((prev) => {
        const reset = {};
        Object.keys(prev).forEach((cat) => {
          reset[cat] = prev[cat].map((item) => ({ ...item, isPacked: false }));
        });
        return reset;
      });
    } catch (err) {
      console.error('Failed to reset packing items:', err);
    }
  };

  const generateWeatherSmartList = async () => {
    if (!selectedTripId) return;
    setPackingLoading(true);
    try {
      const response = await api.post(`/api/trips/${selectedTripId}/packing/weather-aware`);
      const items = response.data;
      
      const grouped = {
        Documents: [],
        Clothing: [],
        Electronics: [],
      };
      
      items.forEach(item => {
        const cat = item.category || 'Documents';
        if (!grouped[cat]) {
          grouped[cat] = [];
        }
        grouped[cat].push({
          id: item.id,
          name: item.name,
          isPacked: item.is_packed === 1
        });
      });
      
      setCategories(grouped);
      alert("Smart packing checklist generated based on your stops' local weather and climate!");
    } catch (err) {
      console.error('Failed to generate smart list:', err);
    } finally {
      setPackingLoading(false);
    }
  };

  const filteredCategories = useMemo(() => {
    const result = {};
    Object.entries(categories).forEach(([cat, items]) => {
      result[cat] = items.filter(item => 
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    });
    return result;
  }, [categories, searchQuery]);

  const stats = useMemo(() => {
    let totalItems = 0;
    let totalPacked = 0;
    Object.values(categories).forEach((items) => {
      totalItems += items.length;
      totalPacked += items.filter((i) => i.isPacked).length;
    });
    const percentage = totalItems > 0 ? Math.round((totalPacked / totalItems) * 100) : 0;
    return { totalItems, totalPacked, percentage };
  }, [categories]);

  return (
    <div className="min-h-screen bg-[#0b0c14] text-white selection:bg-blue-500/30 pb-32">
      <Navbar />

      <main className="max-w-3xl mx-auto px-6 pt-32 space-y-12">
        
        {/* Page Header & Trip Selector */}
        <header className="space-y-8">
           <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                 <button aria-label="Back to dashboard" onClick={() => navigate(-1)} className="p-3 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 transition-all">
                    <ArrowLeft size={18} />
                 </button>
                 <h1 className="text-4xl font-black uppercase tracking-tight leading-none">Packing <span className="text-blue-500">List</span></h1>
              </div>
               <div className="relative group min-w-[240px]">
                  <Briefcase size={16} className="absolute left-5 top-1/2 -translate-y-1/2 text-blue-500 pointer-events-none" />
                  <select 
                     aria-label="Select trip"
                     value={selectedTripId || ''}
                     onChange={(e) => setSelectedTripId(parseInt(e.target.value))}
                     className="w-full appearance-none pl-12 pr-10 py-3 bg-[#161827] border border-white/10 rounded-full text-xs font-black uppercase tracking-widest outline-none cursor-pointer hover:border-white/20 transition-all text-white bg-slate-900"
                  >
                     {tripsLoading ? (
                       <option>Loading trips...</option>
                     ) : trips.length === 0 ? (
                       <option>No trips found</option>
                     ) : (
                       trips.map(trip => (
                         <option key={trip.id} value={trip.id}>{trip.name}</option>
                       ))
                     )}
                  </select>
                  <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 pointer-events-none" />
               </div>
            </div>

            {/* Search & Filter Bar */}
            <div className="flex gap-4">
               <div className="flex-1 relative">
                  <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20" size={18} />
                  <input 
                     type="text" 
                     placeholder="Search for an item..."
                     value={searchQuery}
                     onChange={(e) => setSearchQuery(e.target.value)}
                     className="w-full pl-14 pr-6 py-4 bg-white/5 border border-white/10 rounded-full focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                  />
               </div>
               <button aria-label="Filter packing list" className="p-4 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 transition-all">
                  <Filter size={18} />
               </button>
            </div>
         </header>

         {/* Global Progress Section */}
         <section className="bg-[#161827] border border-white/10 rounded-4xl p-8 space-y-6 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/5 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2" />
            
            <div className="flex items-center justify-between relative z-10">
               <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Overall Progress</p>
                  <p className="text-2xl font-black">Progress: <span className="text-blue-500">{stats.totalPacked}/{stats.totalItems}</span> items packed</p>
               </div>
               <div className="text-right">
                  <p className="text-3xl font-black text-blue-500">{stats.percentage}%</p>
               </div>
            </div>

            <div className="h-3 w-full bg-white/10 rounded-full overflow-hidden relative z-10">
               <div 
                 className="h-full bg-blue-600 rounded-full transition-all duration-700 ease-out shadow-[0_0_20px_rgba(37,99,235,0.4)]"
                 style={{ width: `${stats.percentage}%` }}
               />
            </div>
         </section>

         {/* Add Item Form */}
         <section>
           <form onSubmit={addItem} className="flex gap-4">
              <div className="flex-1 relative">
                 <Plus className="absolute left-5 top-1/2 -translate-y-1/2 text-blue-500" size={18} />
                 <input 
                   type="text" 
                   value={newItemName}
                   onChange={(e) => setNewItemName(e.target.value)}
                   placeholder="Add item to checklist..."
                   className="w-full pl-14 pr-6 py-5 bg-[#0b0c14] border-2 border-dashed border-white/10 rounded-3xl focus:border-blue-500/50 outline-none transition-all placeholder:text-slate-600 font-medium"
                 />
              </div>
              <div className="relative group min-w-35">
                 <select 
                   aria-label="Select packing category"
                   value={activeCategory}
                   onChange={(e) => setActiveCategory(e.target.value)}
                   className="w-full appearance-none pl-6 pr-10 py-5 bg-[#161827] border border-white/10 rounded-3xl text-xs font-black uppercase tracking-widest outline-none cursor-pointer hover:border-white/20 transition-all bg-slate-900"
                 >
                    {Object.keys(categories).map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                 </select>
                 <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 pointer-events-none" />
              </div>
           </form>
         </section>

         {/* Categorized Lists */}
         <div className="space-y-8">
            {packingLoading ? (
              <div className="py-20 flex justify-center">
                 <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
              </div>
            ) : Object.entries(filteredCategories).map(([category, items]) => {
              const packedCount = items.filter(i => i.isPacked).length;
              const totalCount = items.length;
             
             return (
               <div key={category} className="bg-[#161827] border border-white/10 rounded-4xl p-8 space-y-8 group hover:border-white/20 transition-all shadow-xl">
                  <header className="flex items-center justify-between">
                     <div className="flex items-center gap-4">
                        <div className="p-3 bg-white/5 rounded-2xl">
                           {CATEGORY_ICONS[category]}
                        </div>
                        <h2 className="text-xl font-black uppercase tracking-tight">{category}</h2>
                     </div>
                     <div className="px-4 py-1.5 bg-white/5 rounded-full border border-white/10">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                           {packedCount}/{totalCount}
                        </span>
                     </div>
                  </header>

                  <div className="space-y-4">
                     {items.map((item) => (
                       <div 
                        key={item.id}
                        className="flex items-center justify-between group/item p-4 hover:bg-white/2 rounded-2xl transition-all"
                       >
                          <div className="flex items-center gap-5">
                             <div className="relative flex items-center">
                                <input 
                                  type="checkbox"
                                  aria-label={`Mark ${item.name} packed`}
                                  checked={item.isPacked}
                                  onChange={() => toggleItem(category, item.id)}
                                  className="w-6 h-6 appearance-none border-2 border-white/10 rounded-lg checked:bg-blue-600 checked:border-blue-600 transition-all cursor-pointer accent-blue-600"
                                />
                                {item.isPacked && (
                                  <Check className="absolute left-1 top-1 text-white pointer-events-none" size={16} strokeWidth={4} />
                                )}
                             </div>
                             <span className={`text-base font-medium transition-all ${item.isPacked ? 'text-slate-500 line-through' : 'text-white'}`}>
                                {item.name}
                             </span>
                          </div>
                          <button 
                            aria-label={`Delete ${item.name}`}
                            onClick={() => deleteItem(category, item.id)}
                            className="p-2 text-white/0 group-hover/item:text-white/20 hover:text-rose-500 transition-all"
                          >
                             <Trash2 size={16} />
                          </button>
                       </div>
                     ))}
                  </div>
               </div>
             );
           })}
        </div>

        {/* Global Action Buttons */}
        <footer className="flex flex-col sm:flex-row justify-center gap-6 pt-12">
           <button 
            onClick={resetList}
            className="flex items-center justify-center gap-3 px-8 py-4 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 transition-all group cursor-pointer"
           >
              <RotateCcw size={18} className="text-white/40 group-hover:rotate-45 transition-transform" />
              <span className="text-xs font-black uppercase tracking-widest">Reset Checks</span>
           </button>
           <button 
            onClick={generateWeatherSmartList}
            className="flex items-center justify-center gap-3 px-8 py-4 bg-blue-600/20 border border-blue-500/30 text-blue-400 hover:bg-blue-600 hover:text-white rounded-full transition-all group cursor-pointer"
           >
              <Compass size={18} className="group-hover:animate-spin transition-transform" />
              <span className="text-xs font-black uppercase tracking-widest">Smart packing suggestions</span>
           </button>
           <button className="flex items-center justify-center gap-3 px-8 py-4 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 transition-all group cursor-pointer">
              <Share2 size={18} className="text-white/40 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-black uppercase tracking-widest">Share Checklist</span>
           </button>
        </footer>
      </main>

      <footer className="py-20 text-center">
         <p className="text-[10px] text-white/5 font-black uppercase tracking-[0.5em]">Traveloop Utilities • Ready for Departure</p>
      </footer>
    </div>
  );
}
