import { NavLink } from 'react-router-dom';
import { LayoutGrid, CalendarClock, Tags, Users, ScrollText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';

const NAV_ITEMS = [
  { to: '/', label: 'Overview', icon: LayoutGrid, end: true },
  { to: '/requests', label: 'Leave requests', icon: CalendarClock },
  { to: '/leave-types', label: 'Leave types', icon: Tags },
  { to: '/balances', label: 'Team balances', icon: Users, adminOnly: true },
];

export function Sidebar() {
  const { user } = useAuth();

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col bg-primary text-primary-foreground">
      <div className="flex items-center gap-2.5 border-b border-primary-foreground/10 px-6 py-6">
        <ScrollText className="h-6 w-6 text-accent" strokeWidth={1.75} />
        <div>
          <p className="font-display text-lg leading-none">Leave MIS</p>
          <p className="mt-1 text-xs text-primary-foreground/60">Leave register</p>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 px-3 py-4">
        {NAV_ITEMS.filter((item) => !item.adminOnly || user?.role === 'ADMIN').map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                isActive
                  ? 'bg-primary-foreground/10 text-primary-foreground'
                  : 'text-primary-foreground/70 hover:bg-primary-foreground/5 hover:text-primary-foreground'
              )
            }
          >
            <item.icon className="h-4 w-4" strokeWidth={1.75} />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-primary-foreground/10 px-6 py-4 text-xs text-primary-foreground/50">
        Ministry &amp; enterprise leave records
      </div>
    </aside>
  );
}
