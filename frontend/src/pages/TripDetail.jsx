import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  MapPin,
  Clock,
  Wallet,
  Calendar,
  ArrowLeft,
  ChevronRight,
  Loader2,
  Share2,
  Download,
  MoreVertical,
  Layers,
  LayoutGrid,
  Compass,
} from 'lucide-react';
import api from '../api';

export default function TripDetailView() {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'calendar'

  useEffect(() => {
    const fetchTripData = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/api/trips/${tripId}/itinerary`);
        setTrip(response.data);
      } catch (err) {
        console.error('Error fetching trip details:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTripData();
  }, [tripId]);

  const groupedStops = useMemo(() => {
    if (!trip || !trip.stops) return [];
    const groups = trip.stops.reduce((acc, stop) => {
      const city = stop.city_name;
      if (!acc[city]) {
        acc[city] = { ...stop, activities: [] };
      }
      // A stop might not have activities, so we check
      if(stop.activities) {
        acc[city].activities.push(...stop.activities.map(activity => ({
          ...activity,
          day: stop.day, // Add day number to each activity
        })));
      }
      return acc;
    }, {});
    return Object.values(groups);
  }, [trip]);

  const totalStats = useMemo(() => {
    if (!trip || !trip.stops) return { budget: 0, days: 0 };
    
    const budget = trip.stops.reduce((sum, stop) => sum + (stop.budget || 0), 0);
    
    const start = new Date(trip.start_date);
    const end = new Date(trip.end_date);
    const diffTime = Math.abs(end - start);
    const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    return { budget, days };
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

  const renderListView = () => (
    <div className="relative animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Timeline Line */}
      <div className="absolute left-4 md:left-5 top-10 bottom-10 w-0.5 bg-white/10" />

      <div className="space-y-12 relative z-10">
        {groupedStops.map((cityStop, index) => (
          <div key={index} className="space-y-8 group">
            {/* City Header */}
            <div className="flex items-center gap-4 md:gap-6">
              <div className="z-10 w-8 h-8 md:w-10 md:h-10 rounded-full bg-blue-600 border-4 border-[#0b0c14] flex items-center justify-center shadow-[0_0_20px_rgba(37,99,235,0.4)]">
                <MapPin size={16} className="text-white" />
              </div>
              <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tight">{cityStop.city_name}, {cityStop.country}</h2>
            </div>

            {/* Activity Cards */}
            <div className="space-y-4 md:pl-16">
              {cityStop.activities && cityStop.activities.length > 0 ? (
                cityStop.activities.map((activity, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl bg-white/5 border border-white/10 flex justify-between items-center hover:bg-white/10 transition-all"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                       <span className="text-xs font-bold bg-blue-500/20 text-blue-300 px-3 py-1 rounded-full">
                        Day {activity.day}
                      </span>
                      <h4 className="text-base font-bold">{activity.name}</h4>
                    </div>
                    <span className="text-base font-bold text-white/80">
                      ₹{activity.cost.toLocaleString()}
                    </span>
                  </div>
                ))
              ) : (
                <div className="p-4 rounded-2xl bg-white/5 border border-dashed border-white/20 text-center">
                  <p className="text-sm text-white/40">No activities planned for this city.</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0b0c14] text-white selection:bg-blue-500/30">
      {/* Navigation Bar */}
      <nav className="p-4 md:p-6 flex justify-between items-center max-w-4xl mx-auto">
        <Link to="/dashboard" className="text-2xl font-bold tracking-tighter">Traveloop</Link>
        <button
          onClick={() => navigate(`/trip/${tripId}/edit`)}
          className="px-6 py-2 bg-white/10 border border-white/20 rounded-full text-sm font-semibold hover:bg-white/20 transition-colors"
        >
          Edit Trip
        </button>
      </nav>

      {/* Header */}
      <header className="text-center p-8 space-y-4 max-w-4xl mx-auto">
        <h1 className="text-5xl font-black tracking-tighter">{trip.name}</h1>
        <div className="flex items-center justify-center gap-4 text-white/60">
          <span>{new Date(trip.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(trip.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
          <div className="inline-flex p-1 bg-white/5 rounded-full border border-white/10">
             <button onClick={() => setViewMode('list')} className={`px-4 py-1 rounded-full text-xs font-semibold ${viewMode === 'list' ? 'bg-white text-black' : ''}`}>List</button>
             <button onClick={() => setViewMode('calendar')} className={`px-4 py-1 rounded-full text-xs font-semibold ${viewMode === 'calendar' ? 'bg-white text-black' : ''}`}>Calendar</button>
          </div>
        </div>
      </header>
      
      {/* Content Section */}
      <main className="max-w-4xl mx-auto p-8 space-y-12">
        {(!trip.stops || trip.stops.length === 0) ? (
          <div className="text-center py-16">
            <h3 className="text-2xl font-bold text-white/80 mb-2">Your itinerary is empty</h3>
            <p className="text-white/50 mb-6">Start planning your trip by adding destinations and activities.</p>
            <Link
              to={`/trip/${tripId}/edit`}
              className="px-8 py-3 bg-blue-600 text-white rounded-full font-bold hover:bg-blue-500 transition-colors"
            >
              Build Itinerary
            </Link>
          </div>
        ) : (
          renderListView()
        )}
      </main>

      {/* Sticky Stats Bar */}
      <footer className="sticky bottom-4 w-full z-50">
        <div className="max-w-2xl mx-auto p-2 bg-white/5 border border-white/10 rounded-full backdrop-blur-lg flex items-center justify-around">
          <div>
            <span className="text-xs text-white/50">Total Budget</span>
            <p className="text-lg font-bold">₹{totalStats.budget.toLocaleString()}</p>
          </div>
          <div className="w-px h-8 bg-white/10" />
          <div>
            <span className="text-xs text-white/50">Total Days</span>
            <p className="text-lg font-bold">{totalStats.days} Days</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
