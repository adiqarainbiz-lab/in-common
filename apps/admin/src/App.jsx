import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Apply from './pages/Apply';
import Businesses from './pages/Businesses';
import BusinessDetail from './pages/BusinessDetail';
import Analytics from './pages/Analytics';
import Members from './pages/Members';
import MemberDetail from './pages/MemberDetail';
import Applications from './pages/Applications';
import Requests from './pages/Requests';
import Referrals from './pages/Referrals';
import Notifications from './pages/Notifications';

function PrivateRoute({ children }) {
  return localStorage.getItem('admin_token') ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/apply" element={<Apply />} />

        {/* Protected routes */}
        <Route path="/" element={<PrivateRoute><Businesses /></PrivateRoute>} />
        <Route path="/businesses/:id" element={<PrivateRoute><BusinessDetail /></PrivateRoute>} />
        <Route path="/analytics" element={<PrivateRoute><Analytics /></PrivateRoute>} />
        <Route path="/members" element={<PrivateRoute><Members /></PrivateRoute>} />
        <Route path="/members/:id" element={<PrivateRoute><MemberDetail /></PrivateRoute>} />
        <Route path="/applications" element={<PrivateRoute><Applications /></PrivateRoute>} />
        <Route path="/requests"     element={<PrivateRoute><Requests /></PrivateRoute>} />
        <Route path="/referrals"      element={<PrivateRoute><Referrals /></PrivateRoute>} />
        <Route path="/notifications"  element={<PrivateRoute><Notifications /></PrivateRoute>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
