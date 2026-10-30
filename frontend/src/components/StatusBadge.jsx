import { CheckCircle2, Clock3 } from 'lucide-react';

function StatusBadge({ status, label }) {
  const isReceived = ['received', 'active'].includes(status);
  const Icon = isReceived ? CheckCircle2 : Clock3;
  return (
    <span className={`status-label ${isReceived ? 'is-active' : ''}`} role="status">
      <Icon aria-hidden="true" size={14} strokeWidth={2} />
      {label}
    </span>
  );
}

export default StatusBadge;
