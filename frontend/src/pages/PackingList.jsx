import React, { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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
  MoreVertical,
} from 'lucide-react';

const INITIAL_PACKING_LIST = {
  Documents: [
    { id: 1, name: 'Passport & Visa', isPacked: true },
    { id: 2, name: 'Travel Insurance', isPacked: false },
    { id: 3, name: 'Flight Tickets', isPacked: true },
  ],
  Clothing: [
    { id: 4, name: 'Cotton T-shirts', isPacked: false },
    { id: 5, name: 'Comfortable Jeans', isPacked: false },
    { id: 6, name: 'Light Jacket', isPacked: true },
    { id: 7, name: 'Walking Shoes', isPacked: true },
  ],
  Electronics: [
    { id: 8, name: 'Universal Adapter', isPacked: true },
    { id: 9, name: 'Power Bank', isPacked: false },
    { id: 10, name: 'Camera & SD Cards', isPacked: false },
    { id: 11, name: 'Noise Cancelling Headphones', isPacked: false },
  ],
};

const CATEGORY_ICONS = {
  Documents: <FileText size={18} className="text-blue-500" />,
  Clothing: <Shirt size={18} className="text-emerald-500" />,
  Electronics: <Smartphone size={18} className="text-rose-500" />,
};

export default function PackingList() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState(INITIAL_PACKING_LIST);
  const [newItemName, setNewItemName] = useState('');
  const [activeCategory, setActiveCategory] = useState('Documents');

  const toggleItem = (category, itemId) => {
    setCategories((prev) => ({
      ...prev,
      [category]: prev[category].map((item) =>
        item.id === itemId ? { ...item, isPacked: !item.isPacked } : item
      ),
    }));
  };

  const addItem = (e) => {
    e.preventDefault();
    if (!newItemName.trim()) return;

    const newItem = {
      id: Date.now(),
      name: newItemName,
      isPacked: false,
    };

    setCategories((prev) => ({
      ...prev,
      [activeCategory]: [...prev[activeCategory], newItem],
    }));
    setNewItemName('');
  };

  const deleteItem = (category, itemId) => {
    setCategories((prev) => ({
      ...prev,
      [category]: prev[category].filter((item) => item.id !== itemId),
    }));
  };

  const resetList = () => {
    setCategories((prev) => {
      const reset = {};
      Object.keys(prev).forEach((cat) => {
        reset[cat] = prev[cat].map((item) => ({ ...item, isPacked: false }));
      });
      return reset;
    });
  };

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
      {/* Fixed Header */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0b0c14]/80 backdrop-blur-md border-b border-white/5 px-6 py-4 flex justify-between items-center">
        <Link to="/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
            <div className="w-4 h-4 bg-[#0b0c14] rounded-sm rotate-45" />
          </div>
          <span className="text-xl font-black tracking-tighter uppercase">Traveloop</span>
        </Link>
        <div className="flex items-center gap-6">
           <Link to="/dashboard" className="text-xs font-black uppercase tracking-widest text-white/40 hover:text-white transition-colors">My Trips</Link>
           <Link to="/community" className="text-xs font-black uppercase tracking-widest text-white/40 hover:text-white transition-colors">Community</Link>
           <button onClick={() => navigate('/profile')} className="w-8 h-8 rounded-full bg-white/10 overflow-hidden border border-white/10">
             <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Traveloop" alt="User" />
           </button>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 pt-32 space-y-12">
        
        {/* Page Header & Trip Selector */}
        <header className="space-y-8">
           <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                 <button onClick={() => navigate(-1)} className="p-3 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 transition-all">
                    <ArrowLeft size={18} />
                 </button>
                 <h1 className="text-4xl font-black uppercase tracking-tight leading-none">Packing <span className="text-blue-500">List</span></h1>
              </div>
              <div className="relative group">
                 <button className="flex items-center gap-4 px-6 py-3 bg-[#161827] border border-white/10 rounded-full hover:border-white/20 transition-all">
                    <Briefcase size={16} className="text-blue-500" />
                    <span className="text-xs font-black uppercase tracking-widest">Trip: Paris & Rome Adventure</span>
                    <ChevronDown size={14} className="text-white/20" />
                 </button>
              </div>
           </div>

           {/* Search & Filter Bar */}
           <div className="flex gap-4">
              <div className="flex-1 relative">
                 <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20" size={18} />
                 <input 
                    type="text" 
                    placeholder="Search for an item..."
                    className="w-full pl-14 pr-6 py-4 bg-white/5 border border-white/10 rounded-full focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                 />
              </div>
              <button className="p-4 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 transition-all">
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
                  value={activeCategory}
                  onChange={(e) => setActiveCategory(e.target.value)}
                  className="w-full appearance-none pl-6 pr-10 py-5 bg-[#161827] border border-white/10 rounded-3xl text-xs font-black uppercase tracking-widest outline-none cursor-pointer hover:border-white/20 transition-all"
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
           {Object.entries(categories).map(([category, items]) => {
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
            className="flex items-center justify-center gap-3 px-8 py-4 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 transition-all group"
           >
              <RotateCcw size={18} className="text-white/40 group-hover:rotate-45 transition-transform" />
              <span className="text-xs font-black uppercase tracking-widest">Reset All Checks</span>
           </button>
           <button className="flex items-center justify-center gap-3 px-8 py-4 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 transition-all group">
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
