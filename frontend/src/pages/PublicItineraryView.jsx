import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Share2,
  Link as LinkIcon,
  Copy,
  MapPin,
  Clock,
  Wallet,
  ArrowLeft,
  Globe,
  ExternalLink,
  Loader2,
  CheckCircle,
  Compass,
} from 'lucide-react';
import api from '../api';
import { resolveApiUrl } from '../utils/media';

export default function PublicItineraryView() {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cloneLoading, setCloneLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [cloneSuccess, setCloneSuccess] = useState(false);

  const getImageUrl = (url) => {
    return resolveApiUrl(url, "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=2000&q=80");
  };

  useEffect(() => {
    const fetchPublicTrip = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/api/public/trips/${tripId}`);
        setTrip(response.data);
      } catch (err) {
        console.error('Error fetching public trip:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPublicTrip();
  }, [tripId]);

  const handleClone = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      navigate('/login', { state: { from: `/trip/public/${tripId}` } });
      return;
    }

    try {
      setCloneLoading(true);
      await api.post(`/api/trips/${tripId}/clone`);
      setCloneSuccess(true);
      
      // Auto-redirect to dashboard
      setTimeout(() => {
        navigate('/dashboard');
      }, 1200);
    } catch (err) {
      console.error('Error cloning trip:', err);
      if (err.response?.status === 401) {
        navigate('/login');
      }
    } finally {
      setCloneLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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
        <h2 className="text-2xl font-black uppercase text-white mb-4">Itinerary not found</h2>
        <Link to="/community" className="px-8 py-3 bg-white text-black rounded-full font-black text-xs uppercase tracking-widest">Explore Community</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0c14] text-white selection:bg-blue-500/30 pb-32">
      
      {/* Universal Hero Banner */}
      <section className="relative h-[65vh] min-h-125 w-full overflow-hidden">
        <img 
          src={getImageUrl(trip.image_url)} 
          alt="Banner" 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-linear-to-t from-[#0b0c14] via-[#0b0c14]/30 to-transparent" />
        
        {/* Navigation & Sharing Bar */}
        <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-50">
           <Link to="/community" className="flex items-center gap-2 px-6 py-3 bg-black/40 backdrop-blur-xl border border-white/10 rounded-full hover:bg-black/60 transition-all group">
             <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
             <span className="text-[10px] font-black uppercase tracking-widest">Community</span>
           </Link>

           {/* Platform-Agnostic Social Container */}
           <div className="flex items-center gap-2 p-1.5 bg-white/5 backdrop-blur-xl border border-white/10 rounded-full shadow-2xl">
              <button 
                onClick={copyToClipboard}
                className="p-3 hover:bg-white/10 rounded-full text-white/60 hover:text-white transition-all relative group/copy"
              >
                {copied ? <CheckCircle size={18} className="text-emerald-400" /> : <LinkIcon size={18} />}
                {copied && (
                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3 px-4 py-1.5 bg-emerald-500 text-white text-[9px] font-black uppercase tracking-widest rounded-lg shadow-xl animate-in zoom-in slide-in-from-top-2">
                    Link Copied!
                  </div>
                )}
              </button>
              <div className="w-px h-4 bg-white/10" />
              <button className="p-3 hover:bg-white/10 rounded-full text-white/60 hover:text-white transition-all">
                <Globe size={18} />
              </button>
              <button className="p-3 hover:bg-white/10 rounded-full text-white/60 hover:text-white transition-all">
                <Share2 size={18} />
              </button>
           </div>
        </div>

        {/* Hero Branding */}
        <div className="absolute bottom-0 left-0 right-0 p-12 max-w-4xl mx-auto text-center space-y-8">
           <div className="space-y-4">
             <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-600/10 border border-blue-500/20 rounded-full">
                <Compass size={12} className="text-blue-500" />
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-blue-400">Public Explorer View</span>
             </div>
             <h1 className="text-6xl md:text-8xl font-black uppercase tracking-tighter leading-[0.9] drop-shadow-2xl">{trip.name}</h1>
             <div className="flex items-center justify-center gap-4 text-[10px] font-bold text-white/40 uppercase tracking-widest">
                <div className="w-8 h-8 rounded-full bg-white/10 border border-white/10 overflow-hidden">
                  <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Traveler" alt="Avatar" />
                </div>
                <span>Curated by <span className="text-white">@traveloop_explorer</span></span>
             </div>
           </div>

           {/* Primary Action Button */}
           <div className="pt-6">
              <button 
                onClick={handleClone}
                disabled={cloneLoading || cloneSuccess}
                className={`group relative flex items-center gap-4 px-12 py-6 rounded-full font-black text-xs uppercase tracking-widest transition-all shadow-2xl active:scale-95 ${cloneSuccess ? 'bg-emerald-500 text-white shadow-emerald-500/20' : 'bg-blue-600 text-white shadow-blue-500/20 hover:scale-105 hover:bg-blue-700'}`}
              >
                {cloneLoading ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : cloneSuccess ? (
                  <CheckCircle size={18} />
                ) : (
                  <Copy size={18} className="group-hover:rotate-6 transition-transform" />
                )}
                {cloneSuccess ? 'Trip Cloned!' : 'Clone to My Itinerary'}
              </button>
           </div>
        </div>
      </section>

      {/* Itinerary Body */}
      <main className="max-w-3xl mx-auto px-6 py-24 space-y-20">
        {trip.stops?.map((stop, idx) => (
          <div key={idx} className="space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700" style={{ animationDelay: `${idx * 100}ms` }}>
            <div className="flex items-center gap-6">
              <div className="w-14 h-14 rounded-4xl bg-blue-600 flex items-center justify-center shadow-2xl shadow-blue-600/20">
                  <MapPin size={26} className="text-white" />
               </div>
               <div className="space-y-1">
                 <h2 className="text-4xl font-black uppercase tracking-tight leading-none">{stop.city_name}</h2>
                 <p className="text-blue-500 text-[10px] font-black uppercase tracking-widest">{new Date(stop.arrival_date).toDateString()}</p>
               </div>
            </div>

            <div className="grid gap-6">
               {stop.activities?.map((act, i) => (
                 <div key={i} className="bg-[#161827] border border-white/5 p-8 rounded-[2rem] hover:border-white/10 transition-all group">
                    <div className="flex justify-between items-start">
                       <div className="space-y-4">
                          <h4 className="text-xl font-black uppercase tracking-tight group-hover:text-blue-400 transition-colors">
                            {typeof act === 'object' ? act.name : act}
                          </h4>
                          <div className="flex flex-wrap gap-4">
                             <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/20">
                                <Clock size={12} />
                                <span>Planned Experience</span>
                             </div>
                             {typeof act === 'object' && act.cost > 0 && (
                               <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-400 px-3 py-1 bg-emerald-400/5 rounded-full border border-emerald-400/10">
                                  <Wallet size={12} />
                                  <span>₹{act.cost.toLocaleString()}</span>
                               </div>
                             )}
                          </div>
                       </div>
                       <div className="p-2 rounded-xl bg-white/5 text-white/10 group-hover:bg-blue-600/20 group-hover:text-blue-400 transition-all">
                          <ExternalLink size={18} />
                       </div>
                    </div>
                 </div>
               ))}

               {stop.description && (
                 <div className="p-8 bg-white/[0.02] border-l-4 border-blue-500/30 rounded-4xl">
                    <p className="text-slate-400 italic text-sm leading-relaxed">"{stop.description}"</p>
                 </div>
               )}
            </div>
          </div>
        ))}

        {/* Final CTA Area */}
        <section className="pt-32 border-t border-white/5 text-center space-y-12">
           <div className="space-y-4">
              <h3 className="text-3xl font-black uppercase tracking-tight text-white leading-none">Ready for your adventure?</h3>
              <p className="text-slate-500 font-medium max-w-sm mx-auto text-sm">Clone this itinerary to your profile and start customizing it for your own dream trip.</p>
           </div>
           
           <div className="flex flex-col items-center gap-8">
              <div className="flex flex-col sm:flex-row justify-center gap-4 w-full">
                <button 
                  onClick={handleClone} 
                  disabled={cloneLoading || cloneSuccess}
                  className={`px-12 py-5 rounded-full font-black text-[10px] uppercase tracking-widest transition-all shadow-xl ${cloneSuccess ? 'bg-emerald-500 text-white' : 'bg-white text-black hover:scale-105 active:scale-95'}`}
                >
                  {cloneSuccess ? 'Success!' : 'Clone to My Itinerary'}
                </button>
                <Link to="/dashboard" className="px-12 py-5 border border-white/10 rounded-full font-black text-[10px] uppercase tracking-widest hover:bg-white/5 transition-all text-white">Return to My Trips</Link>
              </div>
              
              <div className="pt-10 space-y-4">
                 <p className="text-[10px] font-black uppercase tracking-widest text-white/20">Spread the word</p>
                 <div className="flex items-center gap-3 p-1.5 bg-white/5 border border-white/10 rounded-full shadow-inner">
                    <button onClick={copyToClipboard} className="flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-[10px] font-black uppercase tracking-widest text-slate-300 transition-all">
                       <LinkIcon size={14} />
                       {copied ? 'Copied!' : 'Copy Link'}
                    </button>
                    <button className="p-3 bg-white/5 border border-white/10 rounded-full text-slate-400 hover:text-white transition-all">
                       <Globe size={14} />
                    </button>
                    <button className="p-3 bg-white/5 border border-white/10 rounded-full text-slate-400 hover:text-white transition-all">
                       <Share2 size={14} />
                    </button>
                 </div>
              </div>
           </div>
        </section>
      </main>

      <footer className="py-24 text-center border-t border-white/5 mt-20 opacity-50">
         <p className="text-[9px] text-white/10 font-black uppercase tracking-[0.8em]">Traveloop Public Discovery • Sharing the World</p>
      </footer>
    </div>
  );
}
