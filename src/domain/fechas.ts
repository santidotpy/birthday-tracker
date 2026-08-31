/**
 * Núcleo de fechas. Ver `CONTEXT.md` para el vocabulario y
 * `docs/adr/0003-fechas-en-horario-de-argentina.md` para por qué todo se
 * evalúa en Argentina.
 *
 * Regla que sostiene este archivo: una Fecha de cumpleaños no es un instante.
 * `Date` solo aparece en el borde que traduce entre instante y día de
 * calendario, nunca en la aritmética.
 *
 * Los identificadores van sin eñes ni acentos por comodidad de tipeo; los
 * términos completos viven en el glosario.
 */

/** Zona en la que se evalúa todo. No hacer configurable sin leer el ADR 0003. */
export const ZONA = 'America/Argentina/Buenos_Aires';

/** Una Fecha de cumpleaños: día y mes, sin año. */
export interface MesDia {
  readonly mes: number; // 1-12
  readonly dia: number; // 1-31
}

/** Un día de calendario. Sin hora y sin zona: no es un instante. */
export interface FechaSimple {
  readonly anio: number;
  readonly mes: number; // 1-12
  readonly dia: number; // 1-31
}

const DIAS_POR_MES = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31] as const;

export function esBisiesto(anio: number): boolean {
  return (anio % 4 === 0 && anio % 100 !== 0) || anio % 400 === 0;
}

export function diasDelMes(anio: number, mes: number): number {
  if (mes === 2 && esBisiesto(anio)) return 29;
  return DIAS_POR_MES[mes - 1]!;
}

/** Valida que un día-mes pueda existir en algún año. El 29/02 es válido. */
export function esMesDiaValido(md: MesDia): boolean {
  if (!Number.isInteger(md.mes) || md.mes < 1 || md.mes > 12) return false;
  if (!Number.isInteger(md.dia) || md.dia < 1) return false;
  const maximo = md.mes === 2 ? 29 : DIAS_POR_MES[md.mes - 1]!;
  return md.dia <= maximo;
}

/**
 * La Ocurrencia de una Fecha de cumpleaños en un año concreto.
 * El 29/02 se observa el 01/03 en años no bisiestos.
 */
export function ocurrenciaEn(md: MesDia, anio: number): FechaSimple {
  if (md.mes === 2 && md.dia === 29 && !esBisiesto(anio)) {
    return { anio, mes: 3, dia: 1 };
  }
  return { anio, mes: md.mes, dia: md.dia };
}

export function compararFechas(a: FechaSimple, b: FechaSimple): number {
  return a.anio - b.anio || a.mes - b.mes || a.dia - b.dia;
}

export function mismaFecha(a: FechaSimple, b: FechaSimple): boolean {
  return compararFechas(a, b) === 0;
}

/**
 * La primera Ocurrencia posterior o igual a `desde`.
 * Es la que usa la Agenda: si alguien cumple hoy, aparece hoy.
 */
export function proximaOcurrenciaInclusiva(md: MesDia, desde: FechaSimple): FechaSimple {
  const esteAnio = ocurrenciaEn(md, desde.anio);
  if (compararFechas(esteAnio, desde) >= 0) return esteAnio;
  return ocurrenciaEn(md, desde.anio + 1);
}

/**
 * La primera Ocurrencia estrictamente posterior a `desde`.
 * Es la definición de Próximo cumpleaños: nunca incluye la fecha que se mira,
 * así que el texto chico siempre apunta hacia adelante aunque hoy haya cumple.
 */
export function proximaOcurrenciaEstricta(md: MesDia, desde: FechaSimple): FechaSimple {
  const esteAnio = ocurrenciaEn(md, desde.anio);
  if (compararFechas(esteAnio, desde) > 0) return esteAnio;
  return ocurrenciaEn(md, desde.anio + 1);
}

function aDiasEpoch(f: FechaSimple): number {
  return Math.floor(Date.UTC(f.anio, f.mes - 1, f.dia) / 86_400_000);
}

/** Días de calendario entre dos fechas. Positivo si `b` es posterior. */
export function diasEntre(a: FechaSimple, b: FechaSimple): number {
  return aDiasEpoch(b) - aDiasEpoch(a);
}

// --- Borde entre instante y día de calendario -------------------------------
// Único lugar del dominio donde existe `Date`. `Intl` resuelve la zona con la
// base de datos tz del runtime, así que un cambio de huso en Argentina se
// aplica solo sin tocar este código.

const FORMATO_ZONA = new Intl.DateTimeFormat('en-US', {
  timeZone: ZONA,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23', // sin esto, la medianoche puede formatearse como hora 24
});

function partesEnZona(ms: number) {
  const partes = FORMATO_ZONA.formatToParts(new Date(ms));
  const leer = (tipo: string) => Number(partes.find((p) => p.type === tipo)!.value);
  return {
    anio: leer('year'),
    mes: leer('month'),
    dia: leer('day'),
    hora: leer('hour'),
    minuto: leer('minute'),
    segundo: leer('second'),
  };
}

/** Desfasaje de la zona respecto de UTC, en ms, para un instante dado. */
function desfasajeMs(ms: number): number {
  const p = partesEnZona(ms);
  const comoSiFueraUTC = Date.UTC(p.anio, p.mes - 1, p.dia, p.hora, p.minuto, p.segundo);
  return comoSiFueraUTC - Math.floor(ms / 1000) * 1000;
}

/** El día de calendario que corre en Argentina en un instante dado. */
export function hoyEnArgentina(ahora: Date = new Date()): FechaSimple {
  const { anio, mes, dia } = partesEnZona(ahora.getTime());
  return { anio, mes, dia };
}

/**
 * El instante en que arranca un día de calendario en Argentina.
 * Dos pasadas: la primera estima con el desfasaje de la medianoche UTC, la
 * segunda corrige si ese día el desfasaje era otro. Argentina hoy no tiene
 * horario de verano, pero lo tuvo y podría volver a tenerlo.
 */
export function inicioDelDiaEnArgentina(f: FechaSimple): number {
  const medianocheUTC = Date.UTC(f.anio, f.mes - 1, f.dia, 0, 0, 0);
  const estimado = medianocheUTC - desfasajeMs(medianocheUTC);
  return medianocheUTC - desfasajeMs(estimado);
}

/** Milisegundos hasta que arranque un día de calendario. Alimenta la cuenta regresiva. */
export function msHastaInicioDe(f: FechaSimple, ahora: Date = new Date()): number {
  return inicioDelDiaEnArgentina(f) - ahora.getTime();
}

/** Milisegundos hasta la próxima medianoche argentina. Refresca la pestaña abierta. */
export function msHastaProximaMedianoche(ahora: Date = new Date()): number {
  const hoy = hoyEnArgentina(ahora);
  const manana = ocurrenciaSiguienteDia(hoy);
  return msHastaInicioDe(manana, ahora);
}

function ocurrenciaSiguienteDia(f: FechaSimple): FechaSimple {
  if (f.dia < diasDelMes(f.anio, f.mes)) return { anio: f.anio, mes: f.mes, dia: f.dia + 1 };
  if (f.mes < 12) return { anio: f.anio, mes: f.mes + 1, dia: 1 };
  return { anio: f.anio + 1, mes: 1, dia: 1 };
}

/**
 * Parsea un `YYYY-MM-DD` de la URL. Devuelve `null` si no es un día real:
 * rechaza el 2027-02-29 y acepta el 2028-02-29.
 */
export function parsearFechaISO(texto: string): FechaSimple | null {
  const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(texto);
  if (!partes) return null;
  const [anio, mes, dia] = [Number(partes[1]), Number(partes[2]), Number(partes[3])];
  if (mes < 1 || mes > 12) return null;
  if (dia < 1 || dia > diasDelMes(anio, mes)) return null;
  return { anio, mes, dia };
}
