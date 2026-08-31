/**
 * El respaldo cuando un Integrante no tiene Retrato: sus iniciales sobre un
 * color derivado del nombre.
 *
 * El color sale de una paleta fija, no de un hue calculado. Un hue libre con
 * luminosidad fija parece buena idea y no lo es: a igual L, un amarillo es
 * mucho más claro que un azul, y el texto blanco encima queda ilegible en
 * media rueda de color. La paleta está elegida para que todos sus colores
 * pasen contraste AA contra blanco, y hay un test que lo verifica.
 */

/** Colores de respaldo. Todos con contraste >= 4.5:1 contra texto blanco. */
export const PALETA = [
  '#b3261e',
  '#a03e00',
  '#6d5100',
  '#2e6b32',
  '#00695c',
  '#01579b',
  '#303f9f',
  '#5e35b1',
  '#ad1457',
  '#4e342e',
] as const;

export type ColorDeRespaldo = (typeof PALETA)[number];

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
