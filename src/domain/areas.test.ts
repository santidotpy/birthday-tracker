import { describe, expect, it } from 'vitest';
import { AREAS, areaONada, esAreaValida } from './areas.js';

describe('la lista de Áreas', () => {
  it('no tiene repetidos ni entradas vacías', () => {
    expect(new Set(AREAS).size).toBe(AREAS.length);
    for (const area of AREAS) expect(area.trim()).toBe(area);
    expect(AREAS.every((a) => a.length > 0)).toBe(true);
  });
});

describe('esAreaValida', () => {
  it('acepta las de la lista y rechaza el resto', () => {
    expect(esAreaValida('IT')).toBe(true);
    expect(esAreaValida('Sistemas')).toBe(false);
    expect(esAreaValida('it')).toBe(false); // distingue mayúsculas a propósito
    expect(esAreaValida('')).toBe(false);
  });
});

describe('areaONada', () => {
  it('normaliza vacíos a null', () => {
    expect(areaONada(null)).toBeNull();
    expect(areaONada(undefined)).toBeNull();
    expect(areaONada('')).toBeNull();
    expect(areaONada('   ')).toBeNull();
  });

  it('recorta espacios alrededor de un área válida', () => {
    expect(areaONada('  IT  ')).toBe('IT');
  });

  it('degrada a null un área que ya no está en la lista', () => {
    // Si mañana se quita un Área, quien la tenía se muestra sin Área.
    // Romper la pantalla el día del cumpleaños de alguien sería peor.
    expect(areaONada('Área Que Ya No Existe')).toBeNull();
  });
});
