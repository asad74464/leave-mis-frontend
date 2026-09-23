import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { BalanceCard } from '@/components/BalanceCard';
import { RequestsTable } from '@/components/RequestsTable';
import { NewLeaveRequestDialog } from '@/components/NewLeaveRequestDialog';
import { RejectRequestDialog } from '@/components/RejectRequestDialog';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';

export default function DashboardPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [balances, setBalances] = useState([]);
  const [requests, setRequests] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newRequestOpen, setNewRequestOpen] = useState(false);
  const [rejectTarget, setRejectTarget] = useState(null);

  const load = useCallback(async () => {
    try {
      const [balanceData, requestData, leaveTypeData] = await Promise.all([
        api.get('/leave-balances'),
        api.get('/leave-requests'),
        api.get('/leave-types'),
      ]);
      setBalances(balanceData);
      setRequests(requestData);
      setLeaveTypes(leaveTypeData);
    } catch (err) {
      toast.error(err.message || 'Could not load your dashboard');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleApprove(request) {
    try {
      await api.patch(`/leave-requests/${request.id}/approve`, {});
      toast.success(`Approved ${request.user?.name}'s request`);
      load();
    } catch (err) {
      toast.error(err.message || 'Could not approve the request');
    }
  }

  const pendingCount = requests.filter((r) => r.status === 'PENDING').length;
  const approvedCount = requests.filter((r) => r.status === 'APPROVED').length;
  const rejectedCount = requests.filter((r) => r.status === 'REJECTED').length;

  return (
    <AppShell
      title={isAdmin ? 'Overview' : 'Your leave'}
      description={isAdmin ? 'Requests awaiting review across the organization.' : 'Balances and recent requests at a glance.'}
    >
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : isAdmin ? (
        <div className="flex flex-col gap-8">
          <div className="grid grid-cols-3 gap-5">
            <StatCard label="Pending review" value={pendingCount} tone="warning" />
            <StatCard label="Approved" value={approvedCount} tone="success" />
            <StatCard label="Rejected" value={rejectedCount} tone="destructive" />
          </div>

          <div>
            <h2 className="font-display text-lg font-medium text-foreground">Needs your decision</h2>
            <div className="mt-3">
              <RequestsTable
                requests={requests.filter((r) => r.status === 'PENDING')}
                isAdmin
                onApprove={handleApprove}
                onReject={setRejectTarget}
                emptyMessage="Nothing pending — you're all caught up."
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-medium text-foreground">Your balances</h2>
            <Button variant="accent" onClick={() => setNewRequestOpen(true)}>
              <Plus className="h-4 w-4" /> Request leave
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
            {balances.map((b) => (
              <BalanceCard key={b.id} balance={b} />
            ))}
          </div>

          <div>
            <h2 className="font-display text-lg font-medium text-foreground">Recent requests</h2>
            <div className="mt-3">
              <RequestsTable requests={requests.slice(0, 5)} isAdmin={false} />
            </div>
          </div>
        </div>
      )}

      <NewLeaveRequestDialog
        leaveTypes={leaveTypes}
        open={newRequestOpen}
        onOpenChange={setNewRequestOpen}
        onCreated={load}
      />
      <RejectRequestDialog
        request={rejectTarget}
        open={!!rejectTarget}
        onOpenChange={(open) => !open && setRejectTarget(null)}
        onRejected={load}
      />
    </AppShell>
  );
}

function StatCard({ label, value, tone }) {
  const toneClass = { warning: 'text-warning', success: 'text-success', destructive: 'text-destructive' }[tone];
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <p className={`mt-2 font-display text-4xl font-medium ${toneClass}`}>{value}</p>
      </CardContent>
    </Card>
  );
}
