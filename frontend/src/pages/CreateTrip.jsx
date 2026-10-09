import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Calendar, 
  Upload, 
  Loader2, 
  ChevronRight,
  Compass,
  Wallet
} from 'lucide-react';
import api from "../api";
import Navbar from '../components/Navbar';

const CreateTrip = () => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    start_date: '',
    end_date: '',
    total_budget: 250000,
    image_url: null
  });
  const coverInputRef = useRef(null);
  const [coverPreview, setCoverPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isValidImage = file.type.startsWith('image/');
    if (!isValidImage) {
      setError('Please upload a valid image file.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Cover image must be smaller than 5MB.');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('file', file);
      const uploadRes = await api.post('/api/uploads/images', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const url = uploadRes.data.url;
      setCoverPreview(url);
      setFormData(prev => ({ ...prev, image_url: url }));
      setError('');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to upload cover image.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Payload for backend
    const payload = {
      name: formData.name,
      start_date: formData.start_date,
      end_date: formData.end_date,
      total_budget: parseFloat(formData.total_budget) || 250000,
      image_url: formData.image_url
    };

    try {
      await api.post('/api/trips', payload);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create trip. Please check your dates.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSuggestion = (item) => {
    setFormData(prev => ({
      ...prev,
      name: item.title,
      image_url: item.img
    }));
    setCoverPreview(item.img);
  };

  // Static example trip ideas; these are not live search results.
  const suggestions = [
    { id: 1, title: 'Paris, France', category: 'City Lights', img: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&q=80&w=600' },
    { id: 2, title: 'Tokyo Food Tour', category: 'Culinary', img: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&q=80&w=600' },
    { id: 3, title: 'Amalfi Coast Drive', category: 'Adventure', img: 'https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&q=80&w=600' },
    { id: 4, title: 'Kyoto Temples', category: 'Culture', img: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&q=80&w=600' },
    { id: 5, title: 'Bali Surf Break', category: 'Beach', img: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&q=80&w=600' },
    { id: 6, title: 'Swiss Alps Hike', category: 'Nature', img: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&q=80&w=600' },
  ];

  return (
    <div className="min-h-screen bg-[#0b0c14] text-white selection:bg-blue-500/30">
      <Navbar />

      <main className="max-w-6xl mx-auto px-6 pt-32 pb-24">
        <div className="flex flex-col lg:flex-row gap-16">
          
          {/* Form Section */}
          <section className="flex-1 space-y-12">
            <header className="space-y-4">
              <h1 className="text-5xl font-black tracking-tight uppercase leading-[0.9]">Plan a<br/><span className="text-blue-500">New Trip</span></h1>
              <p className="text-slate-400 font-medium">Set your coordinates and prepare for takeoff.</p>
            </header>

            <form onSubmit={handleSubmit} className="space-y-8 bg-[#161827] p-10 rounded-4xl border border-white/10 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/5 blur-3xl rounded-full" />
              
              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl text-sm font-medium animate-in fade-in slide-in-from-top-2">
                  {error}
                </div>
              )}

              <div className="space-y-3">
                <label className="text-xs font-black uppercase tracking-widest text-white/40 ml-1">Trip Name</label>
                <input
                  type="text"
                  name="name"
                  required
                  placeholder="e.g. Summer in Europe 2026"
                  className="w-full px-6 py-5 bg-white/5 border-none rounded-2xl focus:ring-2 focus:ring-blue-500/20 outline-none transition-all hover:bg-white/10 text-white placeholder-white/20"
                  value={formData.name}
                  onChange={handleInputChange}
                />
              </div>

              <div className="space-y-3">
                <label className="text-xs font-black uppercase tracking-widest text-white/40 ml-1">Description (Optional)</label>
                <textarea
                  name="description"
                  rows="3"
                  placeholder="Tell us about the goal of this journey..."
                  className="w-full px-6 py-5 bg-white/5 border-none rounded-2xl focus:ring-2 focus:ring-blue-500/20 outline-none transition-all hover:bg-white/10 text-white placeholder-white/20 resize-none"
                  value={formData.description}
                  onChange={handleInputChange}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-xs font-black uppercase tracking-widest text-white/40 ml-1 flex items-center gap-2">
                    <Calendar size={14} className="text-blue-500" /> Start Date
                  </label>
                  <input
                    type="date"
                    name="start_date"
                    required
                    className="w-full px-6 py-5 bg-white/5 border-none rounded-2xl focus:ring-2 focus:ring-blue-500/20 outline-none transition-all hover:bg-white/10 text-white invert-[0.8] brightness-200"
                    value={formData.start_date}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-xs font-black uppercase tracking-widest text-white/40 ml-1 flex items-center gap-2">
                    <Calendar size={14} className="text-blue-500" /> End Date
                  </label>
                  <input
                    type="date"
                    name="end_date"
                    required
                    className="w-full px-6 py-5 bg-white/5 border-none rounded-2xl focus:ring-2 focus:ring-blue-500/20 outline-none transition-all hover:bg-white/10 text-white invert-[0.8] brightness-200"
                    value={formData.end_date}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-black uppercase tracking-widest text-white/40 ml-1 flex items-center gap-2">
                  <Wallet size={14} className="text-emerald-500" /> Total Trip Budget (Limit)
                </label>
                <div className="relative">
                  <span className="absolute left-6 top-1/2 -translate-y-1/2 text-white/20 font-black">₹</span>
                  <input
                    type="number"
                    name="total_budget"
                    required
                    placeholder="e.g. 250000"
                    className="w-full pl-12 pr-6 py-5 bg-[#161827] border border-white/10 rounded-full focus:ring-2 focus:ring-blue-500/20 outline-none transition-all hover:bg-white/10 text-white placeholder-white/20 shadow-inner"
                    value={formData.total_budget}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              {/* Cover Photo Dropzone */}
              <div className="space-y-3">
                <label className="text-xs font-black uppercase tracking-widest text-white/40 ml-1">Cover Photo</label>
                <div 
                  onClick={() => coverInputRef.current.click()}
                  className="relative group cursor-pointer"
                >
                  <div className="w-full h-40 border-2 border-dashed border-slate-700 rounded-3xl flex flex-col items-center justify-center gap-4 bg-[#161827] group-hover:bg-white/5 group-hover:border-blue-500/50 transition-all overflow-hidden">
                    {coverPreview ? (
                      <img 
                        src={coverPreview} 
                        alt="Cover Preview" 
                        className="w-full h-full object-cover rounded-2xl" 
                      />
                    ) : (
                      <>
                        <div className="p-4 rounded-full bg-white/5 text-white/20 border border-white/5 group-hover:scale-110 transition-transform">
                          <Upload size={24} />
                        </div>
                        <span className="text-xs font-black uppercase tracking-[0.2em] text-white/20 group-hover:text-white/60 transition-colors text-center px-4">Click or drag to upload a cover photo</span>
                      </>
                    )}
                  </div>
                  <input 
                    type="file" 
                    ref={coverInputRef}
                    onChange={handleFileChange}
                    accept="image/*"
                    className="hidden" 
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-6 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-full shadow-2xl shadow-blue-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50 group mt-4"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <span className="uppercase tracking-[0.2em] text-sm">Save Trip</span>
                    <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>
          </section>

          {/* Sidebar */}
          <aside className="hidden lg:block w-80">
             <div className="sticky top-32 p-10 bg-blue-600/5 rounded-4xl border border-white/5 space-y-6 relative overflow-hidden">
                <div className="absolute -top-12 -right-12 w-24 h-24 bg-blue-500/10 blur-2xl rounded-full" />
                <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-400">
                  <Compass size={24} />
                </div>
                <h3 className="text-2xl font-black uppercase tracking-tight">Pro Tip</h3>
                <p className="text-slate-400 font-medium leading-relaxed">
                  Start with a clear goal. Are you exploring hidden gems or visiting world-famous landmarks? You can always add stops and activities later!
                </p>
             </div>
          </aside>
        </div>

        {/* Suggestions Section */}
        <section className="mt-32 space-y-12">
          <header className="flex items-center justify-between border-b border-white/5 pb-6">
            <h2 className="text-3xl font-black">Destinations to Spark <span className="text-blue-500">Inspiration</span></h2>
            <button className="text-xs font-black uppercase tracking-widest text-white/40 hover:text-white transition-colors">View all</button>
          </header>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
            {suggestions.map((item) => (
              <div key={item.id} onClick={() => handleSelectSuggestion(item)} className="group cursor-pointer">
                <div className="relative aspect-4/3 rounded-3xl overflow-hidden mb-6 shadow-2xl">
                  <img 
                    src={item.img} 
                    alt={item.title} 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-linear-to-t from-[#0b0c14]/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="absolute top-4 left-4">
                    <span className="px-3 py-1 bg-white backdrop-blur-md text-[9px] font-black uppercase tracking-widest rounded-full text-black">
                      {item.category}
                    </span>
                  </div>
                </div>
                <h4 className="text-xl font-black group-hover:text-blue-400 transition-colors uppercase tracking-tight">{item.title}</h4>
                <p className="text-sm text-slate-500 font-medium mt-2">Recommended for your next adventure</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="py-16 border-t border-white/5 text-center">
        <p className="text-[10px] text-white/20 font-black uppercase tracking-[0.3em]">
          Traveloop © 2026 • Designed for Modern Explorers
        </p>
      </footer>
    </div>

  );
};

export default CreateTrip;
