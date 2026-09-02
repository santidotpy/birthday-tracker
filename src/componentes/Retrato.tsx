import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import type { Integrante } from '../domain/agenda.js';
import { iniciales, variablesDeRespaldo } from '../retratos/iniciales.js';

/**
 * El mismo Retrato se usa enorme en la pantalla de Hoy y diminuto en una fila
 * del panel, así que el tamaño es explícito por uso.
 *
 * Los techos son altos a propósito. El destino de esta pantalla es un televisor
 * de la oficina, que se mira de lejos: con un tope bajo el Retrato quedaba del
 * mismo tamaño en un celular que en una pantalla de 2500px, flotando en un
 * vacío enorme. El `clamp` sigue cuidando el celular por abajo.
 */
const TAMANOS = {
  hero: 'w-[clamp(9rem,24vw,26rem)]',
  medio: 'w-[clamp(5rem,13vw,13rem)]',
  fila: 'w-11',
} as const;

interface Props {
  integrante: Integrante;
  /** El gorrito solo va sobre quien está cumpliendo. */
  conGorrito?: boolean;
  tamano?: keyof typeof TAMANOS;
}

/**
 * El Retrato de un Integrante, o sus iniciales sobre un color derivado del
 * nombre. El respaldo no es un caso raro: mientras el Administrador no cargue
 * a nadie con foto, es lo único que se ve.
 */
export function Retrato({ integrante, conGorrito = false, tamano = 'hero' }: Props) {
  const { retrato, nombre } = integrante;

  return (
    <div className={cn('relative aspect-square @container', TAMANOS[tamano])}>
      <Avatar className="size-full">
        {/* `BASE_URL` es `/` salvo en el demo, que GitHub Pages sirve bajo
            `/<repo>/`. Sin esto, ahí las fotos salen 404. */}
        {retrato && <AvatarImage src={`${import.meta.env.BASE_URL}retratos/${retrato}`} alt="" />}
        <AvatarFallback
          // El color sale de la paleta contrastada de `iniciales.ts`, no de un
          // token: es dato derivado del nombre, distinto para cada persona. La
          // clase `.respaldo` elige cuál de los dos según el tema.
          style={variablesDeRespaldo(nombre)}
          // Contra el ancho del contenedor, nunca contra el viewport: con
          // unidades de viewport las iniciales del panel salían gigantes.
          className="respaldo text-[38cqi] font-semibold"
        >
          {iniciales(nombre)}
        </AvatarFallback>
      </Avatar>
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
