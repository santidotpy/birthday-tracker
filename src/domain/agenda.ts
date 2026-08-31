/**
 * Agenda y Próximo cumpleaños. Ver `CONTEXT.md` para el vocabulario.
 *
 * La diferencia clave entre las dos consultas de este archivo:
 * la Agenda incluye Hoy (quien cumple hoy encabeza la lista) y el Próximo
 * cumpleaños no (siempre mira hacia adelante, aunque hoy haya cumple).
 */

import {
  type FechaSimple,
  type MesDia,
  compararFechas,
  diasEntre,
  mismaFecha,
  ocurrenciaEn,
  proximaOcurrenciaEstricta,
  proximaOcurrenciaInclusiva,
} from './fechas.js';

export interface Integrante {
  readonly id: string;
  readonly nombre: string;
  readonly fechaDeCumpleanos: MesDia;
  /** Retrato: copia que guarda la app, no una URL externa. Ver ADR 0001. */
  readonly retrato?: string | null;
  /** Decorativo. No entra en el cálculo de fechas. Ver ADR 0003. */
  readonly pais?: string | null;
  readonly archivado?: boolean;
}

/** Una fecha de la Agenda con todos los que cumplen ese día. */
export interface EntradaDeAgenda {
  readonly fecha: FechaSimple;
  /** Días desde la fecha de referencia. 0 significa hoy. */
  readonly dias: number;
  /** Más de uno cuando comparten fecha. Ordenados por nombre. */
  readonly integrantes: readonly Integrante[];
}

function activos(integrantes: readonly Integrante[]): Integrante[] {
  return integrantes.filter((i) => !i.archivado);
}

function porNombre(a: Integrante, b: Integrante): number {
  return a.nombre.localeCompare(b.nombre, 'es');
}

/**
 * Los Cumpleañeros de una fecha. Puede haber más de uno.
 * En un año no bisiesto, un 29/02 y un 01/03 caen juntos el 01/03.
 */
export function cumpleanerosEn(
  integrantes: readonly Integrante[],
  fecha: FechaSimple,
): Integrante[] {
  return activos(integrantes)
    .filter((i) => mismaFecha(ocurrenciaEn(i.fechaDeCumpleanos, fecha.anio), fecha))
    .sort(porNombre);
}

function agrupar(
  integrantes: readonly Integrante[],
  desde: FechaSimple,
  ocurrencia: (md: MesDia, desde: FechaSimple) => FechaSimple,
): EntradaDeAgenda[] {
  const porFecha = new Map<string, { fecha: FechaSimple; integrantes: Integrante[] }>();

  for (const integrante of activos(integrantes)) {
    const fecha = ocurrencia(integrante.fechaDeCumpleanos, desde);
    const clave = `${fecha.anio}-${fecha.mes}-${fecha.dia}`;
    const grupo = porFecha.get(clave);
    if (grupo) grupo.integrantes.push(integrante);
    else porFecha.set(clave, { fecha, integrantes: [integrante] });
  }

  return [...porFecha.values()]
    .sort((a, b) => compararFechas(a.fecha, b.fecha))
    .map(({ fecha, integrantes: delDia }) => ({
      fecha,
      dias: diasEntre(desde, fecha),
      integrantes: delDia.sort(porNombre),
    }));
}

/**
 * La Agenda: todos los Integrantes ordenados desde `desde` hacia adelante,
 * dando la vuelta al año. Incluye la propia fecha `desde`.
 */
export function agenda(
  integrantes: readonly Integrante[],
  desde: FechaSimple,
): EntradaDeAgenda[] {
  return agrupar(integrantes, desde, proximaOcurrenciaInclusiva);
}

/**
 * El Próximo cumpleaños: la primera Ocurrencia estrictamente posterior a
 * `desde`. Devuelve `null` si no hay Integrantes activos.
 */
export function proximoCumpleanos(
  integrantes: readonly Integrante[],
  desde: FechaSimple,
): EntradaDeAgenda | null {
  return agrupar(integrantes, desde, proximaOcurrenciaEstricta)[0] ?? null;
}
