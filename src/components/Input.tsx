import React, { useState } from 'react';

interface Props extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  /** Ícono al inicio del campo. Si se omite, se infiere uno según `type` (correo, fecha, teléfono...). */
  icon?: React.ReactNode;
}

const TYPE_ICONS: Partial<Record<string, string>> = {
  email: '✉️',
  date: '📅',
  tel: '📞',
  search: '🔍',
  url: '🔗',
};

export function Input({ label, error, id, type, icon, ...props }: Props) {
  const inputId = id ?? label.toLowerCase().replace(/\s+/g, '-');
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  const resolvedIcon = icon ?? (isPassword ? '🔒' : type ? TYPE_ICONS[type] : undefined);

  return (
    <div className="field">
      <label htmlFor={inputId}>{label}</label>
      <div className={`input-wrap${resolvedIcon ? ' has-icon' : ''}`}>
        {!!resolvedIcon && (
          <span className="input-icon" aria-hidden="true">
            {resolvedIcon}
          </span>
        )}
        <input
          id={inputId}
          type={isPassword && showPassword ? 'text' : type}
          className={`input${error ? ' input-error' : ''}${resolvedIcon ? ' input-has-icon' : ''}${isPassword ? ' input-has-action' : ''}`}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            className="input-action tooltip"
            data-tooltip={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            tabIndex={-1}
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          >
            {showPassword ? '🙈' : '👁️'}
          </button>
        )}
      </div>
      {!!error && (
        <span className="field-error">
          <span aria-hidden="true">⚠</span> {error}
        </span>
      )}
    </div>
  );
}
