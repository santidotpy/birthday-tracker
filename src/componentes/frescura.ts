import { useRouter } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import {
  type FechaSimple,
  hoyEnArgentina,
  mismaFecha,
  msHastaProximaMedianoche,
} from '../domain/fechas.js';

/**
 * Frescura de una pestaña que nadie toca.
 *
 * La app está pensada para quedar abierta días —y en algún momento, meses, en
 * una TV de la oficina—. Sin esto, la pestaña que dejaste abierta anoche te
 * muestra el cumpleaños de ayer, y no se entera de que el Administrador cargó
 * a alguien nuevo.
 */

/** Margen para no leer el día anterior si el reloj despierta justo en el límite. */
const MARGEN_MS = 1_000;

/** Cada media hora. Los datos cambian pocas veces al año; esto es de sobra. */
const INTERVALO_DE_DATOS_MS = 30 * 60 * 1_000;

/**
 * Hoy en Argentina, recalculado solo al cruzar la medianoche.
 *
 * No alcanza con el temporizador: los navegadores estrangulan los timers en
 * pestañas de fondo y una máquina que se suspende los despierta tarde. Por eso
 * también se revisa cada vez que la pestaña vuelve a estar visible, y cada
 * revisión se hace contra el reloj en vez de confiar en cuándo disparó.
 */
export function useHoyEnArgentina(): FechaSimple {
  const [hoy, setHoy] = useState(hoyEnArgentina);

  useEffect(() => {
    let temporizador: ReturnType<typeof setTimeout>;

    function revisar() {
      // Devolver el anterior cuando no cambió evita re-renderizar de más.
      setHoy((anterior) => {
        const ahora = hoyEnArgentina();
        return mismaFecha(anterior, ahora) ? anterior : ahora;
      });
      programar();
    }

    function programar() {
      clearTimeout(temporizador);
      temporizador = setTimeout(revisar, msHastaProximaMedianoche() + MARGEN_MS);
    }

    function alVolver() {
      if (document.visibilityState === 'visible') revisar();
    }

    programar();
    document.addEventListener('visibilitychange', alVolver);
    window.addEventListener('focus', alVolver);

    return () => {
      clearTimeout(temporizador);
      document.removeEventListener('visibilitychange', alVolver);
      window.removeEventListener('focus', alVolver);
    };
  }, []);

  return hoy;
}

/**
 * Vuelve a pedir los Integrantes cada tanto y cuando la pestaña vuelve al
 * frente, para que un alta del Administrador aparezca sin que nadie recargue.
 *
 * El intervalo existe por la TV: una pantalla que nadie toca nunca dispara
 * `focus` ni `visibilitychange`, así que sin él se quedaría con los datos del
 * día que se encendió.
 */
export function useDatosFrescos(): void {
  const router = useRouter();

  useEffect(() => {
    function refrescar() {
      void router.invalidate();
    }

    function alVolver() {
      if (document.visibilityState === 'visible') refrescar();
    }

    const intervalo = setInterval(refrescar, INTERVALO_DE_DATOS_MS);
    document.addEventListener('visibilitychange', alVolver);
    window.addEventListener('focus', alVolver);

    return () => {
      clearInterval(intervalo);
      document.removeEventListener('visibilitychange', alVolver);
      window.removeEventListener('focus', alVolver);
    };
  }, [router]);
}
