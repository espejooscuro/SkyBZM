import './Input.css';

export function Input({ 
  label, 
  type = 'text', 
  value, 
  onChange, 
  placeholder,
  error,
  helperText,
  icon,
  fullWidth = false,
  disabled = false,
  ...props 
}) {
  return (
    <div className={`input-wrapper ${fullWidth ? 'input-full' : ''}`}>
      {label && <label className="input-label">{label}</label>}
      <div className="input-container">
        {icon && <span className="input-icon">{icon}</span>}
        <input
          type={type}
          className={`input ${icon ? 'input-with-icon' : ''} ${error ? 'input-error' : ''}`}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          {...props}
        />
      </div>
      {error && <span className="input-error-text">{error}</span>}
      {helperText && !error && <span className="input-helper-text">{helperText}</span>}
    </div>
  );
}

export function Select({ 
  label, 
  value, 
  onChange, 
  options = [],
  error,
  helperText,
  fullWidth = false,
  disabled = false,
  ...props 
}) {
  return (
    <div className={`input-wrapper ${fullWidth ? 'input-full' : ''}`}>
      {label && <label className="input-label">{label}</label>}
      <select
        className={`input select ${error ? 'input-error' : ''}`}
        value={value}
        onChange={onChange}
        disabled={disabled}
        {...props}
      >
        {options.map((opt, idx) => (
          <option key={idx} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      {error && <span className="input-error-text">{error}</span>}
      {helperText && !error && <span className="input-helper-text">{helperText}</span>}
    </div>
  );
}

export function Textarea({ 
  label, 
  value, 
  onChange, 
  placeholder,
  rows = 4,
  error,
  helperText,
  fullWidth = false,
  disabled = false,
  ...props 
}) {
  return (
    <div className={`input-wrapper ${fullWidth ? 'input-full' : ''}`}>
      {label && <label className="input-label">{label}</label>}
      <textarea
        className={`input textarea ${error ? 'input-error' : ''}`}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        rows={rows}
        disabled={disabled}
        {...props}
      />
      {error && <span className="input-error-text">{error}</span>}
      {helperText && !error && <span className="input-helper-text">{helperText}</span>}
    </div>
  );
}

export function Switch({ label, checked, onChange, disabled = false }) {
  return (
    <label className={`switch-wrapper ${disabled ? 'switch-disabled' : ''}`}>
      <div className="switch-container">
        <input
          type="checkbox"
          className="switch-input"
          checked={checked}
          onChange={onChange}
          disabled={disabled}
        />
        <span className="switch-slider"></span>
      </div>
      {label && <span className="switch-label">{label}</span>}
    </label>
  );
}
