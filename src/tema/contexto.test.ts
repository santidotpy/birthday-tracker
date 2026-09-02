import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * Guardas del cambio de tema, que necesita un navegador para verse.
 *
 * Lo que fijan es un arreglo que parece de más: apagar las transiciones de cada
 * elemento mientras el documento cruza. Sin eso los componentes de shadcn
 * —`transition-colors`, y el panel del diálogo con `transition: all 200ms`—
 * interpolan por su cuenta y terminan **después** del crossfade, así que el
 * diálogo se oscurece por partes en vez de todo junto.
 *
 * Medido en el navegador antes del arreglo: el fondo cambiaba en un cuadro y el
 * panel del diálogo tardaba 200ms, pasando por un gris que no existe en ninguno
 * de los dos temas. Después: un solo cuadro para todo.
 */
const contexto = readFileSync(new URL('./contexto.tsx', import.meta.url), 'utf8');
const estilos = readFileSync(new URL('../estilos.css', import.meta.url), 'utf8');

describe('el cruce de tema', () => {
  it('apaga las transiciones mientras dura', () => {
    const regla = estilos.match(/:root\.cambiando-tema \*[\s\S]{0,160}?\}/)?.[0] ?? '';
    expect(regla, 'falta la regla que apaga las transiciones durante el cruce').toContain(
      'transition: none !important',
    );
  });

  it('pone la clase antes de empezar', () => {
    // Antes, no adentro del callback: la captura del estado viejo tiene que
    // salir con las transiciones ya apagadas.
    const antesDeCruzar = contexto.slice(0, contexto.indexOf('startViewTransition'));
    expect(antesDeCruzar).toContain("classList.add('cambiando-tema')");
  });

  it('la saca por los dos caminos', () => {
    // Uno es el del navegador con `startViewTransition`; el otro, el respaldo.
    // Si queda puesta, la app se queda sin transiciones para siempre.
    const salidas = contexto.match(/classList\.remove\('cambiando-tema'\)/g) ?? [];
    expect(salidas.length, 'la clase se saca en el camino con cruce y en el de respaldo').toBe(2);
  });

  it('tolera que el cruce se saltee', () => {
    // `finished` rechaza si otro cambio de tema lo interrumpe. Sin atajarlo hay
    // un rechazo sin manejar en la consola, y encima la clase se quedaría.
    expect(contexto).toMatch(/finished[\s\S]{0,200}catch/);
  });
});
