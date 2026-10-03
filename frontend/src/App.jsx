import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AuthPage from "./pages/AuthPage";
import RegistrationPage from "./pages/RegistrationPage";
import CreateTrip from "./pages/CreateTrip";
import ItineraryBuilder from "./pages/ItineraryBuilder";
import TripDetailView from "./pages/TripDetailView";
import Dashboard from "./pages/Dashboard";
import ProfilePage from "./pages/ProfilePage";
import ActivitySearch from "./pages/ActivitySearch";
import CommunityFeed from "./pages/CommunityFeed";
import PublicItineraryView from "./pages/PublicItineraryView";
import PackingList from "./pages/PackingList";
import AdminDashboard from "./pages/AdminDashboard";
import TripNotes from "./pages/TripNotes";
import BudgetBreakdown from "./pages/BudgetBreakdown";
import api from './api';
import './App.css';

const clearAuthState = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('access_token');
  localStorage.removeItem('username');
  localStorage.removeItem('is_admin');
  localStorage.removeItem('auth_user_id');
  Object.keys(localStorage)
    .filter((key) => key.startsWith('traveloop:private:'))
    .forEach((key) => localStorage.removeItem(key));
};

const LoadingSession = () => (
  <div className="min-h-screen flex items-center justify-center bg-[#0b0c14] text-white">
    <div className="text-sm font-black uppercase tracking-[0.3em] text-slate-300">Checking session...</div>
  </div>
);

// Protected Route component
const ProtectedRoute = ({ children }) => {
  const [checking, setChecking] = useState(() => Boolean(localStorage.getItem('token') || localStorage.getItem('access_token')));
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    let ignore = false;
    const token = localStorage.getItem('token') || localStorage.getItem('access_token');

    if (!token) {
      return undefined;
    }

    const verifySession = async () => {
      try {
        const response = await api.get('/api/auth/me');
        if (ignore) return;
        const isAdmin = Boolean(response.data?.is_admin);
        localStorage.setItem('auth_user_id', String(response.data?.id || response.data?.username || ''));
        localStorage.setItem('username', response.data?.username || localStorage.getItem('username') || '');
        localStorage.setItem('is_admin', String(isAdmin));
        setIsAuthenticated(true);
      } catch {
        if (ignore) return;
        clearAuthState();
        setIsAuthenticated(false);
      } finally {
        if (!ignore) setChecking(false);
      }
    };

    verifySession();
    return () => { ignore = true; };
  }, []);

  if (checking) return <LoadingSession />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
};

// Admin Route component
const AdminRoute = ({ children }) => {
  const [checking, setChecking] = useState(() => Boolean(localStorage.getItem('token') || localStorage.getItem('access_token')));
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    let ignore = false;
    const token = localStorage.getItem('token') || localStorage.getItem('access_token');

    if (!token) {
      return undefined;
    }

    const verifyAdmin = async () => {
      try {
        const response = await api.get('/api/auth/me');
        if (ignore) return;
        const isAdmin = Boolean(response.data?.is_admin);
        localStorage.setItem('auth_user_id', String(response.data?.id || response.data?.username || ''));
        localStorage.setItem('username', response.data?.username || localStorage.getItem('username') || '');
        localStorage.setItem('is_admin', String(isAdmin));
        setIsAuthorized(isAdmin);
      } catch {
        if (ignore) return;
        clearAuthState();
        setIsAuthorized(false);
      } finally {
        if (!ignore) setChecking(false);
      }
    };

    verifyAdmin();
    return () => { ignore = true; };
  }, []);

  if (checking) return <LoadingSession />;
  if (!isAuthorized) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
         <Route path="/login" element={<AuthPage />} />
         <Route path="/register" element={<RegistrationPage />} />
         <Route
           path="/register-profile"
           element={
             <ProtectedRoute>
               <RegistrationPage />
             </ProtectedRoute>
           }
         />
         <Route
           path="/trip/new"
           element={
             <ProtectedRoute>
               <CreateTrip />
             </ProtectedRoute>
           }
         />
         <Route
           path="/trip/:tripId/itinerary"
           element={
             <ProtectedRoute>
               <ItineraryBuilder />
             </ProtectedRoute>
           }
         />
         <Route
           path="/trip/:tripId/edit"
           element={
             <ProtectedRoute>
               <ItineraryBuilder />
             </ProtectedRoute>
           }
         />
         <Route
           path="/create-trip"
           element={<Navigate to="/trip/new" replace />}
         />
        <Route
          path="/trip/:tripId/view"
          element={
            <ProtectedRoute>
              <TripDetailView />
            </ProtectedRoute>
          }
        />
        <Route
          path="/trip/:tripId"
          element={
            <ProtectedRoute>
              <TripDetailView />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/search"
          element={
            <ProtectedRoute>
              <ActivitySearch />
            </ProtectedRoute>
          }
        />
          <Route
            path="/community"
            element={
              <ProtectedRoute>
                <CommunityFeed />
              </ProtectedRoute>
            }
          />
          <Route
            path="/packing-list"
            element={
              <ProtectedRoute>
                <PackingList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/notes"
            element={
              <ProtectedRoute>
                <TripNotes />
              </ProtectedRoute>
            }
          />
          <Route
            path="/trip/:tripId/budget"
            element={
              <ProtectedRoute>
                <BudgetBreakdown />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminDashboard />
              </AdminRoute>
            }
          />
          <Route path="/trip/public/:tripId" element={<PublicItineraryView />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
