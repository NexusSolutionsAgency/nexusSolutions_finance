import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  ArrowLeftRight,
  FolderKanban,
  Users,
  HandCoins,
  FileBarChart2,
  Settings,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { roleLabels } from '../../lib/constants';

export default function Sidebar() {
  const [open, setOpen] = useState(false);
  const { signOut, profile, can } = useAuth();

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Resumen' },
    { to: '/movimientos', icon: ArrowLeftRight, label: 'Movimientos' },
    { to: '/proyectos', icon: FolderKanban, label: 'Proyectos' },
    { to: '/equipo', icon: Users, label: 'Equipo' },
    { to: '/cobranzas', icon: HandCoins, label: 'Cobranzas y rentabilidad' },
    ...(can.canViewReports ? [{ to: '/reportes', icon: FileBarChart2, label: 'Reportes' }] : []),
    { to: '/configuracion', icon: Settings, label: 'Configuración' },
  ];

  const initials = (profile?.full_name || profile?.email || '?')
    .split(' ')
    .map((s) => s[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="fixed top-3 left-3 z-50 lg:hidden bg-nx-card border border-nx-border p-2 rounded-lg text-nx-heading"
        aria-label="Menú"
      >
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>

      {open && <div className="fixed inset-0 bg-black/60 z-30 lg:hidden" onClick={() => setOpen(false)} />}

      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-nx-surface border-r border-nx-border z-40 flex flex-col transform transition-transform lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="px-5 py-5 border-b border-nx-border">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Nexus Solutions" className="w-10 h-10 rounded-lg object-cover ring-1 ring-nx-blue/30" />
            <div>
              <h1 className="text-nx-heading font-bold text-base leading-tight font-heading tracking-wide">
                NE<span className="text-nx-blue-light">X</span>US
              </h1>
              <p className="text-nx-muted text-[11px] leading-tight">Sistema financiero</p>
            </div>
          </div>
        </div>

        <nav className="p-3 space-y-1 flex-1 overflow-y-auto">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-lg transition-all text-sm font-medium ${
                  isActive
                    ? 'bg-nx-blue/15 text-nx-blue-light border border-nx-blue/25'
                    : 'text-nx-muted hover:text-nx-heading hover:bg-nx-card-hover border border-transparent'
                }`
              }
            >
              <Icon size={17} />
              <span className="truncate">{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-nx-border space-y-2">
          <div className="flex items-center gap-3 px-2 py-1.5">
            <div className="w-8 h-8 rounded-full bg-nx-blue/20 text-nx-blue-light flex items-center justify-center text-xs font-bold shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-nx-heading text-sm truncate">{profile?.full_name || profile?.email}</p>
              <p className="text-nx-muted text-[11px] truncate">{profile ? roleLabels[profile.role] : ''}</p>
            </div>
          </div>
          <button
            onClick={signOut}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-nx-muted hover:text-nx-red hover:bg-nx-card-hover transition-colors text-sm"
          >
            <LogOut size={15} />
            Cerrar sesión
          </button>
        </div>
      </aside>
    </>
  );
}
