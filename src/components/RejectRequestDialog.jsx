import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { api } from '@/lib/api';

export function RejectRequestDialog({ request, open, onOpenChange, onRejected }) {
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!request) return;
    setIsSubmitting(true);
    try {
      await api.patch(`/leave-requests/${request.id}/reject`, { rejectionReason: reason });
      toast.success('Request rejected');
      setReason('');
      onOpenChange(false);
      onRejected?.();
    } catch (err) {
      toast.error(err.message || 'Could not reject the request');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Reject leave request</DialogTitle>
            <DialogDescription>
              {request ? `${request.user?.name}'s request for ${request.numberOfDays} day(s) of ${request.leaveType?.name}.` : ''}{' '}
              State why, so the employee knows what to do next.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-5 flex flex-col gap-1.5">
            <Label htmlFor="rejectionReason">Reason</Label>
            <Textarea
              id="rejectionReason"
              required
              minLength={3}
              placeholder="e.g. Team is short-staffed that week — please propose alternative dates"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="destructive" disabled={isSubmitting}>
              {isSubmitting ? 'Rejecting…' : 'Reject request'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
