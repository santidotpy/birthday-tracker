import type { Integrante } from '../domain/agenda.js';
import { colorDeNombre, iniciales } from '../retratos/iniciales.js';

interface Props {
  integrante: Integrante;
  /** El gorrito solo va sobre quien está cumpliendo. */
  conGorrito?: boolean;
}

/**
 * El Retrato de un Integrante, o sus iniciales sobre un color derivado del
 * nombre. El respaldo no es un caso raro: mientras el Administrador no cargue
 * a nadie con foto, es lo único que se ve.
 */
export function Retrato({ integrante, conGorrito = false }: Props) {
  const { retrato, nombre } = integrante;

  return (
    <div className="retrato">
      {retrato ? (
        <img className="retrato-imagen" src={`/retratos/${retrato}`} alt="" width={400} height={400} />
      ) : (
        <div
          className="retrato-iniciales"
          style={{ backgroundColor: colorDeNombre(nombre) }}
          aria-hidden="true"
        >
          {iniciales(nombre)}
        </div>
      )}
      {conGorrito && <Gorrito />}
    </div>
  );
}

/** Decorativo: se apoya sobre el Retrato, ladeado, como un gorrito de verdad. */
function Gorrito() {
  return (
    <svg className="gorrito" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="gorrito-cono" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ff7a59" />
          <stop offset="100%" stopColor="#e0245e" />
        </linearGradient>
      </defs>
      <path d="M50 6 L26 68 L74 68 Z" fill="url(#gorrito-cono)" />
      <path d="M41.5 44 L34 68 L44 68 L50 44 Z" fill="#ffd166" opacity="0.95" />
      <path d="M56 24 L48 44 L58 44 L64 24 Z" fill="#ffd166" opacity="0.95" />
      <ellipse cx="50" cy="68" rx="25" ry="6" fill="#c81e4f" />
      <circle cx="50" cy="7" r="8" fill="#ffd166" />
    </svg>
  );
}
