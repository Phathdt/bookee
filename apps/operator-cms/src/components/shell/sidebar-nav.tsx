import { Bus, LayoutGrid, Map, MapPin, Sofa, Truck } from 'lucide-react';
import { NavLink } from 'react-router-dom';

import { cn } from '@/lib/utils';
import { useAuthContext } from '@/features/auth/auth-context';

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: <LayoutGrid className="size-4" /> },
  { to: '/stations', label: 'Stations', icon: <MapPin className="size-4" />, adminOnly: true },
  { to: '/routes', label: 'Routes', icon: <Map className="size-4" /> },
  {
    to: '/seat-layouts',
    label: 'Seat Layouts',
    icon: <Sofa className="size-4" />,
    adminOnly: true,
  },
  { to: '/vehicles', label: 'Vehicles', icon: <Truck className="size-4" /> },
  { to: '/trips', label: 'Trips', icon: <Bus className="size-4" /> },
];

export function SidebarNav() {
  const { isAdmin } = useAuthContext();

  const visibleItems = NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin);

  return (
    <nav className="flex w-56 shrink-0 flex-col gap-1 border-r bg-card px-3 py-4">
      <div className="mb-4 px-2">
        <span className="text-lg font-bold tracking-tight">Bookee CMS</span>
      </div>
      {visibleItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/'}
          data-testid={`nav-link-${item.to === '/' ? 'dashboard' : item.to.replace(/^\//, '')}`}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
            )
          }
        >
          {item.icon}
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
