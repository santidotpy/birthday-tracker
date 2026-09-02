import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { Integrante } from '../domain/agenda.js';
import type { FechaSimple } from '../domain/fechas.js';
import { PantallaDeCumpleanos } from './PantallaDeCumpleanos.js';

const FRANCO: Integrante = {
  id: 'f',
  nombre: 'Franco Macello',
  fechaDeCumpleanos: { mes: 8, dia: 28 },
  area: 'Control de Gestión',
};

const DIEGO: Integrante = {
  id: 'd',
  nombre: 'Diego Funes',
  fechaDeCumpleanos: { mes: 12, dia: 25 },
};

const EL_CUMPLE: FechaSimple = { anio: 2026, mes: 8, dia: 28 };

function dibujar(fecha: FechaSimple, esHoy: boolean): string {
  return renderToStaticMarkup(
    <PantallaDeCumpleanos integrantes={[FRANCO, DIEGO]} fecha={fecha} esHoy={esHoy} />,
  );
}

/** Sin las etiquetas, para poder buscar frases que llevan `<span>` en el medio. */
function texto(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&#x27;/g, "'")
    .replace(/\s+/g, ' ');
}

describe('la pantalla de un cumpleaños', () => {
  it('saluda cuando es hoy', () => {
    expect(texto(dibujar(EL_CUMPLE, true))).toContain('¡Feliz cumpleaños, Franco Macello!');
  });

  it('no saluda ni festeja una fecha que no es hoy', () => {
    // El festejo es del día, no de la fecha que se mire. Navegar al cumpleaños
    // de la semana pasada mostraba confeti y saludo idénticos a los del día
    // real: parecía que Franco cumplía hoy. El confeti sale de la misma
    // condición que el saludo, tres líneas más arriba, así que este test cubre
    // los dos —sacar `esHoy` de las props rompe ambos—.
    const visible = texto(dibujar(EL_CUMPLE, false));

    expect(visible).not.toContain('Feliz cumpleaños');
    expect(visible).toContain('Cumple años Franco Macello');
  });

  it('dice qué fecha se está mirando cuando no es hoy', () => {
    // Sin esto la pantalla es indistinguible de la de hoy.
    // React escribe el atributo como `dateTime`; el navegador lo normaliza.
    expect(dibujar(EL_CUMPLE, false)).toMatch(/datetime="2026-08-28"/i);
    expect(texto(dibujar(EL_CUMPLE, false))).toContain('28 de agosto');
  });

  it('no repite la fecha cuando sí es hoy', () => {
    expect(texto(dibujar(EL_CUMPLE, true))).not.toContain('28 de agosto');
  });

  it('en los dos casos muestra a quién le toca después', () => {
    for (const esHoy of [true, false]) {
      expect(texto(dibujar(EL_CUMPLE, esHoy)), `esHoy=${esHoy}`).toContain('Diego Funes');
    }
  });
});

describe('un día sin cumpleaños', () => {
  const UN_MARTES: FechaSimple = { anio: 2026, mes: 9, dia: 1 };

  it('anuncia el próximo en vez de festejar', () => {
    const visible = texto(dibujar(UN_MARTES, true));
    expect(visible).not.toContain('Feliz cumpleaños');
    expect(visible).toContain('El próximo cumpleaños es de');
    expect(visible).toContain('Diego Funes');
  });
});
