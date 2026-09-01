import { describe, expect, it } from 'vitest';
import {
  PALETA,
  TINTA_CLARA,
  TINTA_OSCURA,
  colorDeNombre,
  variablesDeRespaldo,
  iniciales,
} from './iniciales.js';

describe('iniciales', () => {
  it('toma la primera del primer nombre y la del último', () => {
    expect(iniciales('Ana Pérez')).toBe('AP');
    expect(iniciales('Ana María Pérez Gómez')).toBe('AG');
  });

  it('con un solo nombre devuelve una sola inicial', () => {
    expect(iniciales('Ana')).toBe('A');
  });

  it('aguanta espacios de más y nombres vacíos', () => {
    expect(iniciales('   Ana   Pérez  ')).toBe('AP');
    expect(iniciales('')).toBe('?');
    expect(iniciales('    ')).toBe('?');
  });

  it('conserva los acentos y la eñe', () => {
    expect(iniciales('Ángel Ñandú')).toBe('ÁÑ');
  });

  it('no rompe con nombres de un solo carácter ni con emoji', () => {
    expect(iniciales('J')).toBe('J');
    expect(iniciales('🎉 Fiesta')).toBe('🎉F');
  });
});

describe('colorDeNombre', () => {
  it('es determinista', () => {
    expect(colorDeNombre('Ana Pérez')).toBe(colorDeNombre('Ana Pérez'));
  });

  it('ignora mayúsculas y espacios de más', () => {
    // Corregir el tipeo de un nombre no debería cambiarle el color a la persona.
    expect(colorDeNombre('  ana   pérez ')).toBe(colorDeNombre('Ana Pérez'));
  });

  it('reparte los nombres entre varios colores', () => {
    const nombres = ['Ana', 'Bruno', 'Caro', 'Diego', 'Eze', 'Flor', 'Gastón', 'Ivo', 'Juli', 'Lu'];
    const usados = new Set(nombres.map(colorDeNombre));
    expect(usados.size).toBeGreaterThan(3);
  });

  it('siempre devuelve un color de la paleta', () => {
    for (const nombre of ['Ana', '', '🎉', 'x'.repeat(500)]) {
      expect(PALETA).toContain(colorDeNombre(nombre));
    }
  });
});

describe('variablesDeRespaldo', () => {
  it('publica los dos colores del par para que los elija el CSS', () => {
    const color = colorDeNombre('Ana Perez');
    expect(variablesDeRespaldo('Ana Perez')).toEqual({
      '--respaldo-claro': color.claro,
      '--respaldo-oscuro': color.oscuro,
    });
  });
});

// --- Contraste -------------------------------------------------------------

function canalLineal(v: number): number {
  return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}

function luminancia(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => canalLineal(parseInt(hex.slice(i, i + 2), 16) / 255)) as [
    number,
    number,
    number,
  ];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contraste(a: string, b: string): number {
  const [claro, oscuro] = [luminancia(a), luminancia(b)].sort((x, y) => y - x) as [number, number];
  return (claro + 0.05) / (oscuro + 0.05);
}

/** Los fondos de la app, de `estilos.css`. Si cambian allá, cambian acá. */
const FONDO_CLARO = '#faf8f6';
const FONDO_OSCURO = '#14100e';

describe('la paleta de respaldo', () => {
  // Un avatar de iniciales ilegible es peor que no tener foto, y el respaldo
  // no es un caso raro: hasta que el Administrador cargue fotos, es lo unico
  // que se ve. Si alguien suma un color a la paleta, estos tests deciden si
  // entra, en los dos temas.

  it('lee sus iniciales en tema claro', () => {
    for (const color of PALETA) {
      expect(contraste(color.claro, TINTA_CLARA), `${color.claro} con tinta clara`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('lee sus iniciales en tema oscuro', () => {
    for (const color of PALETA) {
      expect(contraste(color.oscuro, TINTA_OSCURA), `${color.oscuro} con tinta oscura`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('se despega del fondo en los dos temas', () => {
    // Esto es lo que rompia antes de tener paleta doble: los colores estaban
    // elegidos para llevar texto blanco, o sea todos oscuros, y en tema oscuro
    // el circulo del Retrato se perdia contra el fondo. 3:1 es el minimo de
    // AA para algo que es forma y no texto.
    for (const color of PALETA) {
      expect(contraste(color.claro, FONDO_CLARO), `${color.claro} contra el fondo claro`).toBeGreaterThanOrEqual(3);
      expect(contraste(color.oscuro, FONDO_OSCURO), `${color.oscuro} contra el fondo oscuro`).toBeGreaterThanOrEqual(3);
    }
  });

  it('no repite colores', () => {
    expect(new Set(PALETA.map((c) => c.claro)).size).toBe(PALETA.length);
    expect(new Set(PALETA.map((c) => c.oscuro)).size).toBe(PALETA.length);
  });
});
