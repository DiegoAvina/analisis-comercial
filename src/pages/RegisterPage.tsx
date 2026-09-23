import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { ErrorBanner } from '../components/ErrorBanner';
import { useAuth } from '../context/AuthContext';
import { getApiErrorMessage } from '../api/client';

export function RegisterPage() {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.SubmitEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await register(name.trim(), email.trim(), password);
    } catch (err) {
      setError(getApiErrorMessage(err, 'No se pudo crear la cuenta.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-shell">
      <form className="auth-card" onSubmit={handleSubmit}>
        <div className="auth-title">Crea tu cuenta</div>
        <div className="auth-subtitle">Controla tus gastos, ahorros y tandas en un solo lugar</div>

        {!!error && <ErrorBanner message={error} />}

        <Input label="Nombre" value={name} onChange={(e) => setName(e.target.value)} placeholder="Tu nombre" />
        <Input
          label="Correo"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          placeholder="tucorreo@ejemplo.com"
        />
        <Input
          label="Contraseña"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          placeholder="Mínimo 8 caracteres, mayúsculas y números"
        />

        <div style={{ height: 8 }} />
        <div style={{ width: '100%' }}>
          <Button label="Crear cuenta" type="submit" loading={loading} disabled={!name || !email || !password} />
        </div>

        <div className="auth-footer">
          <span>¿Ya tienes cuenta?</span>
          <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>
            Inicia sesión
          </Link>
        </div>
      </form>
    </div>
  );
}
