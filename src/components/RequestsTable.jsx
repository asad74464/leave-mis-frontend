import { Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { StatusBadge } from '@/components/StatusBadge';

function formatDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
}

export function RequestsTable({ requests, isAdmin, onApprove, onReject, emptyMessage = 'No requests yet.' }) {
  if (requests.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border px-6 py-12 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {isAdmin ? <TableHead>Employee</TableHead> : null}
          <TableHead>Leave type</TableHead>
          <TableHead>Dates</TableHead>
          <TableHead>Days</TableHead>
          <TableHead>Status</TableHead>
          {isAdmin ? <TableHead className="text-right">Action</TableHead> : null}
        </TableRow>
      </TableHeader>
      <TableBody>
        {requests.map((req) => (
          <TableRow key={req.id}>
            {isAdmin ? (
              <TableCell>
                <p className="font-medium text-foreground">{req.user?.name}</p>
                <p className="text-xs text-muted-foreground">{req.user?.email}</p>
              </TableCell>
            ) : null}
            <TableCell>{req.leaveType?.name}</TableCell>
            <TableCell className="text-muted-foreground">
              {formatDate(req.startDate)} – {formatDate(req.endDate)}
            </TableCell>
            <TableCell>{req.numberOfDays}</TableCell>
            <TableCell>
              <StatusBadge status={req.status} />
              {req.status === 'REJECTED' && req.rejectionReason ? (
                <p className="mt-1 max-w-[16rem] text-xs text-muted-foreground">{req.rejectionReason}</p>
              ) : null}
            </TableCell>
            {isAdmin ? (
              <TableCell className="text-right">
                {req.status === 'PENDING' ? (
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="outline" onClick={() => onReject(req)}>
                      <X className="h-3.5 w-3.5" /> Reject
                    </Button>
                    <Button size="sm" variant="accent" onClick={() => onApprove(req)}>
                      <Check className="h-3.5 w-3.5" /> Approve
                    </Button>
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">Reviewed</span>
                )}
              </TableCell>
            ) : null}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
