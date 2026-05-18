import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Businesses from './pages/Businesses';
import BusinessDetail from './pages/BusinessDetail';
import Analytics from './pages/Analytics';
import Members from './pages/Members';
import MemberDetail from './pages/MemberDetail';

function PrivateRoute({ children }) {
  return localStorage.getItem('admin_token') ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<PrivateRoute><Businesses /></PrivateRoute>} />
        <Route path="/businesses/:id" element={<PrivateRoute><BusinessDetail /></PrivateRoute>} />
        <Route path="/analytics" element={<PrivateRoute><Analytics /></PrivateRoute>} />
        <Route path="/members" element={<PrivateRoute><Members /></PrivateRoute>} />
        <Route path="/members/:id" element={<PrivateRoute><MemberDetail /></PrivateRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
