import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Avatar } from './Avatar';
import { ProfileModal } from '../pages/ProfileModal';
import { useAuth } from '../context/AuthContext';

const NAV_ITEMS = [
  { to: '/', label: 'Inicio', icon: '🏠', end: true, tooltip: 'Resumen general de tus finanzas' },
  { to: '/ingresos', label: 'Ingresos', icon: '💰', tooltip: 'Tus fuentes de ingreso y su calendario de pagos' },
  { to: '/recibos', label: 'Recibos', icon: '🧾', tooltip: 'Recibos y facturas por pagar' },
  { to: '/ahorros', label: 'Ahorros', icon: '🎯', tooltip: 'Metas de ahorro individuales y en grupo' },
  { to: '/tandas', label: 'Tandas', icon: '👥', tooltip: 'Tus rondas de ahorro colectivo' },
  { to: '/calendario', label: 'Calendario', icon: '📅', tooltip: 'Vista mensual de todos tus movimientos' },
];

export function AppLayout() {
  const { user } = useAuth();
  const location = useLocation();
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [indicator, setIndicator] = useState<{ left: number; width: number; ready: boolean }>({
    left: 0,
    width: 0,
    ready: false,
  });

  const linkRefs = useRef(new Map<string, HTMLAnchorElement>());
  const navRef = useRef<HTMLElement>(null);

  const activeItem =
    NAV_ITEMS.find((item) => (item.end ? location.pathname === item.to : location.pathname.startsWith(item.to))) ??
    NAV_ITEMS[0];

  useLayoutEffect(() => {
    const el = linkRefs.current.get(activeItem!.to);
    const nav = navRef.current;
    if (!el || !nav) return;
    const navRect = nav.getBoundingClientRect();
    const rect = el.getBoundingClientRect();
    setIndicator({ left: rect.left - navRect.left, width: rect.width, ready: true });
  }, [activeItem, location.pathname]);

  useEffect(() => {
    function recalc() {
      const el = linkRefs.current.get(activeItem!.to);
      const nav = navRef.current;
      if (!el || !nav) return;
      const navRect = nav.getBoundingClientRect();
      const rect = el.getBoundingClientRect();
      setIndicator({ left: rect.left - navRect.left, width: rect.width, ready: true });
    }
    window.addEventListener('resize', recalc);
    return () => window.removeEventListener('resize', recalc);
  }, [activeItem]);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const firstName = (user?.name ?? '').trim().split(/\s+/)[0] ?? '';

  return (
    <div className="app-shell">
      <div className="ambient-glow ambient-glow-a" aria-hidden="true" />
      <div className="ambient-glow ambient-glow-b" aria-hidden="true" />

      <header className="navbar">
        <div className="navbar-inner">
          <button
            type="button"
            className="navbar-user tooltip"
            data-tooltip="Ver y editar tu cuenta"
            onClick={() => setProfileOpen(true)}
          >
            <Avatar name={user?.name ?? '?'} url={user?.avatar_url} size={38} />
            <span className="navbar-user-text">
              <span className="navbar-user-greeting">Hola,</span>
              <span className="navbar-user-name">{firstName || 'ahí'}</span>
            </span>
          </button>

          <nav className="navbar-links" ref={navRef} aria-label="Navegación principal">
            {indicator.ready && (
              <span
                className="nav-indicator"
                style={{ transform: `translateX(${indicator.left}px)`, width: indicator.width }}
              />
            )}
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                ref={(el) => {
                  if (el) linkRefs.current.set(item.to, el);
                  else linkRefs.current.delete(item.to);
                }}
                className={({ isActive }) => `nav-link tooltip${isActive ? ' active' : ''}`}
                data-tooltip={item.tooltip}
              >
                <span className="nav-link-icon">{item.icon}</span>
                <span className="nav-link-label">{item.label}</span>
              </NavLink>
            ))}
          </nav>

          <button
            type="button"
            className="navbar-mobile-toggle tooltip"
            data-tooltip={mobileOpen ? 'Cerrar menú' : 'Abrir menú'}
            aria-label={mobileOpen ? 'Cerrar menú de navegación' : 'Abrir menú de navegación'}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((v) => !v)}
          >
            <span className={`burger${mobileOpen ? ' open' : ''}`}>
              <span />
              <span />
              <span />
            </span>
          </button>
        </div>

        <div className={`navbar-mobile-menu${mobileOpen ? ' open' : ''}`}>
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `mobile-nav-link${isActive ? ' active' : ''}`}
            >
              <span className="nav-link-icon">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </div>
      </header>

      <main className="main-content">
        <div key={location.pathname} className="page-transition">
          <Outlet />
        </div>
      </main>

      <ProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} />
    </div>
  );
}
