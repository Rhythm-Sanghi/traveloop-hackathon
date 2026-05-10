import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  User,
  Mail,
  Globe,
  Settings,
  Trash2,
  ExternalLink,
  Camera,
  ChevronRight,
  Shield,
  Bell,
  LogOut,
  Loader2,
  Calendar,
  MapPin,
  Compass,
  Phone,
  Info,
  ShieldCheck,
} from 'lucide-react';
import api from '../api';

export default function ProfilePage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tripsLoading, setTripsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [editData, setEditData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    city: '',
    country: '',
    additional_info: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const profileRes = await api.get('/api/profile');
        setProfile(profileRes.data);
        setEditData({
          first_name: profileRes.data.first_name || '',
          last_name: profileRes.data.last_name || '',
          email: profileRes.data.email || '',
          phone: profileRes.data.phone || '',
          city: profileRes.data.city || '',
          country: profileRes.data.country || '',
          additional_info: profileRes.data.additional_info || '',
        });
      } catch (err) {
        if (err.response?.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('access_token');
          navigate('/login');
        }
        console.error('Error fetching profile:', err);
        setError('Failed to load profile data.');
      } finally {
        setLoading(false);
      }

      try {
        setTripsLoading(true);
        const tripsRes = await api.get('/api/trips');
        setTrips(tripsRes.data);
      } catch (err) {
        if (err.response?.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('access_token');
          navigate('/login');
        }
        console.error('Error fetching trips:', err);
      } finally {
        setTripsLoading(false);
      }
    };

    fetchData();
  }, []);

  const { preplannedTrips, previousTrips } = useMemo(() => {
    const now = new Date();
    // Normalize "now" to start of day for cleaner comparison if needed
    // But usually simple date comparison is fine
    return trips.reduce(
      (acc, trip) => {
        if (!trip.end_date) {
            acc.preplannedTrips.push(trip);
            return acc;
        }
        const endDate = new Date(trip.end_date);
        if (endDate >= now) {
          acc.preplannedTrips.push(trip);
        } else {
          acc.previousTrips.push(trip);
        }
        return acc;
      },
      { preplannedTrips: [], previousTrips: [] }
    );
  }, [trips]);

  const handleSaveProfile = async () => {
    try {
      setSaveLoading(true);
      setError('');
      setSuccess('');
      
      await api.post('/api/profile', editData);
      
      setProfile({ ...profile, ...editData });
      setIsEditing(false);
      setSuccess('Profile updated successfully!');
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error saving profile:', err);
      setError('Failed to save profile changes.');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b0c14] flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0c14] text-white selection:bg-blue-500/30">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0b0c14]/80 backdrop-blur-md border-b border-white/5 px-6 py-4 flex justify-between items-center">
        <Link to="/dashboard" className="flex items-center gap-2 group">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center group-hover:rotate-12 transition-transform">
            <div className="w-4 h-4 bg-[#0b0c14] rounded-sm rotate-45" />
          </div>
          <span className="text-xl font-black tracking-tighter uppercase">Traveloop</span>
        </Link>
        <button 
          onClick={handleLogout}
          className="p-2.5 rounded-xl bg-white/5 hover:bg-red-500/10 text-white/40 hover:text-red-400 transition-all flex items-center gap-2"
        >
          <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Logout</span>
          <LogOut size={18} />
        </button>
      </nav>

      <main className="max-w-5xl mx-auto px-6 pt-32 pb-24">
        
        {/* Alerts */}
        {(error || success) && (
          <div className={`mb-8 p-4 rounded-2xl border flex items-center gap-3 animate-in fade-in slide-in-from-top-2 ${
            error ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
          }`}>
            <Info size={18} />
            <p className="text-sm font-medium">{error || success}</p>
          </div>
        )}

        {/* Header Section */}
        <section className="flex flex-col lg:flex-row gap-8 mb-16">
          {/* Avatar Area */}
          <div className="relative group self-center lg:self-start">
            <div className="w-40 h-40 rounded-full bg-[#161827] border-4 border-white/5 overflow-hidden shadow-2xl shadow-blue-500/10 group-hover:scale-105 transition-transform duration-500">
              <img 
                src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.username || 'Traveloop'}`} 
                alt="Profile" 
                className="w-full h-full object-cover"
              />
            </div>
            <button className="absolute bottom-1 right-1 p-2.5 bg-blue-600 rounded-full shadow-2xl border-4 border-[#0b0c14] hover:scale-110 active:scale-95 transition-transform">
              <Camera size={16} className="text-white" />
            </button>
          </div>

          {/* Info Card */}
          <div className="flex-1 bg-[#161827] rounded-4xl border border-white/10 p-8 lg:p-10 flex flex-col justify-between relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/5 blur-[100px] rounded-full" />
            
            <div className="space-y-8 relative z-10">
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500">Official Profile</p>
                {isEditing ? (
                  <div className="flex flex-col sm:flex-row gap-4">
                    <input
                      type="text"
                      placeholder="First Name"
                      value={editData.first_name}
                      onChange={(e) => setEditData({ ...editData, first_name: e.target.value })}
                      className="text-2xl font-black bg-white/5 border-none rounded-2xl px-5 py-3 w-full focus:ring-2 focus:ring-blue-500/20 outline-none transition-all placeholder:text-white/10"
                    />
                    <input
                      type="text"
                      placeholder="Last Name"
                      value={editData.last_name}
                      onChange={(e) => setEditData({ ...editData, last_name: e.target.value })}
                      className="text-2xl font-black bg-white/5 border-none rounded-2xl px-5 py-3 w-full focus:ring-2 focus:ring-blue-500/20 outline-none transition-all placeholder:text-white/10"
                    />
                  </div>
                ) : (
                  <h1 className="text-4xl font-black tracking-tight uppercase leading-none">
                    {profile?.first_name || profile?.last_name 
                      ? `${profile.first_name} ${profile.last_name}`.trim() 
                      : profile?.username || 'Traveler'}
                  </h1>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-slate-400 font-medium">
                    <div className="p-2 rounded-xl bg-white/5">
                      <Mail size={16} />
                    </div>
                    {isEditing ? (
                      <input
                        type="email"
                        placeholder="Email Address"
                        value={editData.email}
                        onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                        className="bg-white/5 border-none rounded-xl px-4 py-2 w-full focus:ring-2 focus:ring-blue-500/20 outline-none placeholder:text-white/10 text-sm"
                      />
                    ) : (
                      <span className="text-sm truncate">{profile?.email || 'No email provided'}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-slate-400 font-medium">
                    <div className="p-2 rounded-xl bg-white/5">
                      <Phone size={16} />
                    </div>
                    {isEditing ? (
                      <input
                        type="text"
                        placeholder="Phone Number"
                        value={editData.phone}
                        onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                        className="bg-white/5 border-none rounded-xl px-4 py-2 w-full focus:ring-2 focus:ring-blue-500/20 outline-none placeholder:text-white/10 text-sm"
                      />
                    ) : (
                      <span className="text-sm">{profile?.phone || 'No phone set'}</span>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-slate-400 font-medium">
                    <div className="p-2 rounded-xl bg-white/5">
                      <MapPin size={16} />
                    </div>
                    {isEditing ? (
                      <div className="flex gap-2 w-full">
                        <input
                          type="text"
                          placeholder="City"
                          value={editData.city}
                          onChange={(e) => setEditData({ ...editData, city: e.target.value })}
                          className="bg-white/5 border-none rounded-xl px-4 py-2 w-full focus:ring-2 focus:ring-blue-500/20 outline-none placeholder:text-white/10 text-sm"
                        />
                        <input
                          type="text"
                          placeholder="Country"
                          value={editData.country}
                          onChange={(e) => setEditData({ ...editData, country: e.target.value })}
                          className="bg-white/5 border-none rounded-xl px-4 py-2 w-full focus:ring-2 focus:ring-blue-500/20 outline-none placeholder:text-white/10 text-sm"
                        />
                      </div>
                    ) : (
                      <span className="text-sm">
                        {profile?.city || profile?.country 
                          ? `${profile.city}${profile.city && profile.country ? ', ' : ''}${profile.country}` 
                          : 'Location not set'}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-slate-400 font-medium">
                    <div className="p-2 rounded-xl bg-white/5">
                      <Globe size={16} />
                    </div>
                    <span className="text-sm">{profile?.username || 'traveler_id'}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-10 relative z-10 flex gap-4">
              {isEditing ? (
                <>
                  <button 
                    onClick={handleSaveProfile}
                    disabled={saveLoading}
                    className="flex items-center gap-2 px-8 py-3 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white rounded-full font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-emerald-500/20"
                  >
                    {saveLoading && <Loader2 size={14} className="animate-spin" />}
                    Save Changes
                  </button>
                  <button 
                    onClick={() => setIsEditing(false)}
                    className="px-8 py-3 bg-white/5 hover:bg-white/10 text-white/60 rounded-full font-black text-xs uppercase tracking-widest transition-all"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button 
                  onClick={() => setIsEditing(true)}
                  className="px-8 py-3 bg-white text-black hover:scale-105 active:scale-95 rounded-full font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-white/5"
                >
                  Edit Profile
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Trips Sections */}
        <div className="space-y-20">
          
          {/* Preplanned Trips */}
          <section className="space-y-8">
            <header className="flex items-center justify-between border-b border-white/5 pb-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-2xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                  <Compass size={20} className="text-blue-500" />
                </div>
                <h2 className="text-2xl font-black uppercase tracking-tight">Preplanned <span className="text-blue-500">Journeys</span></h2>
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20">
                {tripsLoading ? '...' : preplannedTrips.length} Destinations
              </span>
            </header>

            {tripsLoading ? (
              <div className="flex gap-6 overflow-hidden pb-6">
                {[1, 2, 3].map(i => (
                  <div key={i} className="bg-[#161827] border border-white/5 w-72 h-48 rounded-4xl animate-pulse" />
                ))}
              </div>
            ) : preplannedTrips.length > 0 ? (
              <div className="flex gap-6 overflow-x-auto pb-6 scrollbar-hide snap-x">
                {preplannedTrips.map((trip) => (
                  <div 
                    key={trip.id} 
                    className="bg-[#161827] border border-white/5 w-72 p-8 rounded-4xl shrink-0 snap-start hover:border-white/20 transition-all group relative overflow-hidden flex flex-col justify-between"
                  >
                    <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-blue-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div>
                      <h3 className="text-lg font-black uppercase tracking-tight truncate mb-2">{trip.name || 'Untitled Trip'}</h3>
                      <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500">
                        <Calendar size={12} />
                        <span>{new Date(trip.start_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      </div>
                    </div>
                    <Link 
                      to={`/trip/${trip.id}/edit`}
                      className="mt-8 w-full py-3 bg-white/5 hover:bg-white/10 rounded-2xl flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest transition-all"
                    >
                      Manage Trip
                      <ExternalLink size={14} />
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-16 bg-white/1 border-2 border-dashed border-white/5 rounded-4xl text-center">
                <Compass size={40} className="mx-auto text-white/5 mb-4" />
                <p className="text-slate-500 font-medium tracking-wide">Your future adventures await.</p>
                <Link to="/trip/new" className="text-blue-500 text-[10px] font-black uppercase tracking-widest mt-3 block hover:underline">Create your first itinerary</Link>
              </div>
            )}
          </section>

          {/* Previous Trips */}
          <section className="space-y-8">
             <header className="flex items-center justify-between border-b border-white/5 pb-4">
              <div className="flex items-center gap-4 text-white/40">
                <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10">
                  <MapPin size={20} />
                </div>
                <h2 className="text-2xl font-black uppercase tracking-tight">Previous <span className="text-white/20">History</span></h2>
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/10">
                {tripsLoading ? '...' : previousTrips.length} Trips
              </span>
            </header>

            {tripsLoading ? (
              <div className="flex gap-6 overflow-hidden pb-6">
                {[1, 2].map(i => (
                  <div key={i} className="bg-[#161827] border border-white/5 w-64 h-40 rounded-4xl animate-pulse" />
                ))}
              </div>
            ) : previousTrips.length > 0 ? (
              <div className="flex gap-6 overflow-x-auto pb-6 scrollbar-hide snap-x grayscale opacity-40 hover:grayscale-0 hover:opacity-100 transition-all">
                {previousTrips.map((trip) => (
                  <div 
                    key={trip.id} 
                    className="bg-[#161827] border border-white/5 w-64 p-6 rounded-4xl shrink-0 snap-start hover:border-white/20 transition-all flex flex-col justify-between"
                  >
                    <div>
                      <h3 className="text-base font-black uppercase tracking-tight truncate mb-1">{trip.name}</h3>
                      <p className="text-[10px] font-bold text-slate-500">{new Date(trip.end_date).toLocaleDateString()}</p>
                    </div>
                    <Link 
                      to={`/trip/${trip.id}/view`}
                      className="mt-6 w-full py-2.5 bg-white/5 hover:bg-white/10 rounded-xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all"
                    >
                      Recall Journey
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-10 text-center">
                <p className="text-white/10 text-[10px] font-black uppercase tracking-widest">No previous travel history logged.</p>
              </div>
            )}
          </section>

          {/* Settings Section */}
          <section className="space-y-8">
            <header className="flex items-center gap-4 border-b border-white/5 pb-4">
              <div className="w-10 h-10 rounded-2xl bg-slate-800/50 flex items-center justify-center border border-white/5">
                <Settings size={20} className="text-slate-400" />
              </div>
              <h2 className="text-2xl font-black uppercase tracking-tight">Account Preferences</h2>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-8 bg-[#161827] rounded-4xl border border-white/10 flex items-center justify-between group cursor-pointer hover:border-white/20 transition-all">
                <div className="space-y-1">
                  <p className="font-black uppercase tracking-widest text-xs">Language</p>
                  <p className="text-slate-500 text-xs font-medium">System default language</p>
                </div>
                <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-xl border border-white/5 group-hover:bg-white/10 transition-all">
                  <Globe size={16} className="text-blue-500" />
                  <span className="text-xs font-bold uppercase tracking-widest">English</span>
                </div>
              </div>

              <div className="p-8 bg-[#161827] rounded-4xl border border-white/10 flex items-center justify-between group cursor-pointer hover:border-white/20 transition-all">
                <div className="space-y-1">
                  <p className="font-black uppercase tracking-widest text-xs">Privacy Mode</p>
                  <p className="text-slate-500 text-xs font-medium">Profile visibility settings</p>
                </div>
                <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-xl border border-white/5 group-hover:bg-white/10 transition-all">
                  <Shield size={16} className="text-emerald-500" />
                  <span className="text-xs font-bold uppercase tracking-widest">Active</span>
                </div>
              </div>

              <div 
                onClick={() => navigate('/admin')}
                className="p-8 bg-blue-600/5 rounded-4xl border border-blue-500/20 flex items-center justify-between group cursor-pointer hover:bg-blue-600/10 hover:border-blue-500/40 transition-all"
              >
                <div className="space-y-1">
                   <div className="flex items-center gap-2 text-blue-400">
                     <ShieldCheck size={14} strokeWidth={3} />
                     <p className="font-black uppercase tracking-widest text-xs">System Dashboard</p>
                   </div>
                   <p className="text-slate-500 text-xs font-medium">Access administrative controls & metrics</p>
                </div>
                <ChevronRight size={16} className="text-blue-400 group-hover:translate-x-1 transition-all" />
              </div>
            </div>
          </section>

          {/* Danger Zone */}
          <section className="border-t border-white/5 pt-12 mt-12 flex flex-col md:flex-row items-center justify-between gap-8 bg-linear-to-b from-transparent to-red-500/2 p-8 rounded-4xl">
            <div className="space-y-2 text-center md:text-left">
              <h3 className="text-sm font-black uppercase tracking-[0.2em] text-red-500 flex items-center justify-center md:justify-start gap-2">
                <Trash2 size={16} />
                Destructive Actions
              </h3>
              <p className="text-xs text-slate-500 font-medium max-w-sm leading-relaxed">
                Permanently delete your Traveloop account and all associated trip data. This action is irreversible.
              </p>
            </div>
            <button className="flex items-center gap-3 px-10 py-5 bg-red-500/10 border border-red-500/20 rounded-full text-red-500 text-[10px] font-black uppercase tracking-[0.2em] hover:bg-red-500 hover:text-white transition-all shadow-xl shadow-red-500/5 group">
              Confirm Deletion
            </button>
          </section>
        </div>
      </main>

      <footer className="py-16 text-center border-t border-white/5">
         <p className="text-[10px] text-white/10 font-black uppercase tracking-[0.5em]">
          Traveloop Platform • Ver. 2.0.4
        </p>
      </footer>
    </div>
  );
}
