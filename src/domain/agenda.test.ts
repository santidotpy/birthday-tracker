import { describe, expect, it } from 'vitest';
import {
  agenda,
  agendaPorMes,
  cumpleanerosEn,
  proximoCumpleanos,
  type Integrante,
} from './agenda.js';

function integrante(nombre: string, mes: number, dia: number, archivado = false): Integrante {
  return { id: nombre.toLowerCase(), nombre, fechaDeCumpleanos: { mes, dia }, archivado };
}

const nombres = (entrada: { integrantes: readonly Integrante[] } | null) =>
  entrada?.integrantes.map((i) => i.nombre) ?? null;

describe('cumpleanerosEn', () => {
  it('devuelve a todos los que comparten la fecha', () => {
    const equipo = [integrante('Ana', 8, 31), integrante('Bruno', 8, 31), integrante('Caro', 9, 1)];
    expect(cumpleanerosEn(equipo, { anio: 2026, mes: 8, dia: 31 }).map((i) => i.nombre)).toEqual([
      'Ana',
      'Bruno',
    ]);
  });

  it('junta un 29/02 con un 01/03 en año no bisiesto', () => {
    const equipo = [integrante('Feb', 2, 29), integrante('Mar', 3, 1)];
    expect(cumpleanerosEn(equipo, { anio: 2027, mes: 3, dia: 1 }).map((i) => i.nombre)).toEqual([
      'Feb',
      'Mar',
    ]);
  });

  it('los separa en año bisiesto', () => {
    const equipo = [integrante('Feb', 2, 29), integrante('Mar', 3, 1)];
    expect(cumpleanerosEn(equipo, { anio: 2028, mes: 2, dia: 29 }).map((i) => i.nombre)).toEqual([
      'Feb',
    ]);
    expect(cumpleanerosEn(equipo, { anio: 2028, mes: 3, dia: 1 }).map((i) => i.nombre)).toEqual([
      'Mar',
    ]);
  });

  it('ignora a los archivados', () => {
    const equipo = [integrante('Ana', 8, 31), integrante('Exempleado', 8, 31, true)];
    expect(cumpleanerosEn(equipo, { anio: 2026, mes: 8, dia: 31 }).map((i) => i.nombre)).toEqual([
      'Ana',
    ]);
  });

  it('devuelve vacío en una fecha sin cumpleaños', () => {
    expect(cumpleanerosEn([integrante('Ana', 8, 31)], { anio: 2026, mes: 9, dia: 15 })).toEqual([]);
  });
});

describe('agenda', () => {
  const hoy = { anio: 2026, mes: 8, dia: 31 };

  it('arranca en hoy y da la vuelta al año, no empieza en enero', () => {
    const equipo = [
      integrante('Enero', 1, 15),
      integrante('Setiembre', 9, 10),
      integrante('Marzo', 3, 20),
    ];
    expect(agenda(equipo, hoy).map((e) => e.integrantes[0]!.nombre)).toEqual([
      'Setiembre',
      'Enero',
      'Marzo',
    ]);
  });

  it('incluye a quien cumple hoy, en primer lugar y con dias 0', () => {
    const equipo = [integrante('Hoy', 8, 31), integrante('Pronto', 9, 6)];
    const resultado = agenda(equipo, hoy);
    expect(nombres(resultado[0]!)).toEqual(['Hoy']);
    expect(resultado[0]!.dias).toBe(0);
    expect(resultado[1]!.dias).toBe(6);
  });

  it('agrupa a los que comparten fecha y los ordena por nombre', () => {
    const equipo = [integrante('Zoe', 9, 6), integrante('Ana', 9, 6)];
    const resultado = agenda(equipo, hoy);
    expect(resultado).toHaveLength(1);
    expect(nombres(resultado[0]!)).toEqual(['Ana', 'Zoe']);
  });

  it('excluye a los archivados', () => {
    const equipo = [integrante('Ana', 9, 6), integrante('Exempleado', 9, 7, true)];
    expect(agenda(equipo, hoy).flatMap((e) => e.integrantes.map((i) => i.nombre))).toEqual(['Ana']);
  });

  it('cruza el fin de año sin alterar el orden', () => {
    const equipo = [integrante('Diciembre', 12, 31), integrante('Enero', 1, 1)];
    const resultado = agenda(equipo, { anio: 2026, mes: 12, dia: 30 });
    expect(resultado.map((e) => e.dias)).toEqual([1, 2]);
  });

  it('devuelve vacío sin integrantes activos', () => {
    expect(agenda([integrante('Exempleado', 9, 6, true)], hoy)).toEqual([]);
  });
});

describe('proximoCumpleanos', () => {
  const hoy = { anio: 2026, mes: 8, dia: 31 };

  it('mira hacia adelante aunque hoy haya cumpleaños', () => {
    const equipo = [integrante('Hoy', 8, 31), integrante('Pronto', 9, 6)];
    const proximo = proximoCumpleanos(equipo, hoy)!;
    expect(nombres(proximo)).toEqual(['Pronto']);
    expect(proximo.dias).toBe(6);
  });

  it('con un solo integrante que cumple hoy, apunta a su año que viene', () => {
    const proximo = proximoCumpleanos([integrante('Solo', 8, 31)], hoy)!;
    expect(proximo.fecha).toEqual({ anio: 2027, mes: 8, dia: 31 });
    expect(proximo.dias).toBe(365);
  });

  it('devuelve a todos cuando el próximo es compartido', () => {
    const equipo = [integrante('Zoe', 9, 6), integrante('Ana', 9, 6), integrante('Lejos', 12, 1)];
    expect(nombres(proximoCumpleanos(equipo, hoy)!)).toEqual(['Ana', 'Zoe']);
  });

  it('devuelve null sin integrantes activos', () => {
    expect(proximoCumpleanos([], hoy)).toBeNull();
    expect(proximoCumpleanos([integrante('Exempleado', 9, 6, true)], hoy)).toBeNull();
  });
});

describe('agendaPorMes', () => {
  const hoy = { anio: 2026, mes: 8, dia: 15 };

  it('agrupa conservando el orden de la agenda', () => {
    const equipo = [
      integrante('Setiembre', 9, 10),
      integrante('Octubre', 10, 2),
      integrante('Otro Setiembre', 9, 25),
    ];
    const meses = agendaPorMes(agenda(equipo, hoy));
    expect(meses.map((m) => m.mes)).toEqual([9, 10]);
    expect(meses[0]!.entradas).toHaveLength(2);
  });

  it('deja el mismo mes dos veces cuando la agenda da la vuelta al año', () => {
    // Estamos a mitad de agosto: uno cumple en unos días, el otro ya pasó y
    // recién vuelve el año que viene. Los dos son "agosto" y no se colapsan.
    const equipo = [integrante('Pronto', 8, 20), integrante('Ya pasó', 8, 5)];
    const meses = agendaPorMes(agenda(equipo, hoy));

    expect(meses).toHaveLength(2);
    expect(meses.map((m) => [m.anio, m.mes])).toEqual([
      [2026, 8],
      [2027, 8],
    ]);
    expect(meses[0]!.entradas[0]!.integrantes[0]!.nombre).toBe('Pronto');
    expect(meses[1]!.entradas[0]!.integrantes[0]!.nombre).toBe('Ya pasó');
  });

  it('con la agenda vacía devuelve vacío', () => {
    expect(agendaPorMes([])).toEqual([]);
  });
});
