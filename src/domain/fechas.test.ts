import { describe, expect, it } from 'vitest';
import {
  diasEntre,
  esBisiesto,
  esMesDiaValido,
  hoyEnArgentina,
  inicioDelDiaEnArgentina,
  msHastaInicioDe,
  msHastaProximaMedianoche,
  ocurrenciaEn,
  parsearFechaISO,
  proximaOcurrenciaEstricta,
  proximaOcurrenciaInclusiva,
} from './fechas.js';

describe('esBisiesto', () => {
  it('aplica la regla de los siglos', () => {
    expect(esBisiesto(2024)).toBe(true);
    expect(esBisiesto(2025)).toBe(false);
    expect(esBisiesto(2000)).toBe(true); // divisible por 400
    expect(esBisiesto(1900)).toBe(false); // divisible por 100 pero no por 400
    expect(esBisiesto(2100)).toBe(false);
  });
});

describe('esMesDiaValido', () => {
  it('acepta el 29 de febrero', () => {
    expect(esMesDiaValido({ mes: 2, dia: 29 })).toBe(true);
  });

  it('rechaza días que no existen en ningún año', () => {
    expect(esMesDiaValido({ mes: 2, dia: 30 })).toBe(false);
    expect(esMesDiaValido({ mes: 4, dia: 31 })).toBe(false);
    expect(esMesDiaValido({ mes: 13, dia: 1 })).toBe(false);
    expect(esMesDiaValido({ mes: 1, dia: 0 })).toBe(false);
  });
});

describe('ocurrenciaEn', () => {
  it('observa el 29/02 el 01/03 en años no bisiestos', () => {
    expect(ocurrenciaEn({ mes: 2, dia: 29 }, 2027)).toEqual({ anio: 2027, mes: 3, dia: 1 });
  });

  it('mantiene el 29/02 en años bisiestos', () => {
    expect(ocurrenciaEn({ mes: 2, dia: 29 }, 2028)).toEqual({ anio: 2028, mes: 2, dia: 29 });
  });

  it('no toca ninguna otra fecha', () => {
    expect(ocurrenciaEn({ mes: 8, dia: 31 }, 2027)).toEqual({ anio: 2027, mes: 8, dia: 31 });
  });
});

describe('proximaOcurrenciaInclusiva', () => {
  it('devuelve hoy mismo si hoy es el cumpleaños', () => {
    const hoy = { anio: 2026, mes: 8, dia: 31 };
    expect(proximaOcurrenciaInclusiva({ mes: 8, dia: 31 }, hoy)).toEqual(hoy);
  });

  it('salta al año siguiente cuando la fecha ya pasó', () => {
    expect(proximaOcurrenciaInclusiva({ mes: 3, dia: 10 }, { anio: 2026, mes: 8, dia: 31 })).toEqual(
      { anio: 2027, mes: 3, dia: 10 },
    );
  });

  it('cruza el fin de año', () => {
    expect(proximaOcurrenciaInclusiva({ mes: 1, dia: 1 }, { anio: 2026, mes: 12, dia: 31 })).toEqual(
      { anio: 2027, mes: 1, dia: 1 },
    );
  });
});

describe('proximaOcurrenciaEstricta', () => {
  it('salta un año cuando hoy es el cumpleaños', () => {
    expect(proximaOcurrenciaEstricta({ mes: 8, dia: 31 }, { anio: 2026, mes: 8, dia: 31 })).toEqual({
      anio: 2027,
      mes: 8,
      dia: 31,
    });
  });

  it('lleva un 29/02 al 01/03 del año no bisiesto en curso', () => {
    expect(proximaOcurrenciaEstricta({ mes: 2, dia: 29 }, { anio: 2027, mes: 2, dia: 28 })).toEqual({
      anio: 2027,
      mes: 3,
      dia: 1,
    });
  });

  it('lleva un 29/02 al siguiente año bisiesto cuando ya se observó', () => {
    expect(proximaOcurrenciaEstricta({ mes: 2, dia: 29 }, { anio: 2027, mes: 3, dia: 1 })).toEqual({
      anio: 2028,
      mes: 2,
      dia: 29,
    });
  });

  it('el 31/12 lleva al 01/01', () => {
    expect(proximaOcurrenciaEstricta({ mes: 1, dia: 1 }, { anio: 2026, mes: 12, dia: 31 })).toEqual({
      anio: 2027,
      mes: 1,
      dia: 1,
    });
  });
});

describe('diasEntre', () => {
  it('cuenta días cruzando el fin de año', () => {
    expect(diasEntre({ anio: 2026, mes: 12, dia: 31 }, { anio: 2027, mes: 1, dia: 1 })).toBe(1);
  });

  it('incluye el 29 de febrero de un año bisiesto', () => {
    expect(diasEntre({ anio: 2028, mes: 2, dia: 28 }, { anio: 2028, mes: 3, dia: 1 })).toBe(2);
  });

  it('lo excluye en un año no bisiesto', () => {
    expect(diasEntre({ anio: 2027, mes: 2, dia: 28 }, { anio: 2027, mes: 3, dia: 1 })).toBe(1);
  });

  it('es cero entre una fecha y sí misma', () => {
    expect(diasEntre({ anio: 2026, mes: 8, dia: 31 }, { anio: 2026, mes: 8, dia: 31 })).toBe(0);
  });
});

describe('hoyEnArgentina', () => {
  it('todavía es ayer cuando en UTC ya cambió el día', () => {
    // 02:00 UTC del 1/1 son las 23:00 del 31/12 en Argentina.
    expect(hoyEnArgentina(new Date('2026-01-01T02:00:00Z'))).toEqual({
      anio: 2025,
      mes: 12,
      dia: 31,
    });
  });

  it('cambia de día a las 03:00 UTC', () => {
    expect(hoyEnArgentina(new Date('2026-01-01T03:00:00Z'))).toEqual({ anio: 2026, mes: 1, dia: 1 });
  });
});

describe('inicioDelDiaEnArgentina', () => {
  it('ubica la medianoche argentina en el instante correcto', () => {
    expect(inicioDelDiaEnArgentina({ anio: 2026, mes: 9, dia: 1 })).toBe(
      Date.parse('2026-09-01T03:00:00Z'),
    );
  });

  it('el instante devuelto pertenece al día pedido, y un ms antes al anterior', () => {
    // Recorre todo el año: si alguna vez vuelve el horario de verano, esto lo agarra.
    for (let mes = 1; mes <= 12; mes++) {
      const fecha = { anio: 2027, mes, dia: 1 };
      const inicio = inicioDelDiaEnArgentina(fecha);
      expect(hoyEnArgentina(new Date(inicio))).toEqual(fecha);
      expect(hoyEnArgentina(new Date(inicio - 1))).not.toEqual(fecha);
    }
  });
});

describe('cuentas regresivas', () => {
  it('mide los ms que faltan para el arranque de una fecha', () => {
    const ahora = new Date('2026-08-31T22:00:00Z'); // 19:00 en Argentina
    expect(msHastaInicioDe({ anio: 2026, mes: 9, dia: 1 }, ahora)).toBe(5 * 60 * 60 * 1000);
  });

  it('mide los ms hasta la próxima medianoche argentina', () => {
    const ahora = new Date('2026-08-31T22:00:00Z');
    expect(msHastaProximaMedianoche(ahora)).toBe(5 * 60 * 60 * 1000);
  });

  it('cruza el fin de año al buscar la próxima medianoche', () => {
    const ahora = new Date('2027-01-01T02:00:00Z'); // 31/12 23:00 en Argentina
    expect(msHastaProximaMedianoche(ahora)).toBe(60 * 60 * 1000);
  });
});

describe('parsearFechaISO', () => {
  it('acepta una fecha real', () => {
    expect(parsearFechaISO('2026-09-06')).toEqual({ anio: 2026, mes: 9, dia: 6 });
  });

  it('rechaza el 29/02 de un año no bisiesto y acepta el de uno bisiesto', () => {
    expect(parsearFechaISO('2027-02-29')).toBeNull();
    expect(parsearFechaISO('2028-02-29')).toEqual({ anio: 2028, mes: 2, dia: 29 });
  });

  it('rechaza días y meses que no existen', () => {
    expect(parsearFechaISO('2026-13-01')).toBeNull();
    expect(parsearFechaISO('2026-00-10')).toBeNull();
    expect(parsearFechaISO('2026-04-31')).toBeNull();
    expect(parsearFechaISO('2026-09-00')).toBeNull();
  });

  it('rechaza cualquier cosa que no tenga el formato', () => {
    for (const basura of ['', 'hoy', '2026-9-6', '2026/09/06', '20260906', '../etc/passwd']) {
      expect(parsearFechaISO(basura), basura).toBeNull();
    }
  });
});
