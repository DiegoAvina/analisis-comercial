import { useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Modal } from '../components/Modal';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { ErrorBanner } from '../components/ErrorBanner';
import { Avatar } from '../components/Avatar';
import { updateProfile, uploadAvatar, resetAccountData } from '../api/profile';
import { getApiErrorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';

type DangerAction = 'reset' | 'delete' | null;

export function ProfileModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user, updateUser, logout, deleteAccount } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [newPassword, setNewPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const [confirmingAction, setConfirmingAction] = useState<DangerAction>(null);
  const [dangerPassword, setDangerPassword] = useState('');
  const [dangerError, setDangerError] = useState<string | null>(null);
  const [resetDone, setResetDone] = useState(false);

  useEffect(() => {
    if (open && user) {
      setName(user.name);
      setEmail(user.email);
      setNewPassword('');
      setCurrentPassword('');
      setError(null);
      setConfirmingAction(null);
      setDangerPassword('');
      setDangerError(null);
      setResetDone(false);
    }
  }, [open, user]);

  const avatarMutation = useMutation({
    mutationFn: (file: File) => uploadAvatar(file),
    onSuccess: (updated) => updateUser(updated),
    onError: (e) => setError(getApiErrorMessage(e, 'No se pudo actualizar tu foto.')),
  });

  const profileMutation = useMutation({
    mutationFn: () =>
      updateProfile({
        name: name.trim(),
        email: email.trim(),
        ...(newPassword ? { password: newPassword, current_password: currentPassword } : {}),
      }),
    onSuccess: (updated) => {
      updateUser(updated);
      setNewPassword('');
      setCurrentPassword('');
      onClose();
    },
    onError: (e) => setError(getApiErrorMessage(e, 'No se pudo actualizar tu perfil.')),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteAccount(dangerPassword),
    onError: (e) => setDangerError(getApiErrorMessage(e, 'No se pudo eliminar tu cuenta.')),
  });

  const resetMutation = useMutation({
    mutationFn: () => resetAccountData(dangerPassword),
    onSuccess: () => {
      queryClient.invalidateQueries();
      setDangerPassword('');
      setConfirmingAction(null);
      setResetDone(true);
    },
    onError: (e) => setDangerError(getApiErrorMessage(e, 'No se pudo borrar tu información.')),
  });

  if (!user) return null;

  return (
    <Modal open={open} title="Tu cuenta" onClose={onClose}>
      {!!error && <ErrorBanner message={error} />}

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 20 }}>
        <div
          className="tooltip"
          data-tooltip="Cambiar tu foto de perfil"
          style={{ position: 'relative', cursor: 'pointer' }}
          onClick={() => fileInputRef.current?.click()}
        >
          <Avatar name={user.name} url={user.avatar_url} size={84} />
          <div
            style={{
              position: 'absolute',
              right: -2,
              bottom: -2,
              width: 28,
              height: 28,
              borderRadius: 14,
              background: 'var(--primary)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid var(--surface)',
              fontSize: 13,
            }}
          >
            📷
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/gif,image/webp,image/bmp"
          style={{ display: 'none' }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              setError(null);
              avatarMutation.mutate(file);
            }
            e.target.value = '';
          }}
        />
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--primary)', marginTop: 8 }}>
          {avatarMutation.isPending ? 'Subiendo...' : 'Cambiar foto'}
        </span>
      </div>

      <Input label="Nombre" value={name} onChange={(e) => setName(e.target.value)} />
      <Input label="Correo" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
      <Input
        label="Nueva contraseña (opcional)"
        type="password"
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
        placeholder="Déjalo vacío para no cambiarla"
      />
      {!!newPassword && (
        <Input
          label="Contraseña actual"
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          placeholder="Para confirmar el cambio"
        />
      )}

      <div style={{ height: 8 }} />
      <Button
        label="Guardar cambios"
        onClick={() => {
          setError(null);
          profileMutation.mutate();
        }}
        loading={profileMutation.isPending}
        disabled={!name || !email || (!!newPassword && !currentPassword)}
      />

      <div style={{ height: 12 }} />
      <Button label="Cerrar sesión" variant="secondary" tooltip="Salir de tu cuenta en este dispositivo" onClick={logout} />

      <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
        <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--danger)', marginBottom: 8 }}>Zona peligrosa</div>

        {confirmingAction === null && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {resetDone && (
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--success)' }}>
                ✅ Tu información se borró correctamente.
              </div>
            )}
            <Button
              label="Borrar mis datos"
              variant="secondary"
              tooltip="Borra recibos, gastos, metas, tandas e ingresos, pero conserva tu cuenta"
              onClick={() => {
                setResetDone(false);
                setConfirmingAction('reset');
              }}
            />
            <Button
              label="Eliminar mi cuenta"
              variant="danger"
              tooltip="Elimina tu cuenta y toda tu información para siempre"
              onClick={() => setConfirmingAction('delete')}
            />
          </div>
        )}

        {confirmingAction === 'reset' && (
          <>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8 }}>
              Esto borra tus recibos, gastos, sueldos, metas, tandas e ingresos para siempre. Tu cuenta y tu
              sesión siguen igual — es como empezar desde cero. No se puede deshacer.
            </p>
            {!!dangerError && <ErrorBanner message={dangerError} />}
            <Input
              label="Confirma tu contraseña"
              type="password"
              value={dangerPassword}
              onChange={(e) => setDangerPassword(e.target.value)}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <Button
                label="Ya no, cancelar"
                variant="secondary"
                onClick={() => {
                  setConfirmingAction(null);
                  setDangerPassword('');
                  setDangerError(null);
                }}
              />
              <Button
                label="Sí, borrar mis datos"
                variant="danger"
                onClick={() => {
                  setDangerError(null);
                  resetMutation.mutate();
                }}
                loading={resetMutation.isPending}
                disabled={!dangerPassword}
              />
            </div>
          </>
        )}

        {confirmingAction === 'delete' && (
          <>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8 }}>
              Esto borra tu cuenta y toda tu información (recibos, gastos, metas, tandas, ingresos) para
              siempre. No se puede deshacer.
            </p>
            {!!dangerError && <ErrorBanner message={dangerError} />}
            <Input
              label="Confirma tu contraseña"
              type="password"
              value={dangerPassword}
              onChange={(e) => setDangerPassword(e.target.value)}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <Button
                label="Ya no, cancelar"
                variant="secondary"
                onClick={() => {
                  setConfirmingAction(null);
                  setDangerPassword('');
                  setDangerError(null);
                }}
              />
              <Button
                label="Sí, eliminar todo"
                variant="danger"
                onClick={() => {
                  setDangerError(null);
                  deleteMutation.mutate();
                }}
                loading={deleteMutation.isPending}
                disabled={!dangerPassword}
              />
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
