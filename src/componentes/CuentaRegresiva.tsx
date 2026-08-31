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
    <p className="cuenta-regresiva" role="timer">
      {dias > 0 && (
        <>
          <span className="cuenta-numero">{dias}</span>
          <span className="cuenta-unidad">{dias === 1 ? 'día' : 'días'}</span>
        </>
      )}
      <span className="cuenta-reloj">
        {dosDigitos(horas)}:{dosDigitos(minutos)}:{dosDigitos(segundos)}
      </span>
    </p>
  );
}
