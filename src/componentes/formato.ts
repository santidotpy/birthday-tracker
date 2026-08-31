import type { FechaSimple } from '../domain/fechas.js';

/**
 * Formatea en UTC a propósito: la FechaSimple ya es un día de calendario
 * argentino resuelto, y volver a pasarla por la zona del navegador la correría
 * un día para quien mire desde otro huso.
 */
function comoDate(fecha: FechaSimple): Date {
  return new Date(Date.UTC(fecha.anio, fecha.mes - 1, fecha.dia));
}

const largo = new Intl.DateTimeFormat('es-AR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  timeZone: 'UTC',
});

const corto = new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'long', timeZone: 'UTC' });

export const fechaLarga = (fecha: FechaSimple) => largo.format(comoDate(fecha));
export const fechaCorta = (fecha: FechaSimple) => corto.format(comoDate(fecha));

/** Para el atributo `datetime` y para las URLs: siempre YYYY-MM-DD. */
export function comoISO(fecha: FechaSimple): string {
  const mes = String(fecha.mes).padStart(2, '0');
  const dia = String(fecha.dia).padStart(2, '0');
  return `${fecha.anio}-${mes}-${dia}`;
}

/** "en 6 días", "mañana", "hoy". */
export function enCuantosDias(dias: number): string {
  if (dias === 0) return 'hoy';
  if (dias === 1) return 'mañana';
  return `en ${dias} días`;
}

/** Une nombres con comas y una "y" al final: "Ana, Bruno y Caro". */
export function unirNombres(nombres: string[]): string {
  if (nombres.length <= 1) return nombres[0] ?? '';
  return `${nombres.slice(0, -1).join(', ')} y ${nombres[nombres.length - 1]}`;
}
