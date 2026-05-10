import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Lock, ArrowRight, Loader2 } from 'lucide-react';
import api from '../api';

export default function AuthPage() {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        // FastAPI Login requires FormData (URLSearchParams)
        const formData = new URLSearchParams();
        formData.append('username', username);
        formData.append('password', password);

        const response = await api.post('/login', formData, {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });
        
        const token = response.data.access_token;
        const isAdmin = response.data.is_admin;
        localStorage.setItem('token', token);
        localStorage.setItem('access_token', token); // Keep for legacy
        localStorage.setItem('is_admin', isAdmin ? 'true' : 'false');
        console.log("Auth: Token and Admin status saved to localStorage");
        navigate('/dashboard'); // Go to dashboard on success
      } else {
        // FastAPI Register requires JSON
        await api.post('/register', { username, password });
        
        // Immediately log in with the same credentials
        const loginFormData = new URLSearchParams();
        loginFormData.append('username', username);
        loginFormData.append('password', password);

        const loginResponse = await api.post('/login', loginFormData, {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });
        
        // Save access token
        const token = loginResponse.data.access_token;
        const isAdmin = loginResponse.data.is_admin;
        localStorage.setItem('token', token);
        localStorage.setItem('access_token', token);
        localStorage.setItem('is_admin', isAdmin ? 'true' : 'false');
        console.log("Auth: Registration complete, token and admin status saved");
        
        // Navigate directly to registration profile onboarding screen
        navigate('/register-profile');
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0b0c14] p-6 selection:bg-blue-500/30">
      
      {/* The clean Traveloop Dark Card */}
      <div className="max-w-md w-full bg-[#161827] rounded-4xl border border-white/10 backdrop-blur-md p-10 space-y-8 shadow-2xl relative overflow-hidden">
        
        {/* Subtle Background Glow */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-600/10 blur-3xl rounded-full" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-indigo-600/10 blur-3xl rounded-full" />

        {/* Constrained Avatar/Icon */}
        <div className="w-24 h-24 mx-auto bg-white/5 rounded-full flex items-center justify-center text-white/40 mb-2 border border-white/10 relative z-10 shadow-inner">
          <User size={40} strokeWidth={1.5} />
        </div>

        <div className="text-center space-y-3 relative z-10">
          <h1 className="text-3xl font-black tracking-tight text-white uppercase">
            {isLogin ? 'Welcome Back' : 'Join Traveloop'}
          </h1>
          <p className="text-slate-400 text-sm font-medium">
            {isLogin ? 'The world is waiting for your next move.' : 'Start planning your next adventure.'}
          </p>
        </div>

        {/* Error / Success Message */}
        {error && (
          <div className={`p-4 rounded-2xl text-sm font-medium text-center relative z-10 animate-in fade-in slide-in-from-top-2 ${error.includes('created') ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border border-red-500/20 text-red-400'}`}>
            {error}
          </div>
        )}

        {/* The Form */}
        <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-white/40 ml-1">Username</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-white/20">
                <User size={20} />
              </div>
              <input
                type="text"
                required
                placeholder="Explorer"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white/5 border-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all hover:bg-white/10 text-white placeholder-white/20"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-white/40 ml-1">Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-white/20">
                <Lock size={20} />
              </div>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white/5 border-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all hover:bg-white/10 text-white placeholder-white/20"
              />
            </div>
          </div>

          {isLogin && (
            <div className="flex justify-end">
              <button type="button" className="text-xs font-black uppercase tracking-widest text-white/40 hover:text-white transition-colors">
                Forgot Password?
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !username || !password}
            className="w-full py-5 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-full shadow-2xl shadow-blue-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed mt-4 group"
          >
            {loading ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <>
                <span className="uppercase tracking-widest text-sm">{isLogin ? 'Log In' : 'Sign Up'}</span>
                <ArrowRight className="group-hover:translate-x-1 transition-transform" size={20} />
              </>
            )}
          </button>
        </form>

        {/* Toggle Login/Signup */}
        <div className="text-center pt-6 border-t border-white/5 relative z-10">
          <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
              }}
              className="font-black text-white hover:text-blue-400 transition-colors ml-1"
            >
              {isLogin ? 'Create one' : 'Log in'}
            </button>
          </p>
        </div>

      </div>
    </div>
  );
}