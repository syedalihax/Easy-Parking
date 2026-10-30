import GoogleIcon from './GoogleIcon';

function StatusBadge({ status, label }) {
  const isReceived = ['received', 'active'].includes(status);
  const iconName = isReceived ? 'check_circle' : 'schedule';

  return (
    <span className={`status-label ${isReceived ? 'is-active' : ''}`} role="status">
      <GoogleIcon name={iconName} size={14} />
      {label}
    </span>
  );
}

export default StatusBadge;
