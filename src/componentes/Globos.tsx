import { useEffect, useState } from 'react';
import { RETRASO_DEL_FESTEJO_MS } from './Confetti.js';
import { INTERVALO_DE_FONDO_MS } from './frescura.js';

/**
 * Globos que cruzan la pantalla de abajo hacia arriba y se van.
 *
 * Lo que aportan sobre el confeti no es más festejo: es el movimiento
 * contrario. El confeti es rápido, chico y cae; los Globos son lentos, grandes
 * y suben. Más confeti se leería como más confeti; dos movimientos opuestos se
 * leen como un evento más rico.
 *
 * **No flotan.** Suben una vez y se van, igual que el confeti se dispara una
 * vez. Un globo dando vueltas en bucle sería agotador de mirar en una TV
 * prendida ocho horas, y el ojo detecta el movimiento periférico mejor que
 * ninguna otra cosa: alguien sentado de espaldas giraría la cabeza cada quince
 * segundos, todo el día.
 *
 * La diferencia con el confeti es que **vuelven cada media hora**, y ahí está
 * la razón de ser de este componente. En la TV la pantalla se monta una sola
 * vez, a las 00:00: el festejo de entrada ocurre con la oficina vacía y a
 * oscuras, y a las diez de la mañana la pantalla de cumpleaños es una foto
 * quieta. Trece segundos de Globos dos veces por hora la vuelven a poner viva
 * para quien levanta la vista, sin convertirla en un bucle.
 *
 * El confeti **no** se repite con ellos, a propósito: la llegada es el momento
 * grande y las vueltas son recordatorios. Que cada media hora estalle todo de
 * nuevo sería otra cosa, y más ruidosa.
 */

/**
 * Cada Globo, a mano y no al azar.
 *
 * Nada de `Math.random()`: esto se renderiza en el servidor y el azar rompe la
 * hidratación igual que el reloj (ver `CuentaRegresiva.tsx`). Escrito a mano,
 * además, se puede componer: los tamaños alternan, las duraciones no comparten
 * divisores —si no suben en formación— y los colores no se repiten pegados.
 *
 * - `x` de dónde sale, en el ancho de la pantalla
 * - `escala` multiplica el tamaño base
 * - `subida` cuánto tarda en cruzar
 * - `salida` cuánto espera después del festejo. Van bien repartidas, hasta tres
 *   segundos: saliendo casi juntos, en cualquier instante están todos a la
 *   misma altura y se lee como una hilera que sube, no como globos sueltos
 * - `bamboleo` el período del vaivén
 * - `fase` desde qué punto del vaivén arranca, para que no se hamaquen al unísono
 */
const GLOBOS = [
  { x: '4%', color: 'a', escala: 1, subida: 7.4, salida: 0, bamboleo: 2.6, fase: 0 },
  { x: '20%', color: 'c', escala: 0.82, subida: 9.4, salida: 1900, bamboleo: 3.2, fase: 900 },
  { x: '38%', color: 'b', escala: 1.15, subida: 8.6, salida: 700, bamboleo: 2.9, fase: 1600 },
  { x: '58%', color: 'a', escala: 0.9, subida: 8.0, salida: 3000, bamboleo: 3.6, fase: 400 },
  { x: '74%', color: 'b', escala: 1.05, subida: 10.2, salida: 1300, bamboleo: 3.0, fase: 2100 },
  { x: '86%', color: 'c', escala: 0.78, subida: 8.9, salida: 2500, bamboleo: 3.4, fase: 1200 },
] as const;

/**
 * Cuánto vive una tanda. El más lento sale a los 3s y tarda 9,4s; con el retraso
 * del festejo son 11,8s, y el resto es aire para no cortar a nadie en el vuelo.
 */
const DURACION_MS = 13_000;

interface Props {
  /** Cambiar esta clave vuelve a empezar. Sirve para el cruce de medianoche. */
  clave: string;
}

export function Globos({ clave }: Props) {
  // Arranca sin nada: en el servidor no se pinta un solo Globo. Así el HTML es
  // el mismo con y sin movimiento reducido, y no hay nada que hidratar mal.
  const [tanda, setTanda] = useState<number | null>(null);

  useEffect(() => {
    // Movimiento reducido: no se renderizan. Acá no vale "se conserva el
    // fundido" —lo que hace el resto de la app— porque lo que molesta es
    // justamente el objeto grande cruzando toda la pantalla.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let numero = 0;
    setTanda(numero);

    const intervalo = setInterval(() => setTanda(++numero), INTERVALO_DE_FONDO_MS);
    return () => clearInterval(intervalo);
  }, [clave]);

  // Los baja del aire cuando terminaron. Seis elementos animándose promueven
  // seis capas de composición: dejarlas vivas media hora, quietas y fuera de
  // cuadro, es memoria de GPU que en una TV de bajo consumo se nota.
  useEffect(() => {
    if (tanda === null) return;
    const id = setTimeout(() => setTanda(null), DURACION_MS);
    return () => clearTimeout(id);
  }, [tanda]);

  if (tanda === null) return null;

  return (
    // La clave remonta la tanda entera, que es lo que reinicia las animaciones
    // desde cero. Un `animation-name` que se reasigna no siempre lo hace.
    <div key={tanda} className="globos" aria-hidden="true">
      {GLOBOS.map((globo, posicion) => (
        <span
          key={globo.x}
          className="globo"
          style={
            {
              '--x': globo.x,
              '--escala': globo.escala,
              '--subida': `${globo.subida}s`,
              '--salida': `${RETRASO_DEL_FESTEJO_MS + globo.salida}ms`,
              '--bamboleo': `${globo.bamboleo}s`,
              '--fase': `${globo.fase}ms`,
              '--color': `var(--globo-${globo.color})`,
              // Los de adelante tapan a los de atrás; el orden lo fija el
              // tamaño, así el más grande se lee como el más cercano.
              zIndex: Math.round(globo.escala * 100),
            } as React.CSSProperties
          }
        >
          <span className="globo-bamboleo">
            <Globo brillo={`brillo-${posicion}`} />
          </span>
        </span>
      ))}
    </div>
  );
}

/**
 * Un globo: cuerpo, nudo, hilo y el brillo de la luz.
 *
 * El color entra por `--color` en vez de una prop, para que el CSS lo pueda
 * resolver con `light-dark()`: en tema oscuro los tres bajan a tonos apagados,
 * porque un color pleno sobre el fondo casi negro, en una oficina vacía de
 * noche, quema.
 */
function Globo({ brillo }: { brillo: string }) {
  return (
    <svg viewBox="0 0 60 104" className="block w-full" focusable="false">
      <defs>
        {/* El brillo no es un blanco plano: se apaga hacia el borde, que es
            lo que hace que se lea como látex y no como una calcomanía. */}
        <radialGradient id={brillo} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* El hilo primero, para que el nudo lo tape donde nace. */}
      <path
        d="M30 72c5 6 0 10 0 14s-5 8 0 14"
        fill="none"
        stroke="var(--color)"
        strokeWidth="1.6"
        strokeLinecap="round"
        opacity="0.45"
      />
      <path d="M30 64l-4.5 9h9z" fill="var(--color)" />
      <ellipse cx="30" cy="34" rx="26" ry="32" fill="var(--color)" />
      <ellipse cx="20" cy="21" rx="8" ry="11" fill={`url(#${brillo})`} transform="rotate(-24 20 21)" />
    </svg>
  );
}
