import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/context/AuthContext';

export function Topbar({ title, description }) {
  const { user, logout } = useAuth();

  return (
    <header className="flex items-center justify-between border-b border-border bg-background px-8 py-6">
      <div>
        <h1 className="font-display text-2xl font-medium text-foreground">{title}</h1>
        {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      </div>

      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="text-sm font-medium text-foreground">{user?.name}</p>
          <Badge variant={user?.role === 'ADMIN' ? 'accent' : 'default'} className="mt-1">
            {user?.role === 'ADMIN' ? 'Administrator' : 'Employee'}
          </Badge>
        </div>
        <Button variant="ghost" size="icon" onClick={logout} title="Log out">
          <LogOut className="h-4 w-4" strokeWidth={1.75} />
        </Button>
      </div>
    </header>
  );
}
