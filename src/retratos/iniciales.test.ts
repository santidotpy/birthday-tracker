import { describe, expect, it } from 'vitest';
import { PALETA, colorDeNombre, iniciales } from './iniciales.js';

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

function contrasteContraBlanco(hex: string): number {
  return 1.05 / (luminancia(hex) + 0.05);
}

describe('la paleta de respaldo', () => {
  it('es legible con texto blanco en todos sus colores', () => {
    // Un avatar de iniciales ilegible es peor que no tener foto. Si alguien
    // suma un color a la paleta, este test decide si entra.
    for (const color of PALETA) {
      expect(contrasteContraBlanco(color), `${color} contra blanco`).toBeGreaterThanOrEqual(4.5);
    }
  });
});
