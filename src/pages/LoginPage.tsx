import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { ErrorBanner } from '../components/ErrorBanner';
import { useAuth } from '../context/AuthContext';
import { getApiErrorMessage } from '../api/client';

export function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.SubmitEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch (err) {
      setError(getApiErrorMessage(err, 'No se pudo iniciar sesión.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-shell">
      <form className="auth-card" onSubmit={handleSubmit}>
        <div className="auth-logo">💰</div>
        <div className="auth-title">Bienvenido de vuelta</div>
        <div className="auth-subtitle">Inicia sesión para ver tus finanzas</div>

        {!!error && <ErrorBanner message={error} />}

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
          autoComplete="current-password"
          placeholder="••••••••"
        />

        <div style={{ height: 8 }} />
        <div style={{ width: '100%' }}>
          <Button label="Entrar" type="submit" loading={loading} disabled={!email || !password} />
        </div>

        <div className="auth-footer">
          <span>¿No tienes cuenta?</span>
          <Link to="/registro" style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>
            Crear cuenta
          </Link>
        </div>
      </form>
    </div>
  );
}
