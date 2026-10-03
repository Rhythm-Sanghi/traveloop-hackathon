import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Compass,
  MapPin,
  DollarSign,
  Trash2,
  Plus,
  ChevronUp,
  ChevronDown,
  Eye,
  Save,
  Loader2,
  X,
  Wallet,
  Download,
} from 'lucide-react';
import api from '../api';
import Navbar from '../components/Navbar';

export default function ItineraryBuilder() {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [tripVersion, setTripVersion] = useState(null);
  const [, setShowSaveIndicator] = useState(false);
  const [tripName, setTripName] = useState('');
  const [, setTripLoading] = useState(true);
  const [, setInitialLoading] = useState(true);

  // Initialize with one empty stop
  const [stops, setStops] = useState([
    {
      id: 1,
      city: '',
      arrivalDate: '',
      departureDate: '',
      budget: '',
      description: '',
      activities: [],
      activityInput: '',
      activityCostInput: '',
    },
  ]);

  const [nextStopId, setNextStopId] = useState(2);

  // Auto-calculate total budget in real-time
  const totalBudget = useMemo(() => {
    return stops.reduce((total, stop) => {
      // Sum up stop-level budget
      const stopBudget = parseFloat(stop.budget) || 0;
      // Sum up per-activity costs
      const activitiesBudget = stop.activities.reduce((sum, act) => sum + (parseFloat(act.cost) || 0), 0);
      return total + stopBudget + activitiesBudget;
    }, 0);
  }, [stops]);

  // Fetch trip details and itinerary on component mount
  useEffect(() => {
    const fetchTripAndItinerary = async () => {
      setTripLoading(true);
      setInitialLoading(true);
      try {
        // Fetch trip details
        const tripResponse = await api.get(`/api/trips/${tripId}`);
        if (tripResponse.data && tripResponse.data.name) {
          setTripName(tripResponse.data.name);
        } else {
          setTripName(`Trip #${tripId}`);
        }

        // Fetch itinerary (stops)
        const itineraryResponse = await api.get(`/api/trips/${tripId}/itinerary`);
        setTripVersion(itineraryResponse.data?.version ?? 1);
        
        if (itineraryResponse.data && itineraryResponse.data.stops && itineraryResponse.data.stops.length > 0) {
          // Transform backend format to frontend format
          const fetchedStops = itineraryResponse.data.stops.map((stop, index) => ({
            id: index + 1,
            city: stop.city_name || '',
            arrivalDate: stop.arrival_date || '',
            departureDate: stop.departure_date || '',
            timezone: stop.timezone || '',
            budget: stop.budget ? stop.budget.toString() : '',
            description: stop.notes || '',
            // Handle both legacy string activities and new object activities
            activities: Array.isArray(stop.activities) 
              ? stop.activities.map(act => typeof act === 'string' ? { name: act, cost: 0 } : act)
              : [],
            activityInput: '',
            activityCostInput: '',
          }));
          
          setStops(fetchedStops || []);
          setNextStopId(fetchedStops.length + 1);
        }
      } catch (err) {
        console.error('Failed to fetch trip data:', err);
        setTripName(`Trip #${tripId}`);
      } finally {
        setTripLoading(false);
        setInitialLoading(false);
      }
    };

    if (tripId) {
      fetchTripAndItinerary();
    }
  }, [tripId]);

  const handleExportPDF = () => {
    const printWindow = window.open('', '_blank');
    const stopsHtml = stops.map((stop, index) => `
      <div style="margin-bottom: 30px; page-break-inside: avoid; border-bottom: 1px solid #eee; padding-bottom: 20px;">
        <h2 style="margin: 0 0 10px 0; color: #3b82f6; font-family: sans-serif; font-size: 20px; text-transform: uppercase; letter-spacing: 1px;">
          Stop ${index + 1}: ${stop.city || 'Unnamed Stop'}
        </h2>
        <p style="margin: 0 0 15px 0; color: #64748b; font-size: 13px; font-family: sans-serif; font-weight: bold;">
          Arrival: ${stop.arrivalDate || 'TBD'} | Departure: ${stop.departureDate || 'TBD'}
        </p>
        ${stop.description ? `<p style="margin: 0 0 15px 0; color: #334155; font-size: 14px; font-family: sans-serif; line-height: 1.6;">${stop.description}</p>` : ''}
        
        <h3 style="margin: 15px 0 10px 0; color: #0f172a; font-family: sans-serif; font-size: 13px; text-transform: uppercase; letter-spacing: 1px;">Planned Activities</h3>
        <table style="width: 100%; border-collapse: collapse; font-family: sans-serif; font-size: 13px;">
          <thead>
            <tr style="background-color: #f8fafc; border-bottom: 2px solid #e2e8f0; text-align: left;">
              <th style="padding: 10px;">Activity</th>
              <th style="padding: 10px; width: 120px;">Cost</th>
            </tr>
          </thead>
          <tbody>
            ${stop.activities && stop.activities.length > 0 ? stop.activities.map(act => `
              <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 10px; color: #334155; font-weight: 500;">${act.name}</td>
                <td style="padding: 10px; color: #0f172a; font-weight: bold;">$${act.cost}</td>
              </tr>
            `).join('') : `
              <tr>
                <td colspan="2" style="padding: 10px; color: #94a3b8; font-style: italic;">No activities planned for this stop.</td>
              </tr>
            `}
          </tbody>
        </table>
      </div>
    `).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>${tripName} - Itinerary Export</title>
          <style>
            body { font-family: sans-serif; padding: 40px; color: #333; max-width: 800px; margin: 0 auto; }
            h1 { text-align: center; color: #1e3b8a; margin-bottom: 5px; font-size: 28px; }
            .subtitle { text-align: center; color: #64748b; margin-bottom: 40px; font-size: 14px; font-weight: bold; text-transform: uppercase; letter-spacing: 2px; }
            .summary { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 20px; margin-bottom: 40px; }
            .summary-table { width: 100%; border-collapse: collapse; }
            .summary-table td { padding: 5px 10px; font-size: 14px; }
          </style>
        </head>
        <body>
          <h1>${tripName}</h1>
          <div class="subtitle">Official Traveloop Travel Itinerary</div>
          
          <div class="summary">
            <table class="summary-table">
              <tr>
                <td><strong>Total Stops:</strong> ${stops.length}</td>
                <td style="text-align: right;"><strong>Estimated Total Budget:</strong> $${totalBudget}</td>
              </tr>
            </table>
          </div>
          
          ${stopsHtml}
          
          <div style="margin-top: 50px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 20px;">
            Generated with Traveloop • Explorers United
          </div>
          
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Handle field changes for a specific stop
  const handleStopChange = (stopId, field, value) => {
    setStops((prevStops) =>
      prevStops.map((stop) =>
        stop.id === stopId ? { ...stop, [field]: value } : stop
      )
    );
  };

  // Add activity to a stop
  const handleAddActivity = (stopId, e) => {
    const stop = stops.find(s => s.id === stopId);
    if (!stop) return;

    // Trigger on Enter key
    if (e.key === 'Enter' && stop.activityInput.trim()) {
      e.preventDefault();
      const activityName = stop.activityInput.trim();
      const activityCost = parseFloat(stop.activityCostInput) || 0;
      
      setStops((prevStops) =>
        prevStops.map((s) =>
          s.id === stopId
            ? {
                ...s,
                activities: [...s.activities, { name: activityName, cost: activityCost }],
                activityInput: '',
                activityCostInput: '',
              }
            : s
        )
      );
    }
  };

  // Remove activity from a stop
  const handleRemoveActivity = (stopId, activityIndex) => {
    setStops((prevStops) =>
      prevStops.map((stop) =>
        stop.id === stopId
          ? {
              ...stop,
              activities: stop.activities.filter((_, idx) => idx !== activityIndex),
            }
          : stop
      )
    );
  };

  // Add a new stop
  const handleAddStop = () => {
    const newStop = {
      id: nextStopId,
      city: '',
      arrivalDate: '',
      departureDate: '',
      budget: '',
      description: '',
      activities: [],
      activityInput: '',
      activityCostInput: '',
    };
    setStops([...stops, newStop]);
    setNextStopId(nextStopId + 1);
  };

  // Delete a stop
  const handleDeleteStop = (stopId) => {
    setStops((prevStops) => prevStops.filter((stop) => stop.id !== stopId));
  };

  // Move stop up
  const handleMoveUp = (stopId) => {
    const index = stops.findIndex((stop) => stop.id === stopId);
    if (index > 0) {
      const newStops = [...stops];
      [newStops[index - 1], newStops[index]] = [newStops[index], newStops[index - 1]];
      setStops(newStops);
    }
  };

  // Move stop down
  const handleMoveDown = (stopId) => {
    const index = stops.findIndex((stop) => stop.id === stopId);
    if (index < stops.length - 1) {
      const newStops = [...stops];
      [newStops[index], newStops[index + 1]] = [newStops[index + 1], newStops[index]];
      setStops(newStops);
    }
  };

  const handleMoveActivity = (stopId, activityIndex, direction) => {
    setStops((prevStops) => prevStops.map((stop) => {
      if (stop.id !== stopId) return stop;
      const targetIndex = activityIndex + direction;
      if (targetIndex < 0 || targetIndex >= stop.activities.length) return stop;
      const activities = [...stop.activities];
      [activities[activityIndex], activities[targetIndex]] = [activities[targetIndex], activities[activityIndex]];
      return { ...stop, activities };
    }));
  };

  // Save itinerary to backend
  const handleSaveItinerary = async () => {
    setError('');
    setSuccess('');
    setLoading(true);

    // Validate that all stops have at least a city
    const hasEmptyStops = stops.some((stop) => !stop.city.trim());
    if (hasEmptyStops) {
      setError('Please fill in the city for all stops before saving.');
      setLoading(false);
      return;
    }

    try {
      const payload = {
        version: tripVersion,
        stops: stops.map((stop) => ({
          city_name: stop.city,
          arrival_date: stop.arrivalDate,
          departure_date: stop.departureDate,
          timezone: stop.timezone || null,
          budget: stop.budget ? parseFloat(stop.budget) : 0,
          description: String(stop.description || ''),
          // Ensure we send activity objects with costs
          activities: stop.activities.map(act => ({
            name: act.name,
            cost: parseFloat(act.cost) || 0,
            category: act.category || "Sightseeing"
          })),
        })),
      };

      const response = await api.post(`/api/trips/${tripId}/itinerary`, payload);

      if (response.status === 200 || response.status === 201) {
        setTripVersion(response.data.version);
        setSuccess('Itinerary saved successfully!');
        setShowSaveIndicator(true);
        setTimeout(() => setShowSaveIndicator(false), 2000);
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save itinerary.');
      console.error('Itinerary save error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAndPreview = async () => {
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const hasEmptyStops = stops.some((stop) => !stop.city.trim());
      if (hasEmptyStops) {
        setError('Please fill in the city for all stops before saving.');
        setLoading(false);
        return;
      }

      const payload = {
        version: tripVersion,
        stops: stops.map((stop) => ({
          city_name: stop.city,
          arrival_date: stop.arrivalDate,
          departure_date: stop.departureDate,
          budget: stop.budget ? parseFloat(stop.budget) : 0,
          description: String(stop.description || ''),
          activities: stop.activities.map(act => ({
            name: act.name,
            cost: parseFloat(act.cost) || 0,
            category: act.category || "Sightseeing"
          })),
        })),
      };

      const response = await api.post(`/api/trips/${tripId}/itinerary`, payload);

      if (response.status === 200 || response.status === 201) {
        setTripVersion(response.data.version);
        setSuccess('Itinerary saved successfully!');
        setTimeout(() => navigate(`/trip/${tripId}/view`), 800);
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save and preview.');
      console.error('Save and preview error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0c14] text-white selection:bg-blue-500/30 pb-32 pt-20">
      <Navbar />

      {/* Sticky Header */}
      <div className="sticky top-[72px] z-40 bg-[#0b0c14]/80 border-b border-white/5 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-6 py-6 flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-black uppercase tracking-tight">{tripName}</h1>
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/30">
              <Compass size={12} />
              <span>Trip ID: {tripId}</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex flex-col items-end mr-4">
               <p className="text-[10px] font-black uppercase tracking-widest text-white/30">Est. Total Budget</p>
               <p className="text-xl font-black text-blue-400">₹{totalBudget.toLocaleString()}</p>
            </div>
             <button
              onClick={handleExportPDF}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-black text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl cursor-pointer"
             >
              <Download size={16} />
              Export PDF
             </button>
             <button
               onClick={() => navigate(`/trip/${tripId}/view`)}
               className="flex items-center gap-2 px-6 py-3 bg-white text-black rounded-full font-black text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl cursor-pointer"
             >
               <Eye size={16} />
               Preview
             </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        
        {/* Messages */}
        {error && (
          <div className="mb-8 p-5 rounded-3xl bg-red-500/10 border border-red-500/20 flex items-start gap-4">
            <X size={20} className="text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-red-300/80 text-sm font-medium">{error}</p>
          </div>
        )}
        
        {success && (
          <div className="mb-8 p-5 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-4">
            <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
              <span className="text-[#0b0c14] text-xs font-black">✓</span>
            </div>
            <p className="text-emerald-300/80 text-sm font-medium">{success}</p>
          </div>
        )}

        {/* Stop Cards */}
        <div className="space-y-12">
          {stops.map((stop, index) => (
            <div
              key={stop.id}
              className="bg-[#161827] rounded-4xl border border-white/10 shadow-2xl p-8 lg:p-10 hover:border-white/20 transition-all relative group"
            >
              {/* Card Header */}
              <div className="flex items-center justify-between mb-10 pb-8 border-b border-white/5">
                <div className="flex items-center gap-5">
                  <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center font-black">
                    {index + 1}
                  </div>
                  <h2 className="text-2xl font-black uppercase tracking-tight">Destination {index + 1}</h2>
                </div>
                <div className="flex items-center gap-2">
                  <button aria-label={`Move ${stop.city || 'stop'} up`} onClick={() => handleMoveUp(stop.id)} disabled={index === 0} className="p-2.5 rounded-xl bg-white/5 disabled:opacity-20 hover:bg-white/10 transition-all"><ChevronUp size={20} /></button>
                  <button aria-label={`Move ${stop.city || 'stop'} down`} onClick={() => handleMoveDown(stop.id)} disabled={index === stops.length - 1} className="p-2.5 rounded-xl bg-white/5 disabled:opacity-20 hover:bg-white/10 transition-all"><ChevronDown size={20} /></button>
                  <button aria-label={`Delete ${stop.city || 'stop'}`} onClick={() => handleDeleteStop(stop.id)} className="p-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-all"><Trash2 size={20} /></button>
                </div>
              </div>

              {/* Body */}
              <div className="grid gap-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">City</label>
                    <div className="relative">
                      <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20" size={18} />
                      <input
                        type="text"
                        aria-label="City"
                        placeholder="Paris, France"
                        value={stop.city}
                        onChange={(e) => handleStopChange(stop.id, 'city', e.target.value)}
                        className="w-full pl-14 pr-6 py-5 bg-white/5 border-none rounded-2xl focus:ring-2 focus:ring-blue-500/20 transition-all placeholder-white/10"
                      />
                    </div>
                    <div className="space-y-3 md:col-span-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Destination timezone (IANA)</label>
                      <input
                        type="text"
                        aria-label="Destination timezone"
                        placeholder="e.g. Asia/Tokyo"
                        value={stop.timezone || ''}
                        onChange={(e) => handleStopChange(stop.id, 'timezone', e.target.value)}
                        className="w-full px-6 py-5 bg-white/5 border-none rounded-2xl focus:ring-2 focus:ring-blue-500/20 transition-all text-white/60"
                      />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">General Stop Budget</label>
                    <div className="relative">
                      <DollarSign className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20" size={18} />
                      <input
                        type="number"
                        aria-label="General stop budget"
                        placeholder="0.00"
                        value={stop.budget}
                        onChange={(e) => handleStopChange(stop.id, 'budget', e.target.value)}
                        className="w-full pl-14 pr-6 py-5 bg-white/5 border-none rounded-2xl focus:ring-2 focus:ring-blue-500/20 transition-all placeholder-white/10"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Arrival Date</label>
                    <input
                      type="date"
                      aria-label="Arrival date"
                      value={stop.arrivalDate}
                      onChange={(e) => handleStopChange(stop.id, 'arrivalDate', e.target.value)}
                      className="w-full px-6 py-5 bg-white/5 border-none rounded-2xl focus:ring-2 focus:ring-blue-500/20 transition-all text-white/60"
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Departure Date</label>
                    <input
                      type="date"
                      aria-label="Departure date"
                      value={stop.departureDate}
                      onChange={(e) => handleStopChange(stop.id, 'departureDate', e.target.value)}
                      className="w-full px-6 py-5 bg-white/5 border-none rounded-2xl focus:ring-2 focus:ring-blue-500/20 transition-all text-white/60"
                    />
                  </div>
                </div>

                {/* Activity Management with Budgeting */}
                <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Activities & Experience Budget</label>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="relative flex-1">
                      <Plus className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20" size={18} />
                      <input
                        type="text"
                        aria-label="Activity name"
                        placeholder="Activity name (e.g., Wine Tasting)"
                        value={stop.activityInput}
                        onChange={(e) => handleStopChange(stop.id, 'activityInput', e.target.value)}
                        onKeyDown={(e) => handleAddActivity(stop.id, e)}
                        className="w-full pl-14 pr-6 py-5 bg-white/5 border-none rounded-2xl focus:ring-2 focus:ring-blue-500/20 transition-all placeholder-white/10"
                      />
                    </div>
                    <div className="relative w-full sm:w-40">
                      <Wallet className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20" size={18} />
                      <input
                        type="number"
                        aria-label="Activity cost"
                        placeholder="Cost"
                        value={stop.activityCostInput}
                        onChange={(e) => handleStopChange(stop.id, 'activityCostInput', e.target.value)}
                        onKeyDown={(e) => handleAddActivity(stop.id, e)}
                        className="w-full pl-14 pr-6 py-5 bg-white/5 border-none rounded-2xl focus:ring-2 focus:ring-blue-500/20 transition-all placeholder-white/10"
                      />
                    </div>
                  </div>

                  {/* Activity Tags */}
                  <div className="flex flex-wrap gap-3 pt-4">
                    {stop.activities.map((act, idx) => (
                      <div key={idx} className="group/act flex items-center gap-3 pl-4 pr-2 py-2.5 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 transition-all">
                        <span className="text-xs font-bold text-white/80">{act.name}</span>
                        <span className="text-[10px] font-black text-blue-400 bg-blue-400/10 px-2 py-1 rounded-full">₹{act.cost}</span>
                        <button
                          type="button"
                          aria-label={`Move ${act.name} up`}
                          disabled={idx === 0}
                          onClick={() => handleMoveActivity(stop.id, idx, -1)}
                          className="p-1 hover:text-blue-400 disabled:opacity-30 transition-colors"
                        >
                          <ChevronUp size={14} />
                        </button>
                        <button
                          type="button"
                          aria-label={`Move ${act.name} down`}
                          disabled={idx === stop.activities.length - 1}
                          onClick={() => handleMoveActivity(stop.id, idx, 1)}
                          className="p-1 hover:text-blue-400 disabled:opacity-30 transition-colors"
                        >
                          <ChevronDown size={14} />
                        </button>
                        <button type="button" aria-label={`Remove ${act.name}`} onClick={() => handleRemoveActivity(stop.id, idx)} className="p-1 hover:text-red-400 transition-colors">
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Add Stop */}
        <button onClick={handleAddStop} className="w-full py-10 border-2 border-dashed border-white/10 text-slate-500 hover:border-white/20 hover:bg-white/5 rounded-4xl font-black uppercase tracking-[0.2em] transition-all flex flex-col items-center justify-center gap-4 mt-12 group">
          <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Plus size={24} />
          </div>
          Add another stop
        </button>

        {/* Final Actions */}
        <div className="mt-20 flex flex-col sm:flex-row gap-4 justify-end">
           <button onClick={() => navigate('/dashboard')} className="px-8 py-4 border border-white/20 rounded-full text-white/60 hover:text-white hover:bg-white/5 font-black text-xs uppercase tracking-widest transition-all">Cancel</button>
           <button onClick={handleSaveItinerary} disabled={loading} className="flex items-center justify-center gap-3 px-10 py-4 bg-white/10 hover:bg-white/20 border border-white/10 text-white rounded-full font-black text-xs uppercase tracking-widest transition-all">
             {loading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
             Quick Save
           </button>
           <button onClick={handleSaveAndPreview} disabled={loading} className="flex items-center justify-center gap-3 px-12 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-black text-xs uppercase tracking-widest transition-all shadow-2xl shadow-blue-500/20">
             {loading ? <Loader2 size={18} className="animate-spin" /> : <Eye size={18} />}
             Save & Preview
           </button>
        </div>
      </div>
    </div>
  );
}
