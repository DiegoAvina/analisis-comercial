import { useRef } from 'react';
import { ProgressBar } from './ProgressBar';

interface Props {
  imageUrl: string | null;
  name?: string;
  percent: number;
  completed?: boolean;
  onChangePhoto: (file: File) => void;
  uploading?: boolean;
  /** 'hero' = portada grande (detalle de la meta). 'card' = portada de tarjeta en la lista. */
  variant?: 'hero' | 'card';
}

/**
 * La foto que el usuario elige para representar una meta de ahorro (o un
 * degradado de respaldo si aún no elige una), con el avance hacia el
 * objetivo superpuesto encima.
 */
export function GoalCoverImage({ imageUrl, name, percent, completed, onChangePhoto, uploading, variant = 'card' }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const isHero = variant === 'hero';
  const clamped = Math.max(0, Math.min(100, percent));

  return (
    <div
      className="goal-cover"
      style={{
        height: isHero ? 220 : 140,
        borderRadius: isHero ? 'var(--radius-lg)' : 'var(--radius-lg) var(--radius-lg) 0 0',
        background: imageUrl
          ? `url(${imageUrl}) center/cover no-repeat`
          : `linear-gradient(135deg, ${completed ? 'var(--success)' : 'var(--primary)'}, var(--primary-dark))`,
      }}
    >
      <div className="goal-cover-scrim" />

      {!imageUrl && (
        <div className="goal-cover-hint">
          <span style={{ fontSize: isHero ? 26 : 20 }}>🖼️</span>
          {isHero && <span>Toca la cámara para agregar una foto</span>}
        </div>
      )}

      <button
        type="button"
        className="goal-cover-camera tooltip"
        data-tooltip="Cambiar la foto de esta meta"
        disabled={uploading}
        onClick={(e) => {
          e.stopPropagation();
          inputRef.current?.click();
        }}
      >
        {uploading ? <span className="btn-spinner" aria-hidden="true" /> : '📷'}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/gif,image/webp,image/bmp"
        style={{ display: 'none' }}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onChangePhoto(file);
          e.target.value = '';
        }}
      />

      {isHero ? (
        <div className="goal-cover-bottom">
          <div className="goal-cover-row">
            <span className="goal-cover-name">{name}</span>
            <span className="goal-cover-percent">{Math.round(clamped)}%</span>
          </div>
          <ProgressBar
            percent={clamped}
            color={completed ? 'var(--success)' : '#fff'}
            trackColor="rgba(255,255,255,0.25)"
            height={8}
          />
        </div>
      ) : (
        <div className="goal-cover-badge">{Math.round(clamped)}%</div>
      )}
    </div>
  );
}
