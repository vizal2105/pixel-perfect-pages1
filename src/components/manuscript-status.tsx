import { Check, Clock, X } from 'lucide-react';

const map = {
  pending: { label: 'Pending Review', Icon: Clock },
  approved: { label: 'Approved', Icon: Check },
  rejected: { label: 'Rejected / Revisions Required', Icon: X },
} as const;

export function StatusBadge({ status }: { status: keyof typeof map }) {
  const { label, Icon } = map[status];
  return <span className="ms-status" data-status={status}><Icon />{label}</span>;
}
