import { useNavigate, NavLink } from 'react-router-dom';
import { useState, useEffect } from 'react';
import api from '../api';

function usePendingCounts() {
  const [appCount,     setAppCount]     = useState(0);
  const [reqCount,     setReqCount]     = useState(0);
  const [changesCount, setChangesCount] = useState(0);
  useEffect(() => {
    if (!localStorage.getItem('admin_token')) return;
    api.get('/admin/applications/pending-count').then(({ data }) => setAppCount(data.count)).catch(() => {});
    api.get('/admin/requests/pending-count').then(({ data }) => setReqCount(data.count)).catch(() => {});
    api.get('/admin/business-changes/unseen-count').then(({ data }) => setChangesCount(data.count)).catch(() => {});
  }, []);
  return { appCount, reqCount, changesCount };
}

const badgeStyle = {
  background: '#f59e0b', color: '#fff', borderRadius: 10,
  fontSize: 11, fontWeight: 700, padding: '1px 7px', lineHeight: '18px',
};

export default function Layout({ title, actions, children }) {
  const navigate = useNavigate();
  const admin = JSON.parse(localStorage.getItem('admin_user') || '{}');
  const { appCount, reqCount, changesCount } = usePendingCounts();

  function logout() {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    navigate('/login');
  }

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <h1>In Common</h1>
          <p>Admin Dashboard</p>
        </div>
        <nav className="sidebar-nav">
          <NavLink to="/" end>Businesses</NavLink>
          <NavLink to="/members">Members</NavLink>
          <NavLink to="/analytics">Analytics</NavLink>
          <NavLink to="/applications" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            Applications
            {appCount > 0 && <span style={badgeStyle}>{appCount}</span>}
          </NavLink>
          <NavLink to="/requests" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            Requests
            {reqCount > 0 && <span style={badgeStyle}>{reqCount}</span>}
          </NavLink>
          <NavLink to="/changes" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            Page Changes
            {changesCount > 0 && <span style={badgeStyle}>{changesCount}</span>}
          </NavLink>
          <NavLink to="/referrals">Referrals</NavLink>
          <NavLink to="/notifications">Notifications</NavLink>
        </nav>
        <div className="sidebar-footer">
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>
            {admin.email}
          </div>
          <button onClick={logout}>Sign out</button>
        </div>
      </aside>
      <div className="main">
        <div className="topbar">
          <h2>{title}</h2>
          <div style={{ display: 'flex', gap: 8 }}>{actions}</div>
        </div>
        <div className="content">{children}</div>
      </div>
    </div>
  );
}
