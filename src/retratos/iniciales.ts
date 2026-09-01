/**
 * El respaldo cuando un Integrante no tiene Retrato: sus iniciales sobre un
 * color derivado del nombre.
 *
 * El color sale de una paleta fija, no de un hue calculado. Un hue libre con
 * luminosidad fija parece buena idea y no lo es: a igual L, un amarillo es
 * mucho más claro que un azul, y el texto encima queda ilegible en media
 * rueda de color. La paleta está elegida a mano y hay un test que la verifica.
 *
 * Cada color es un par, uno por tema. En claro, el fondo va oscuro y la tinta
 * blanca; en oscuro se da vuelta: fondo claro y tinta oscura. Si se usara la
 * misma paleta en los dos, en tema oscuro un `#4e342e` sobre un fondo
 * `#14100e` sería una mancha oscura sobre fondo oscuro y el círculo del
 * Retrato desaparecería. Los dos colores de un par son el mismo tono, así que
 * la persona conserva su color entre temas.
 *
 * Quién elige cuál: `light-dark()` en el CSS, no una rama en JS. El tema puede
 * estar en "sistema", que el servidor no puede saber al renderizar; el
 * navegador sí, y lo resuelve sin que haya nada que hidratar.
 */

/** El texto que va encima del color de respaldo, uno por tema. */
/** Espejadas en la clase `.respaldo` de `estilos.css`. */
export const TINTA_CLARA = '#ffffff';
export const TINTA_OSCURA = '#1a1614';

export interface ColorDeRespaldo {
  /** Fondo en tema claro. Lleva `TINTA_CLARA` encima. */
  claro: string;
  /** Fondo en tema oscuro. Lleva `TINTA_OSCURA` encima. */
  oscuro: string;
}

/**
 * Los diez tonos. El orden importa: es el que indexa el hash del nombre, así
 * que reordenarlos le cambia el color a todo el mundo.
 */
export const PALETA: readonly ColorDeRespaldo[] = [
  { claro: '#b3261e', oscuro: '#ffb3ab' }, // rojo
  { claro: '#a03e00', oscuro: '#ffc08a' }, // naranja
  { claro: '#6d5100', oscuro: '#e3c765' }, // mostaza
  { claro: '#2e6b32', oscuro: '#9fd8a3' }, // verde
  { claro: '#00695c', oscuro: '#7fd4c6' }, // teal
  { claro: '#01579b', oscuro: '#93c9f5' }, // azul
  { claro: '#303f9f', oscuro: '#b0b8ef' }, // índigo
  { claro: '#5e35b1', oscuro: '#cbb2f0' }, // violeta
  { claro: '#ad1457', oscuro: '#ffa3c4' }, // fucsia
  { claro: '#4e342e', oscuro: '#d3b8b0' }, // marrón
];

/**
 * Iniciales de un nombre: la primera letra del primer nombre y la del último.
 * Un nombre solo da una sola inicial.
 */
export function iniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return '?';
  const primera = [...partes[0]!][0] ?? '';
  if (partes.length === 1) return primera.toUpperCase();
  const ultima = [...partes[partes.length - 1]!][0] ?? '';
  return (primera + ultima).toUpperCase();
}

/** Hash FNV-1a. Estable entre corridas y entre procesos, a diferencia de un Math.random. */
function hash(texto: string): number {
  let h = 0x811c9dc5;
  for (const caracter of texto) {
    h ^= caracter.codePointAt(0)!;
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}

/**
 * El color de respaldo de un nombre. Determinista: el mismo nombre da siempre
 * el mismo color, sin guardar nada. Ignora mayúsculas y espacios de más para
 * que corregir el tipeo de un nombre no le cambie el color a la persona.
 */
export function colorDeNombre(nombre: string): ColorDeRespaldo {
  const normalizado = nombre.trim().toLowerCase().replace(/\s+/g, ' ');
  return PALETA[hash(normalizado) % PALETA.length]!;
}

/**
 * Las variables CSS del respaldo de un nombre, para poner en un `style`.
 *
 * Devuelve el par crudo y no un color resuelto porque quién gana lo decide
 * `light-dark()` en `estilos.css`: el tema puede estar en "sistema", que el
 * servidor no puede saber al renderizar. El navegador sí, y lo resuelve sin
 * que haya nada que hidratar.
 */
export function variablesDeRespaldo(nombre: string): Record<string, string> {
  const color = colorDeNombre(nombre);
  return { '--respaldo-claro': color.claro, '--respaldo-oscuro': color.oscuro };
}
