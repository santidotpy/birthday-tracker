import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ProveedorDeTema } from '../tema/contexto.js';
import { type Tema, TEMAS } from '../tema/tema.js';
import { SelectorDeTema } from './SelectorDeTema.js';

function dibujar(tema: Tema, compacto = false): string {
  return renderToStaticMarkup(
    <ProveedorDeTema inicial={tema}>
      <SelectorDeTema compacto={compacto} />
    </ProveedorDeTema>,
  );
}

/**
 * Base UI no publica el `value` en el DOM: la opción activa se reconoce por
 * `aria-pressed`, que es también lo que lee un lector de pantalla.
 */
function opciones(html: string): { etiqueta: string; marcada: boolean }[] {
  return html
    .split('<button')
    .slice(1)
    .map((boton) => ({
      // El texto va después del icono; en compacto no hay texto y queda el aria-label.
      etiqueta: (boton.match(/<\/svg>([^<]+)/)?.[1] ?? boton.match(/aria-label="([^"]+)"/)?.[1] ?? '').trim(),
      marcada: boton.includes('aria-pressed="true"'),
    }));
}

/**
 * El grupo de Base UI toma el valor como arreglo, no como string. Cuando eso
 * se equivoca no falla nada: se dibuja un control con las tres opciones
 * apagadas y parece que no hay tema puesto. Ya nos pasó con el Select.
 */
describe('SelectorDeTema', () => {
  it('marca el tema actual, y solo ese', () => {
    const etiquetas: Record<Tema, string> = {
      sistema: 'Sistema',
      claro: 'Claro',
      oscuro: 'Oscuro',
    };

    for (const tema of TEMAS) {
      const marcadas = opciones(dibujar(tema)).filter((o) => o.marcada);
      expect(marcadas.map((o) => o.etiqueta), `con tema ${tema}`).toEqual([etiquetas[tema]]);
    }
  });

  it('ofrece los tres temas en orden', () => {
    expect(opciones(dibujar('sistema')).map((o) => o.etiqueta)).toEqual([
      'Sistema',
      'Claro',
      'Oscuro',
    ]);
  });

  it('compacto esconde el texto pero conserva el nombre accesible', () => {
    const html = dibujar('oscuro', true);
    expect(html).not.toContain('>Oscuro<');
    expect(opciones(html).map((o) => o.etiqueta)).toEqual(['Sistema', 'Claro', 'Oscuro']);
    expect(opciones(html).filter((o) => o.marcada).map((o) => o.etiqueta)).toEqual(['Oscuro']);
  });

  it('el grupo tiene nombre propio', () => {
    expect(dibujar('sistema')).toContain('aria-label="Tema"');
  });
});
