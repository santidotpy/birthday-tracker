import confetti from 'canvas-confetti';
import { useEffect } from 'react';

/**
 * Lo que tarda el Retrato en terminar de entrar, de `estilos.css`.
 *
 * Lo comparte con los Globos, que salen en el mismo instante. Separados aunque
 * sea por poco se leen como dos eventos sueltos en vez de uno solo.
 */
export const RETRASO_DEL_FESTEJO_MS = 320;

interface Props {
  /** Cambiar esta clave vuelve a disparar. Sirve para el cruce de medianoche. */
  clave: string;
}

/**
 * Una sola ráfaga al entrar, y nada más.
 *
 * Nada de confeti continuo: cuando esto viva en una TV prendida ocho horas,
 * sería agotador de mirar y estaría quemando CPU todo el día para nada.
 */
export function Confetti({ clave }: Props) {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    // Espera a que el Retrato esté casi entero. Disparado en el mismo instante
    // en que la pantalla empieza a aparecer, el confeti sale antes que la
    // persona y se leen como dos eventos sueltos; esperando, se lee como uno.
    const id = setTimeout(() => {
      // Dos orígenes a la vez se leen como un solo evento, no como dos.
      const comun = { particleCount: 70, spread: 70, startVelocity: 45, ticks: 260 };
      confetti({ ...comun, origin: { x: 0.1, y: 0.75 }, angle: 60 });
      confetti({ ...comun, origin: { x: 0.9, y: 0.75 }, angle: 120 });
    }, RETRASO_DEL_FESTEJO_MS);

    return () => {
      clearTimeout(id);
      confetti.reset();
    };
  }, [clave]);

  return null;
}
