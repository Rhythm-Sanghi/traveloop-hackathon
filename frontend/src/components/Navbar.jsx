import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LogOut, Menu, X, ShieldCheck, User } from 'lucide-react';

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const username = localStorage.getItem('username') || 'Explorer';
  const isAdmin = localStorage.getItem('is_admin') === 'true';

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('access_token');
    localStorage.removeItem('username');
    localStorage.removeItem('is_admin');
    navigate('/login');
  };

  const navLinks = [
    { name: 'Dashboard', path: '/dashboard' },
    { name: 'Community', path: '/community' },
    { name: 'Search Activities', path: '/search' },
    { name: 'Packing List', path: '/packing-list' },
    { name: 'Trip Notes', path: '/notes' },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0b0c14]/85 backdrop-blur-lg border-b border-white/5 px-6 py-4">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        {/* Logo */}
        <Link to="/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
            <div className="w-4 h-4 bg-[#0b0c14] rounded-sm rotate-45" />
          </div>
          <span className="text-xl font-black tracking-tighter uppercase text-white">Traveloop</span>
        </Link>

        {/* Desktop Links */}
        <div className="hidden lg:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`text-[10px] font-black uppercase tracking-widest transition-all ${
                isActive(link.path)
                  ? 'text-blue-500 border-b-2 border-blue-500 pb-1'
                  : 'text-white/60 hover:text-white pb-1'
              }`}
            >
              {link.name}
            </Link>
          ))}
          {isAdmin && (
            <Link
              to="/admin"
              className={`text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1 ${
                isActive('/admin')
                  ? 'text-blue-400 border-b-2 border-blue-400 pb-1'
                  : 'text-blue-500 hover:text-blue-400 pb-1'
              }`}
            >
              <ShieldCheck size={12} />
              Admin
            </Link>
          )}
        </div>

        {/* Right Section Actions */}
        <div className="hidden lg:flex items-center gap-4">
          <Link
            to="/profile"
            className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 transition-all text-[10px] font-black uppercase tracking-widest text-slate-300"
          >
            <User size={12} className="text-blue-400" />
            {username}
          </Link>
          <button
            onClick={handleLogout}
            className="p-2 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-xl hover:bg-rose-500 hover:text-white transition-all active:scale-95 cursor-pointer"
            title="Log Out"
          >
            <LogOut size={14} />
          </button>
        </div>

        {/* Mobile Hamburger Menu Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          className="lg:hidden p-2 text-white/60 hover:text-white transition-all"
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div className="lg:hidden mt-4 pt-4 border-t border-white/5 flex flex-col gap-4 animate-in slide-in-from-top-4 duration-300">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              onClick={() => setMobileMenuOpen(false)}
              className={`text-xs font-black uppercase tracking-widest py-2 px-4 rounded-xl ${
                isActive(link.path) ? 'bg-blue-600 text-white' : 'text-white/60 hover:bg-white/5 hover:text-white'
              }`}
            >
              {link.name}
            </Link>
          ))}
          {isAdmin && (
            <Link
              to="/admin"
              onClick={() => setMobileMenuOpen(false)}
              className={`text-xs font-black uppercase tracking-widest py-2 px-4 rounded-xl text-blue-400 ${
                isActive('/admin') ? 'bg-blue-900/50' : 'hover:bg-white/5'
              }`}
            >
              Admin Dashboard
            </Link>
          )}
          <Link
            to="/profile"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-2 py-2 px-4 rounded-xl hover:bg-white/5 text-xs font-black uppercase tracking-widest text-slate-300"
          >
            <User size={14} className="text-blue-400" />
            Profile ({username})
          </Link>
          <button
            onClick={() => {
              setMobileMenuOpen(false);
              handleLogout();
            }}
            className="flex items-center justify-center gap-2 py-2 px-4 bg-rose-600/20 border border-rose-500/30 text-rose-500 rounded-xl text-xs font-black uppercase tracking-widest w-full text-center cursor-pointer"
          >
            <LogOut size={14} />
            Log Out
          </button>
        </div>
      )}
    </nav>
  );
}
