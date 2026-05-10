import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  StickyNote,
  Plus,
  Pencil,
  Trash2,
  Calendar,
  Search,
  Filter,
  ArrowLeft,
  ChevronDown,
  Loader2,
  X,
  Clock,
  MapPin,
  CheckCircle2,
} from 'lucide-react';
import api from '../api';

export default function TripNotes() {
  const navigate = useNavigate();
  const [trips, setTrips] = useState([]);
  const [selectedTripId, setSelectedTripId] = useState(null);
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notesLoading, setNotesLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('all'); // all, byDay, byStop
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // add, edit
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    day_info: '',
  });

  useEffect(() => {
    const fetchTrips = async () => {
      try {
        setLoading(true);
        const response = await api.get('/api/trips');
        setTrips(response.data);
        if (response.data.length > 0) {
          setSelectedTripId(response.data[0].id);
        }
      } catch (err) {
        console.error('Error fetching trips:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchTrips();
  }, []);

  useEffect(() => {
    if (selectedTripId) {
      const fetchNotes = async () => {
        try {
          setNotesLoading(true);
          const response = await api.get(`/api/notes?trip_id=${selectedTripId}`);
          setNotes(response.data);
        } catch (err) {
          console.error('Error fetching notes:', err);
        } finally {
          setNotesLoading(false);
        }
      };
      fetchNotes();
    }
  }, [selectedTripId]);

  const filteredNotes = useMemo(() => {
    return notes.filter(note => 
      note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.content.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [notes, searchQuery]);

  const handleAddNote = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...formData, trip_id: selectedTripId };
      const response = await api.post('/api/notes', payload);
      setNotes([response.data, ...notes]);
      setIsModalOpen(false);
      setFormData({ title: '', content: '', day_info: '' });
    } catch (err) {
      console.error('Error creating note:', err);
    }
  };

  const handleDeleteNote = async (noteId) => {
    if (!window.confirm('Delete this note?')) return;
    try {
      await api.delete(`/api/notes/${noteId}`);
      setNotes(notes.filter(n => n.id !== noteId));
    } catch (err) {
      console.error('Error deleting note:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b0c14] flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0c14] text-white selection:bg-blue-500/30 pb-32">
      {/* Navigation */}
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

      <main className="max-w-4xl mx-auto px-6 pt-32 space-y-12">
        
        {/* Page Header */}
        <header className="space-y-8 text-center md:text-left">
           <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-4 justify-center md:justify-start">
                 <button onClick={() => navigate(-1)} className="p-3 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 transition-all">
                    <ArrowLeft size={18} />
                 </button>
                 <h1 className="text-4xl font-black uppercase tracking-tight leading-none">Trip <span className="text-blue-500">Journal</span></h1>
              </div>
              
              <button 
                onClick={() => setIsModalOpen(true)}
                className="flex items-center justify-center gap-3 px-8 py-4 bg-blue-600 rounded-full font-black text-xs uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-blue-600/20 active:scale-95"
              >
                <Plus size={18} />
                Add Note
              </button>
           </div>

           {/* Control Bar */}
           <div className="flex flex-col md:flex-row items-center gap-6 bg-[#161827] border border-white/10 p-4 rounded-4xl shadow-2xl">
              <div className="relative min-w-[200px]">
                 <select 
                   value={selectedTripId}
                   onChange={(e) => setSelectedTripId(e.target.value)}
                   className="w-full appearance-none pl-6 pr-12 py-3 bg-white/5 border border-white/10 rounded-full text-xs font-black uppercase tracking-widest outline-none cursor-pointer focus:border-blue-500/50 transition-all"
                 >
                    {trips.map(trip => (
                      <option key={trip.id} value={trip.id}>{trip.name}</option>
                    ))}
                 </select>
                 <ChevronDown size={14} className="absolute right-5 top-1/2 -translate-y-1/2 text-white/20 pointer-events-none" />
              </div>

              <div className="flex bg-white/5 p-1 rounded-full border border-white/5">
                 {[
                   { id: 'all', label: 'All Notes' },
                   { id: 'byDay', label: 'By Day' },
                   { id: 'byStop', label: 'By Stop' }
                 ].map(mode => (
                   <button
                    key={mode.id}
                    onClick={() => setViewMode(mode.id)}
                    className={`px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                      viewMode === mode.id ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                   >
                     {mode.label}
                   </button>
                 ))}
              </div>

              <div className="flex-1 relative w-full md:w-auto">
                 <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20" size={16} />
                 <input 
                  type="text" 
                  placeholder="Filter notes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-6 py-3 bg-white/5 border border-white/10 rounded-full text-sm outline-none focus:ring-1 focus:ring-blue-500/30 transition-all"
                 />
              </div>
           </div>
        </header>

        {/* Notes Grid/List */}
        <div className="space-y-6">
           {notesLoading ? (
             <div className="py-20 flex justify-center">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
             </div>
           ) : filteredNotes.length === 0 ? (
             <div className="py-32 flex flex-col items-center justify-center bg-[#161827] border border-dashed border-white/10 rounded-4xl space-y-4 text-center">
                <StickyNote size={48} className="text-white/10" />
                <div className="space-y-1">
                   <p className="text-lg font-black uppercase tracking-tight">No notes found</p>
                   <p className="text-slate-500 text-sm">Start documenting your journey by adding your first reminder.</p>
                </div>
                <button 
                  onClick={() => setIsModalOpen(true)}
                  className="mt-4 px-6 py-2 bg-white/5 border border-white/10 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all"
                >
                  Create First Note
                </button>
             </div>
           ) : (
             <div className="grid grid-cols-1 gap-6">
                {filteredNotes.map((note) => (
                  <div 
                    key={note.id}
                    className="group bg-[#161827] border border-white/10 rounded-4xl p-8 space-y-6 hover:border-blue-500/30 transition-all shadow-xl relative overflow-hidden"
                  >
                     <div className="absolute top-0 left-0 w-1 h-full bg-blue-600/20 group-hover:bg-blue-600 transition-all" />
                     
                     <div className="flex justify-between items-start">
                        <div className="space-y-1">
                           <div className="flex items-center gap-3">
                              <h3 className="text-xl font-black uppercase tracking-tight leading-tight">{note.title}</h3>
                              {note.day_info && (
                                <span className="px-3 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full text-[8px] font-black uppercase tracking-widest">
                                  {note.day_info}
                                </span>
                              )}
                           </div>
                           <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                              <Clock size={12} />
                              {note.created_at}
                           </p>
                        </div>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                           <button className="p-2.5 bg-white/5 border border-white/10 rounded-xl hover:bg-blue-600/20 hover:text-blue-400 transition-all">
                              <Pencil size={14} />
                           </button>
                           <button 
                            onClick={() => handleDeleteNote(note.id)}
                            className="p-2.5 bg-white/5 border border-white/10 rounded-xl hover:bg-red-500/20 hover:text-red-400 transition-all"
                           >
                              <Trash2 size={14} />
                           </button>
                        </div>
                     </div>

                     <p className="text-slate-400 leading-relaxed font-medium">
                        {note.content}
                     </p>

                     <div className="flex items-center gap-6 pt-4 border-t border-white/5 text-[10px] font-black uppercase tracking-widest text-white/20">
                        <div className="flex items-center gap-2">
                           <MapPin size={12} className="text-blue-500/40" />
                           Associated with Itinerary
                        </div>
                        <div className="flex items-center gap-2">
                           <CheckCircle2 size={12} className="text-green-500/40" />
                           Verified Scratchpad
                        </div>
                     </div>
                  </div>
                ))}
             </div>
           )}
        </div>
      </main>

      {/* Note Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-6">
           <div className="absolute inset-0 bg-[#0b0c14]/90 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
           <div className="bg-[#161827] border border-white/10 w-full max-w-lg rounded-4xl p-10 relative z-[101] shadow-3xl animate-in fade-in zoom-in duration-300">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="absolute top-6 right-6 p-2 text-white/20 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>

              <div className="space-y-8">
                 <div className="space-y-2">
                    <h2 className="text-3xl font-black uppercase tracking-tight">Create <span className="text-blue-500">Note</span></h2>
                    <p className="text-slate-500 text-xs font-medium uppercase tracking-widest">Journaling your journey</p>
                 </div>

                 <form onSubmit={handleAddNote} className="space-y-6">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-4">Title</label>
                       <input 
                         type="text" 
                         required
                         value={formData.title}
                         onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                         placeholder="e.g. Hotel confirmation, packing list"
                         className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-blue-500/20 outline-none transition-all placeholder:text-slate-700"
                       />
                    </div>

                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-4">Context (Day / Stop)</label>
                       <div className="relative">
                          <input 
                            type="text" 
                            value={formData.day_info}
                            onChange={(e) => setFormData({ ...formData, day_info: e.target.value })}
                            placeholder="e.g. Day 3, Rome Stay"
                            className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-blue-500/20 outline-none transition-all placeholder:text-slate-700"
                          />
                          <Calendar className="absolute right-6 top-1/2 -translate-y-1/2 text-white/10" size={18} />
                       </div>
                    </div>

                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-4">Content</label>
                       <textarea 
                         rows={5}
                         required
                         value={formData.content}
                         onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                         placeholder="What's on your mind? Hotel details, gate numbers, or memories..."
                         className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-blue-500/20 outline-none transition-all placeholder:text-slate-700 resize-none"
                       />
                    </div>

                    <button 
                      type="submit"
                      className="w-full py-5 bg-blue-600 rounded-3xl font-black text-xs uppercase tracking-[0.2em] hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/20 active:scale-[0.98]"
                    >
                      Save to Journal
                    </button>
                 </form>
              </div>
           </div>
        </div>
      )}

      <footer className="py-20 text-center">
         <p className="text-[10px] text-white/5 font-black uppercase tracking-[0.5em]">Traveloop Journal • Capturing the moment</p>
      </footer>
    </div>
  );
}
