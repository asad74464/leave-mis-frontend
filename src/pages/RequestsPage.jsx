import { useEffect, useState, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RequestsTable } from "@/components/RequestsTable";
import { NewLeaveRequestDialog } from "@/components/NewLeaveRequestDialog";
import { RejectRequestDialog } from "@/components/RejectRequestDialog";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";

const TABS = [
  { value: "ALL", label: "All" },
  { value: "PENDING", label: "Pending" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
];

export default function RequestsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  const [requests, setRequests] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [tab, setTab] = useState("ALL");
  const [isLoading, setIsLoading] = useState(true);
  const [newRequestOpen, setNewRequestOpen] = useState(false);
  const [rejectTarget, setRejectTarget] = useState(null);

  const load = useCallback(async () => {
    try {
      const [requestData, leaveTypeData] = await Promise.all([
        api.get("/leave-requests"),
        api.get("/leave-types"),
      ]);
      setRequests(requestData);
      setLeaveTypes(leaveTypeData);
    } catch (err) {
      toast.error(err.message || "Could not load leave requests");
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
      toast.success(`Approved ${request.user?.name ?? "the"} request`);
      load();
    } catch (err) {
      toast.error(err.message || "Could not approve the request");
    }
  }

  const filtered = useMemo(
    () => (tab === "ALL" ? requests : requests.filter((r) => r.status === tab)),
    [requests, tab],
  );

  return (
    <AppShell
      title="Leave requests"
      description={
        isAdmin
          ? "Review and decide on every request in the organization."
          : "Your leave history and current requests."
      }
    >
      <div className="flex items-center justify-between">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            {TABS.map((t) => (
              <TabsTrigger key={t.value} value={t.value}>
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {!isAdmin ? (
          <Button variant="accent" onClick={() => setNewRequestOpen(true)}>
            <Plus className="h-4 w-4" /> Request leave
          </Button>
        ) : null}
      </div>

      <div className="mt-5">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <RequestsTable
            requests={filtered}
            isAdmin={isAdmin}
            onApprove={handleApprove}
            onReject={setRejectTarget}
          />
        )}
      </div>

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
