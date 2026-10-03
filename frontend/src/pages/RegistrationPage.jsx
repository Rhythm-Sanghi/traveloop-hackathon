import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Globe,
  Info,
  Camera,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import api from '../api';

export default function RegistrationPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [profilePreview, setProfilePreview] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    city: '',
    country: '',
    additionalInfo: '',
  });

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const previewUrl = URL.createObjectURL(file);
      setProfilePreview(previewUrl);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      // Prepare payload with snake_case keys to match backend schema
      const payload = {
        first_name: formData.firstName,
        last_name: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        city: formData.city,
        country: formData.country,
        additional_info: formData.additionalInfo,
      };

      // POST to backend using the api instance (Axios with auth token)
      const response = await api.post('/api/profile', payload);
      
      // Success response handling
      if (response.status === 200) {
        setSuccess('Profile completed successfully!');
        
        // Navigate to dashboard after a brief delay
        setTimeout(() => {
          navigate('/dashboard');
        }, 800);
      }
    } catch (err) {
      // Error handling with fallback messages
      const errorMessage =
        err.response?.data?.detail ||
        err.response?.data?.message ||
        err.message ||
        'Failed to complete profile. Please try again.';
      
      setError(errorMessage);
      console.error('Profile submission error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0b0c14] p-6 selection:bg-blue-500/30">
      
      {/* Main Card Container */}
      <div className="max-w-2xl w-full bg-[#161827] rounded-4xl border border-white/10 backdrop-blur-md p-10 space-y-8 shadow-2xl relative overflow-hidden">
        
        {/* Subtle Background Glow */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-600/10 blur-3xl rounded-full" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-indigo-600/10 blur-3xl rounded-full" />

        {/* Header Section */}
        <div className="text-center space-y-3 relative z-10">
          <h1 className="text-4xl font-black tracking-tight text-white">
            Tell us about yourself
          </h1>
          <p className="text-slate-400 text-lg font-medium">
            This helps us personalize your itineraries.
          </p>
        </div>

        {/* Photo Upload Section */}
        <div className="flex justify-center relative z-10">
          <div className="relative group">
            {/* Hidden File Input */}
            <input 
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              accept="image/*"
            />

            <div 
              onClick={() => fileInputRef.current.click()}
              className="w-32 h-32 bg-white/5 rounded-full flex items-center justify-center border-2 border-dashed border-slate-700 group-hover:border-blue-500/50 group-hover:bg-white/10 transition-all cursor-pointer overflow-hidden"
            >
              {profilePreview ? (
                <img 
                  src={profilePreview} 
                  alt="Profile Preview" 
                  className="w-full h-full object-cover rounded-full"
                />
              ) : (
                <div className="flex flex-col items-center justify-center space-y-1">
                  <User size={32} className="text-white/40 group-hover:text-white transition-colors" strokeWidth={1.5} />
                  <span className="text-[10px] font-black uppercase tracking-widest text-white/20 group-hover:text-white/60 transition-colors">
                    Upload
                  </span>
                </div>
              )}
            </div>
            
            {/* Camera Icon Overlay */}
            <button 
              type="button"
              onClick={() => fileInputRef.current.click()}
              className="absolute bottom-1 right-1 bg-blue-600 rounded-full p-2.5 shadow-xl border-4 border-[#161827] group-hover:scale-110 transition-transform active:scale-95"
            >
              <Camera size={16} className="text-white" strokeWidth={2} />
            </button>
          </div>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-3">
              <Info size={18} />
              {error}
            </div>
          </div>
        )}
        {success && (
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-medium animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-3">
              <Info size={18} />
              {success}
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
          
          {/* Row 1: First Name & Last Name */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* First Name */}
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-white/40 ml-1">First Name</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-white/20">
                  <User size={20} strokeWidth={1.5} />
                </div>
                <input
                  type="text"
                  name="firstName"
                  placeholder="Felix"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  required
                  className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white/5 border-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all hover:bg-white/10 text-white placeholder-white/20"
                />
              </div>
            </div>

            {/* Last Name */}
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-white/40 ml-1">Last Name</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-white/20">
                  <User size={20} strokeWidth={1.5} />
                </div>
                <input
                  type="text"
                  name="lastName"
                  placeholder="Kjellberg"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  required
                  className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white/5 border-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all hover:bg-white/10 text-white placeholder-white/20"
                />
              </div>
            </div>
          </div>

          {/* Row 2: Email & Phone */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Email */}
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-white/40 ml-1">Email</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-white/20">
                  <Mail size={20} strokeWidth={1.5} />
                </div>
                <input
                  type="email"
                  name="email"
                  placeholder="felix@traveloop.com"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white/5 border-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all hover:bg-white/10 text-white placeholder-white/20"
                />
              </div>
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-white/40 ml-1">Phone</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-white/20">
                  <Phone size={20} strokeWidth={1.5} />
                </div>
                <input
                  type="tel"
                  name="phone"
                  placeholder="+1 (555) 000-0000"
                  value={formData.phone}
                  onChange={handleInputChange}
                  required
                  className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white/5 border-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all hover:bg-white/10 text-white placeholder-white/20"
                />
              </div>
            </div>
          </div>

          {/* Row 3: City & Country */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* City */}
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-white/40 ml-1">City</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-white/20">
                  <MapPin size={20} strokeWidth={1.5} />
                </div>
                <input
                  type="text"
                  name="city"
                  placeholder="Stockholm"
                  value={formData.city}
                  onChange={handleInputChange}
                  required
                  className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white/5 border-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all hover:bg-white/10 text-white placeholder-white/20"
                />
              </div>
            </div>

            {/* Country */}
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-white/40 ml-1">Country</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-white/20">
                  <Globe size={20} strokeWidth={1.5} />
                </div>
                <input
                  type="text"
                  name="country"
                  placeholder="Sweden"
                  value={formData.country}
                  onChange={handleInputChange}
                  required
                  className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white/5 border-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all hover:bg-white/10 text-white placeholder-white/20"
                />
              </div>
            </div>
          </div>

          {/* Row 4: Additional Information (Full Width) */}
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-white/40 ml-1">Travel Style</label>
            <div className="relative">
              <div className="absolute top-4 left-4 text-white/20 pointer-events-none">
                <Info size={20} strokeWidth={1.5} />
              </div>
              <textarea
                name="additionalInfo"
                placeholder="Tell us about your travel style (e.g., foodie, hiker, budget traveler)..."
                value={formData.additionalInfo}
                onChange={handleInputChange}
                rows="4"
                className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white/5 border-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all hover:bg-white/10 text-white placeholder-white/20 resize-none"
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-5 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-full shadow-2xl shadow-blue-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed mt-8 group"
          >
            {loading ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <>
                <span className="uppercase tracking-widest text-sm">Complete Profile</span>
                <ArrowRight className="group-hover:translate-x-1 transition-transform" size={20} strokeWidth={2} />
              </>
            )}
          </button>
        </form>

        {/* Skip Link */}
        <div className="text-center pt-6 border-t border-white/5 relative z-10">
          <button
            onClick={handleSkip}
            className="text-xs font-black uppercase tracking-widest text-white/40 hover:text-white transition-colors"
          >
            Skip for now
          </button>
        </div>
      </div>
    </div>
  );
}
