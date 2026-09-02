import { useEffect, useState } from 'react';
import { type FechaSimple, msHastaInicioDe } from '../domain/fechas.js';

interface Props {
  hasta: FechaSimple;
}

function partes(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  return {
    dias: Math.floor(total / 86_400),
    horas: Math.floor((total % 86_400) / 3600),
    minutos: Math.floor((total % 3600) / 60),
    segundos: total % 60,
  };
}

const dosDigitos = (n: number) => String(n).padStart(2, '0');

/**
 * Cuenta regresiva hasta el arranque de un día en Argentina.
 *
 * Recalcula contra el reloj en cada tick en vez de restarle uno a un contador:
 * los navegadores estrangulan los intervalos en pestañas de fondo, y un
 * contador que se decrementa se desincroniza sin que nadie se entere.
 *
 * Los números llevan `suppressHydrationWarning` porque son la hora: el
 * servidor los pinta en un segundo y el navegador hidrata en el siguiente, así
 * que **nunca** van a coincidir. Sin esto, React daba la hidratación por
 * fallida y volvía a construir toda la pantalla en el cliente, dejando una
 * ventana en la que los clics no hacían nada —tocar "Ver todos los
 * cumpleaños" en ese momento no abría nada—. El primer tick corrige el valor
 * a los milisegundos, así que lo único que se "acepta" es un segundo viejo.
 */
export function CuentaRegresiva({ hasta }: Props) {
  const [ms, setMs] = useState(() => msHastaInicioDe(hasta));

  useEffect(() => {
    setMs(msHastaInicioDe(hasta));
    const id = setInterval(() => setMs(msHastaInicioDe(hasta)), 1000);
    return () => clearInterval(id);
  }, [hasta]);

  const { dias, horas, minutos, segundos } = partes(ms);

  return (
    // `tabular-nums` evita que el ancho baile al contar. Sin transiciones:
    // los dígitos cambian una vez por segundo y animarlos los haría ilegibles.
    <p className="m-0 flex items-baseline gap-2 tabular-nums 2xl:gap-4" role="timer">
      {dias > 0 && (
        <>
          <span
            className="text-4xl font-bold tracking-tight sm:text-6xl sm:tracking-[-0.035em] 2xl:text-8xl 2xl:tracking-[-0.04em]"
            suppressHydrationWarning
          >
            {dias}
          </span>
          <span className="text-muted-foreground sm:text-lg 2xl:text-2xl">
            {dias === 1 ? 'día' : 'días'}
          </span>
        </>
      )}
      <span
        className="text-3xl font-semibold tracking-tight sm:text-5xl sm:tracking-[-0.03em] 2xl:text-7xl 2xl:tracking-[-0.035em]"
        suppressHydrationWarning
      >
        {dosDigitos(horas)}:{dosDigitos(minutos)}:{dosDigitos(segundos)}
      </span>
    </p>
  );
}
