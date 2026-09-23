import React, { useEffect, useState } from 'react';

interface Props {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

const CLOSE_ANIMATION_MS = 200;

export function Modal({ open, title, onClose, children }: Props) {
  const [rendered, setRendered] = useState(open);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (open) {
      setRendered(true);
      setClosing(false);
      return;
    }
    if (rendered) {
      setClosing(true);
      const timer = setTimeout(() => setRendered(false), CLOSE_ANIMATION_MS);
      return () => clearTimeout(timer);
    }
  }, [open, rendered]);

  if (!rendered) return null;

  return (
    <div
      className={`modal-overlay${closing ? ' closing' : ''}`}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className={`modal${closing ? ' closing' : ''}`}>
        <div className="modal-header">
          <span className="modal-title">{title}</span>
          <button className="modal-close tooltip" data-tooltip="Cerrar esta ventana" onClick={onClose} aria-label="Cerrar">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
