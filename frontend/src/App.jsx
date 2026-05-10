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
import './App.css';



// Protected Route component
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token') || localStorage.getItem('access_token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

// Admin Route component
const AdminRoute = ({ children }) => {
  const token = localStorage.getItem('token') || localStorage.getItem('access_token');
  const isAdmin = localStorage.getItem('is_admin') === 'true';
  
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  
  if (!isAdmin) {
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
