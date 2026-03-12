import React from 'react';
import './Button.css';

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon,
  className = '',
  ...props
}) {
  const classes = [
    'btn',
    `btn-${variant}`,
    `btn-${size}`,
    loading && 'btn-loading',
    disabled && 'btn-disabled',
    'button-press',
    className
  ].filter(Boolean).join(' ');

  return (
    <button className={classes} disabled={disabled || loading} {...props}>
      {loading && (
        <span className="btn-spinner animate-spin"></span>
      )}
      {icon && !loading && (
        <span className="btn-icon">{icon}</span>
      )}
      <span className="btn-text">{children}</span>
    </button>
  );
}
