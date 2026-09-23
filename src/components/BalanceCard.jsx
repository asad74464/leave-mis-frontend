import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export function BalanceCard({ balance }) {
  const { totalDays, usedDays, remainingDays, leaveType } = balance;
  const usedPct = totalDays > 0 ? Math.min(100, Math.round((usedDays / totalDays) * 100)) : 0;
  const isLow = remainingDays <= Math.max(2, Math.round(totalDays * 0.15));

  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-sm font-medium text-muted-foreground">{leaveType?.name}</p>
        <div className="mt-2 flex items-baseline gap-1.5">
          <span className="font-display text-4xl font-medium text-foreground">{remainingDays}</span>
          <span className="text-sm text-muted-foreground">/ {totalDays} days left</span>
        </div>

        <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className={cn('h-full rounded-full', isLow ? 'bg-destructive' : 'bg-accent')}
            style={{ width: `${usedPct}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">{usedDays} used this cycle</p>
      </CardContent>
    </Card>
  );
}
