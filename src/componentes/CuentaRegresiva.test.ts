import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * Guarda de regresión para un bug que ningún test de render puede ver.
 *
 * La cuenta regresiva es la hora: el servidor la pinta en un segundo y el
 * navegador hidrata en el siguiente, así que los dígitos nunca coinciden. Sin
 * `suppressHydrationWarning`, React daba la hidratación por fallida y volvía a
 * construir toda la pantalla en el cliente; en esa ventana los clics no hacían
 * nada y "Ver todos los cumpleaños" no abría.
 *
 * Eso no se ve con `renderToStaticMarkup` —no hay hidratación— ni deja rastro
 * en el HTML, porque `suppressHydrationWarning` es una prop de React y no un
 * atributo. Lo único que se puede verificar sin un navegador es que la prop
 * siga puesta, así que el test mira el archivo.
 */
describe('la cuenta regresiva', () => {
  const fuente = readFileSync(new URL('./CuentaRegresiva.tsx', import.meta.url), 'utf8');

  it('marca los dígitos para que React no falle la hidratación', () => {
    // Sólo la prop en el JSX, cada una en su renglón: el comentario de arriba
    // del componente también la nombra y no cuenta.
    const marcas = fuente.match(/^\s+suppressHydrationWarning$/gm) ?? [];
    expect(
      marcas.length,
      'faltan `suppressHydrationWarning` en los números que dependen del reloj',
    ).toBe(2);
  });
});
