import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Globos } from './Globos.js';

/**
 * El archivo sin comentarios. Los comentarios de `Globos.tsx` nombran justo lo
 * que estos tests prohíben —explican por qué no está— y contra el texto crudo
 * la prohibición se disparaba sola.
 */
const fuente = readFileSync(new URL('./Globos.tsx', import.meta.url), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');

describe('los Globos', () => {
  it('no pinta ninguno en el servidor', () => {
    // Es la mitad del diseño del componente, no un detalle: si el servidor
    // pintara Globos, habría que decidir en el servidor si el que mira pidió
    // movimiento reducido —que no se puede saber— y el HTML sería distinto del
    // que el navegador espera al hidratar. Naciendo vacío, las dos cosas se
    // resuelven en el único lugar donde hay respuesta.
    expect(renderToStaticMarkup(<Globos clave="2026-08-28" />)).toBe('');
  });

  it('se cancela con movimiento reducido', () => {
    // Un objeto grande cruzando toda la pantalla es exactamente el movimiento
    // que el ajuste pide sacar; a diferencia del resto de la app, acá no hay
    // versión atenuada que valga. Sin navegador esto no se puede ejercitar.
    expect(fuente).toContain("matchMedia('(prefers-reduced-motion: reduce)').matches");
  });

  it('no usa azar, que rompería la hidratación', () => {
    // La configuración está escrita a mano por esto. `Math.random()` en el
    // render da un HTML en el servidor y otro en el navegador, y React da la
    // hidratación por fallida: el mismo bug que dejaba la pantalla sin clics
    // (ver `CuentaRegresiva.test.ts`).
    expect(fuente).not.toContain('Math.random');
  });
});

describe('la tanda de Globos', () => {
  /** Las filas de `GLOBOS`, leídas del archivo: no se exportan a propósito. */
  const globos = [...fuente.matchAll(/^ {2}\{ x: .+$/gm)].map(([fila]) => fila);

  it('tiene seis', () => {
    expect(globos).toHaveLength(6);
  });

  it('no repite duraciones de subida', () => {
    // Dos duraciones iguales suben en formación y se lee como una animación,
    // no como varios globos sueltos.
    const subidas = globos.map((fila) => fila.match(/subida: ([\d.]+)/)?.[1]);
    expect(new Set(subidas).size).toBe(globos.length);
  });

  it('no repite períodos de bamboleo', () => {
    const bamboleos = globos.map((fila) => fila.match(/bamboleo: ([\d.]+)/)?.[1]);
    expect(new Set(bamboleos).size).toBe(globos.length);
  });

  it('no pone dos del mismo color pegados', () => {
    const colores = globos.map((fila) => fila.match(/color: '(\w)'/)?.[1]);
    for (let i = 1; i < colores.length; i++) {
      expect(colores[i], `los globos ${i} y ${i + 1} salen del mismo color`).not.toBe(
        colores[i - 1],
      );
    }
  });

  it('les da tiempo a todos de terminar antes de bajarlos', () => {
    // `DURACION_MS` desmonta la tanda. Si se acorta por debajo del más lento,
    // los últimos Globos se cortan en el aire, a mitad de pantalla.
    const masLento = Math.max(
      ...globos.map((fila) => {
        const subida = Number(fila.match(/subida: ([\d.]+)/)?.[1]) * 1_000;
        const salida = Number(fila.match(/salida: (\d+)/)?.[1]);
        return subida + salida;
      }),
    );
    const duracion = Number(fuente.match(/const DURACION_MS = ([\d_]+)/)?.[1]?.replace(/_/g, ''));
    const retraso = 320; // `RETRASO_DEL_FESTEJO_MS`, de `Confetti.tsx`.

    expect(duracion).toBeGreaterThan(masLento + retraso);
  });
});
