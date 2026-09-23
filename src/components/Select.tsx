import React from 'react';

interface Props extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
}

export function Select({ label, id, className, children, ...props }: Props) {
  const selectId = id ?? label.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="field">
      <label htmlFor={selectId}>{label}</label>
      <div className="select-wrap">
        <select id={selectId} className={`input select${className ? ` ${className}` : ''}`} {...props}>
          {children}
        </select>
        <span className="select-chevron" aria-hidden="true">
          ▾
        </span>
      </div>
    </div>
  );
}
