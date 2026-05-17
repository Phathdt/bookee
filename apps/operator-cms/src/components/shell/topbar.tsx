import { LogOut, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuthContext } from '@/lib/auth-context';
import { clearToken } from '@/lib/auth-store';

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  operator: 'Operator',
  driver: 'Driver',
  customer: 'Customer',
};

export function Topbar() {
  const { user, setUser } = useAuthContext();
  const navigate = useNavigate();

  function handleSignOut() {
    clearToken();
    setUser(null);
    void navigate('/login');
  }

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b bg-card px-6">
      <span className="text-sm text-muted-foreground">Operator CMS</span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-2">
            <User className="size-4" />
            <span className="max-w-32 truncate text-sm">{user ? `ID ${user.sub}` : 'Account'}</span>
            {user && (
              <Badge variant="secondary" className="text-xs">
                {ROLE_LABELS[user.role] ?? user.role}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {user && (
            <>
              <div className="px-2 py-1.5 text-xs text-muted-foreground">
                Role: {ROLE_LABELS[user.role] ?? user.role}
                {user.operatorId != null && (
                  <span className="ml-1">(Operator #{user.operatorId})</span>
                )}
              </div>
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuItem
            onClick={handleSignOut}
            className="text-destructive focus:text-destructive"
          >
            <LogOut className="size-4" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
