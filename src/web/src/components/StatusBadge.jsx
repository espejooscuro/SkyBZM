import React from 'react';
import './StatusBadge.css';

export function StatusBadge({ status, showDot = true, className = '' }) {
  const getStatusInfo = () => {
    switch (status?.toLowerCase()) {
      case 'connected':
        return {
          label: 'Connected',
          color: 'success',
          dotClass: 'connected'
        };
      case 'connecting':
        return {
          label: 'Connecting',
          color: 'warning',
          dotClass: 'connecting'
        };
      case 'disconnected':
        return {
          label: 'Disconnected',
          color: 'danger',
          dotClass: 'disconnected'
        };
      default:
        return {
          label: status || 'Unknown',
          color: 'secondary',
          dotClass: 'disconnected'
        };
    }
  };

  const info = getStatusInfo();

  return (
    <span className={`status-badge status-badge-${info.color} ${className}`}>
      {showDot && <span className={`status-dot ${info.dotClass}`}></span>}
      <span className="status-label">{info.label}</span>
    </span>
  );
}
