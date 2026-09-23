import { Badge } from "@/components/ui/badge";

const STATUS_MAP = {
  PENDING: { variant: "warning", label: "Pending" },
  APPROVED: { variant: "success", label: "Approved" },
  REJECTED: { variant: "destructive", label: "Rejected" },
};

export function StatusBadge({ status }) {
  const config = STATUS_MAP[status] || { variant: "default", label: status };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
