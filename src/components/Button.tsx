
type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

interface Props {
  label: string;
  onClick?: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  type?: 'button' | 'submit';
  size?: 'md' | 'sm';
  /** Explica la acción del botón; se muestra como tooltip al pasar el cursor o enfocar. */
  tooltip?: string;
  /** Botón cuadrado que solo muestra un ícono (usa `label` como texto accesible). */
  icon?: boolean;
}

export function Button({
  label,
  onClick,
  variant = 'primary',
  loading,
  disabled,
  type = 'button',
  size = 'md',
  tooltip,
  icon,
}: Props) {
  const classes = [
    'btn',
    `btn-${variant}`,
    size === 'sm' ? 'btn-sm' : '',
    icon ? 'btn-icon' : '',
    tooltip ? 'tooltip' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type={type}
      className={classes}
      onClick={onClick}
      disabled={disabled || loading}
      data-tooltip={tooltip}
      aria-label={icon ? label : undefined}
    >
      {loading ? <span className="btn-spinner" aria-hidden="true" /> : label}
    </button>
  );
}
