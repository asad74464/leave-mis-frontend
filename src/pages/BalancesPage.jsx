import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { AppShell } from '@/components/layout/AppShell';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { api } from '@/lib/api';

export default function BalancesPage() {
  const [balances, setBalances] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api
      .get('/leave-balances')
      .then(setBalances)
      .catch((err) => toast.error(err.message || 'Could not load balances'))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <AppShell title="Team balances" description="Every employee's leave balance, across all leave types.">
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Leave type</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Used</TableHead>
              <TableHead>Remaining</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {balances.map((b) => (
              <TableRow key={b.id}>
                <TableCell>
                  <p className="font-medium text-foreground">{b.user?.name}</p>
                  <p className="text-xs text-muted-foreground">{b.user?.email}</p>
                </TableCell>
                <TableCell>{b.leaveType?.name}</TableCell>
                <TableCell>{b.totalDays}</TableCell>
                <TableCell>{b.usedDays}</TableCell>
                <TableCell className="font-medium text-foreground">{b.remainingDays}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </AppShell>
  );
}
