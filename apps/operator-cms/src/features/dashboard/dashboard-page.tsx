import { Bus, Map, MapPin, Sofa, Truck } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Badge } from '@/components/ui/badge';
import { useAuthContext } from '@/features/auth/auth-context';

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  operator: 'Operator',
  driver: 'Driver',
  customer: 'Customer',
};

interface ModuleCard {
  to: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
}

const MODULE_CARDS: ModuleCard[] = [
  {
    to: '/stations',
    label: 'Stations',
    description: 'Manage bus stations and stops',
    icon: <MapPin className="size-6" />,
    adminOnly: true,
  },
  {
    to: '/routes',
    label: 'Routes',
    description: 'Configure routes between stations',
    icon: <Map className="size-6" />,
  },
  {
    to: '/seat-layouts',
    label: 'Seat Layouts',
    description: 'Define vehicle seat configurations',
    icon: <Sofa className="size-6" />,
    adminOnly: true,
  },
  {
    to: '/vehicles',
    label: 'Vehicles',
    description: 'Manage your fleet of vehicles',
    icon: <Truck className="size-6" />,
  },
  {
    to: '/trips',
    label: 'Trips',
    description: 'Schedule and manage trips',
    icon: <Bus className="size-6" />,
  },
];

export function DashboardPage() {
  const { user, isAdmin } = useAuthContext();

  const visibleCards = MODULE_CARDS.filter((card) => !card.adminOnly || isAdmin);
  /* v8 ignore next -- all valid roles are in ROLE_LABELS */
  const roleLabel = user ? (ROLE_LABELS[user.role] ?? user.role) : '';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
          <span>Welcome back</span>
          {user && <Badge variant="secondary">{roleLabel}</Badge>}
          {user?.operatorId != null && (
            <span className="text-xs">— Operator #{user.operatorId}</span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visibleCards.map((card) => (
          <Link
            key={card.to}
            to={card.to}
            data-testid={`dashboard-card-${card.to.replace(/^\//, '')}`}
            className="flex items-start gap-4 rounded-lg border bg-card p-5 shadow-sm transition-colors hover:bg-accent"
          >
            <div className="mt-0.5 text-muted-foreground">{card.icon}</div>
            <div>
              <div className="font-semibold">{card.label}</div>
              <div className="mt-0.5 text-sm text-muted-foreground">{card.description}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
