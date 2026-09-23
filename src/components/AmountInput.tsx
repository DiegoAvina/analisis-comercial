import { Input } from './Input';
import { normalizeAmountText } from '../utils/amount';

interface Props {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  autoFocus?: boolean;
}

export function AmountInput({ label = 'Monto', value, onChange, placeholder = '0.00', error, autoFocus }: Props) {
  return (
    <Input
      label={label}
      value={value}
      onChange={(e) => onChange(normalizeAmountText(e.target.value))}
      placeholder={placeholder}
      error={error}
      autoFocus={autoFocus}
      inputMode="decimal"
      icon="$"
    />
  );
}
