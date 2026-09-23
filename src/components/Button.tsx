
type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

interface Props {
  label: string;
  onClick?: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  type?: 'button' | 'submit';
  size?: 'md' | 'sm';
}

export function Button({ label, onClick, variant = 'primary', loading, disabled, type = 'button', size = 'md' }: Props) {
  return (
    <button
      type={type}
      className={`btn btn-${variant}${size === 'sm' ? ' btn-sm' : ''}`}
      onClick={onClick}
      disabled={disabled || loading}
    >
      {loading ? '…' : label}
    </button>
  );
}
