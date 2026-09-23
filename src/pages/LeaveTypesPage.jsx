import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { NewLeaveTypeDialog } from '@/components/NewLeaveTypeDialog';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';

export default function LeaveTypesPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [leaveTypes, setLeaveTypes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      setLeaveTypes(await api.get('/leave-types'));
    } catch (err) {
      toast.error(err.message || 'Could not load leave types');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <AppShell title="Leave types" description="The categories of leave employees can request against.">
      <div className="mb-5 flex justify-end">
        {isAdmin ? (
          <Button variant="accent" onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4" /> New leave type
          </Button>
        ) : null}
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="grid grid-cols-2 gap-5 lg:grid-cols-3">
          {leaveTypes.map((lt) => (
            <Card key={lt.id}>
              <CardContent className="p-5">
                <div className="flex items-baseline justify-between">
                  <p className="font-display text-lg font-medium text-foreground">{lt.name}</p>
                  <p className="font-display text-2xl font-medium text-accent">{lt.annualLimit}</p>
                </div>
                <p className="text-xs text-muted-foreground">days per year</p>
                {lt.description ? <p className="mt-3 text-sm text-muted-foreground">{lt.description}</p> : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <NewLeaveTypeDialog open={dialogOpen} onOpenChange={setDialogOpen} onCreated={load} />
    </AppShell>
  );
}
