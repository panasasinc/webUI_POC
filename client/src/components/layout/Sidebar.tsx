import { NavLink } from 'react-router';
import {
  BarChart3, HardDrive, Bell, Network, Monitor, HelpCircle, Lock,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { to: '/', icon: BarChart3, label: 'Dashboards' },
  { to: '/volumes', icon: HardDrive, label: 'File System' },
  { to: '/hosts', icon: Monitor, label: 'Hosts' },
  { to: '/alerts', icon: Bell, label: 'Alerts' },
  { to: '/nodes', icon: Network, label: 'Realm Nodes' },
];

const bottomItems = [
  { to: '/help', icon: HelpCircle, label: 'Get Help' },
  { to: '/about', icon: Lock, label: 'About' },
];

export function Sidebar() {
  return (
    <aside className="flex h-screen w-16 flex-col border-r border-border bg-sidebar-background">
      {/* VDURA V Logo */}
      <div className="flex h-14 items-center justify-center border-b border-border">
        <svg width="28" height="24" viewBox="0 0 28 24" fill="none">
          <path d="M2 2L14 22L26 2H20L14 14L8 2H2Z" fill="#d4a017" />
        </svg>
      </div>

      {/* Main nav */}
      <nav className="flex flex-1 flex-col items-center gap-1 py-3">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            title={label}
            className={({ isActive }) =>
              cn(
                'flex h-10 w-10 items-center justify-center rounded-md transition-colors',
                isActive
                  ? 'bg-vdura-amber text-vdura-amber-light text-black'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
              )
            }
          >
            <Icon className="h-5 w-5" />
          </NavLink>
        ))}
      </nav>

      {/* Bottom nav */}
      <nav className="flex flex-col items-center gap-1 border-t border-border py-3">
        {bottomItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            title={label}
            className={({ isActive }) =>
              cn(
                'flex h-10 w-10 items-center justify-center rounded-md transition-colors',
                isActive
                  ? 'bg-vdura-amber text-black'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
              )
            }
          >
            <Icon className="h-5 w-5" />
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
