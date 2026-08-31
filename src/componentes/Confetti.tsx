import confetti from 'canvas-confetti';
import { useEffect } from 'react';

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

    // Dos orígenes a la vez se leen como un solo evento, no como dos.
    const comun = { particleCount: 70, spread: 70, startVelocity: 45, ticks: 260 };
    confetti({ ...comun, origin: { x: 0.1, y: 0.75 }, angle: 60 });
    confetti({ ...comun, origin: { x: 0.9, y: 0.75 }, angle: 120 });

    return () => {
      confetti.reset();
    };
  }, [clave]);

  return null;
}
