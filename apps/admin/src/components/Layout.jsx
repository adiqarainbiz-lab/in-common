import { useNavigate, useLocation, NavLink } from 'react-router-dom';

export default function Layout({ title, actions, children }) {
  const navigate = useNavigate();
  const admin = JSON.parse(localStorage.getItem('admin_user') || '{}');

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
          <NavLink to="/analytics">Analytics</NavLink>
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
