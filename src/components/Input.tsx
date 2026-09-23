import React from 'react';

interface Props extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export function Input({ label, error, id, ...props }: Props) {
  const inputId = id ?? label.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="field">
      <label htmlFor={inputId}>{label}</label>
      <input id={inputId} className={`input${error ? ' input-error' : ''}`} {...props} />
      {!!error && <span className="field-error">{error}</span>}
    </div>
  );
}
