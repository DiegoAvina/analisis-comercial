import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Avatar } from './Avatar';
import { ProfileModal } from '../pages/ProfileModal';
import { useAuth } from '../context/AuthContext';

const NAV_ITEMS = [
  { to: '/', label: 'Inicio', icon: '🏠', end: true },
  { to: '/ingresos', label: 'Ingresos', icon: '💰' },
  { to: '/recibos', label: 'Recibos', icon: '🧾' },
  { to: '/ahorros', label: 'Ahorros', icon: '🎯' },
  { to: '/tandas', label: 'Tandas', icon: '👥' },
  { to: '/calendario', label: 'Calendario', icon: '📅' },
];

export function AppLayout() {
  const { user } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-brand-mark">F</div>
          <span className="sidebar-brand-name">FinZen</span>
        </div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer" onClick={() => setProfileOpen(true)}>
          <Avatar name={user?.name ?? '?'} url={user?.avatar_url} size={32} />
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user?.name}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Ver cuenta</div>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>

      <ProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} />
    </div>
  );
}
