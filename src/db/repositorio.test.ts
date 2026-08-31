import { eq } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { beforeEach, describe, expect, it } from 'vitest';
import { agenda, proximoCumpleanos } from '../domain/agenda.js';
import { crearDb, type Db } from './index.js';
import {
  archivarIntegrante,
  buscarIntegrante,
  crearIntegrante,
  desarchivarIntegrante,
  editarIntegrante,
  listarIntegrantes,
} from './repositorio.js';
import { integrantes } from './schema.js';

let db: Db;

beforeEach(() => {
  db = crearDb(':memory:');
  migrate(db, { migrationsFolder: './drizzle' });
});

describe('crearIntegrante', () => {
  it('guarda y devuelve el integrante como tipo del dominio', () => {
    const ana = crearIntegrante(db, { nombre: 'Ana', fechaDeCumpleanos: { mes: 8, dia: 31 } });
    expect(ana.nombre).toBe('Ana');
    expect(ana.fechaDeCumpleanos).toEqual({ mes: 8, dia: 31 });
    expect(ana.archivado).toBe(false);
    expect(ana.id).toBeTruthy();
  });

  it('recorta el nombre y rechaza el vacío', () => {
    expect(crearIntegrante(db, { nombre: '  Ana  ', fechaDeCumpleanos: { mes: 1, dia: 1 } }).nombre)
      .toBe('Ana');
    expect(() => crearIntegrante(db, { nombre: '   ', fechaDeCumpleanos: { mes: 1, dia: 1 } }))
      .toThrow(/nombre/i);
  });

  it('acepta el 29 de febrero', () => {
    expect(
      crearIntegrante(db, { nombre: 'Feb', fechaDeCumpleanos: { mes: 2, dia: 29 } })
        .fechaDeCumpleanos,
    ).toEqual({ mes: 2, dia: 29 });
  });

  it('rechaza días que no existen en ningún año', () => {
    expect(() => crearIntegrante(db, { nombre: 'X', fechaDeCumpleanos: { mes: 4, dia: 31 } }))
      .toThrow(/inválida/i);
    expect(() => crearIntegrante(db, { nombre: 'X', fechaDeCumpleanos: { mes: 2, dia: 30 } }))
      .toThrow(/inválida/i);
  });

  it('guarda país y procedencia del retrato sin que afecten al dominio', () => {
    const ana = crearIntegrante(db, {
      nombre: 'Ana',
      fechaDeCumpleanos: { mes: 8, dia: 31 },
      retrato: 'ana.webp',
      retratoOrigen: 'https://media.licdn.com/algo',
      pais: 'AR',
    });
    expect(ana.retrato).toBe('ana.webp');
    expect(ana.pais).toBe('AR');
    // La procedencia no viaja al dominio: nada del render la usa (ADR 0001).
    expect('retratoOrigen' in ana).toBe(false);
  });
});

describe('el Área', () => {
  it('se guarda y vuelve como parte del dominio', () => {
    const ana = crearIntegrante(db, {
      nombre: 'Ana',
      fechaDeCumpleanos: { mes: 8, dia: 31 },
      area: 'IT',
    });
    expect(ana.area).toBe('IT');
    expect(buscarIntegrante(db, ana.id)?.area).toBe('IT');
  });

  it('es opcional', () => {
    expect(crearIntegrante(db, { nombre: 'Ana', fechaDeCumpleanos: { mes: 8, dia: 31 } }).area)
      .toBeNull();
  });

  it('rechaza un área que no está en la lista', () => {
    expect(() =>
      crearIntegrante(db, {
        nombre: 'Ana',
        fechaDeCumpleanos: { mes: 8, dia: 31 },
        // @ts-expect-error: justamente lo que el tipo impide y la base no.
        area: 'Sistemas',
      }),
    ).toThrow(/área desconocida/i);
  });

  it('degrada a null un área que salió de la lista después de guardarse', () => {
    const ana = crearIntegrante(db, { nombre: 'Ana', fechaDeCumpleanos: { mes: 8, dia: 31 } });
    // Simula que el Área existía cuando se guardó y después se quitó de areas.ts.
    db.update(integrantes).set({ area: 'Área Vieja' }).where(eq(integrantes.id, ana.id)).run();
    expect(buscarIntegrante(db, ana.id)?.area).toBeNull();
  });
});

describe('la base rechaza meses imposibles aunque se saltee la validación', () => {
  it('el CHECK del esquema es la red de seguridad', () => {
    expect(() =>
      db
        .insert(integrantes)
        .values({ id: 'x', nombre: 'X', mesCumple: 13, diaCumple: 1 })
        .run(),
    ).toThrow(/CHECK/i);
  });
});

describe('archivar', () => {
  it('saca al integrante de la lista sin borrarlo', () => {
    const ana = crearIntegrante(db, { nombre: 'Ana', fechaDeCumpleanos: { mes: 8, dia: 31 } });
    crearIntegrante(db, { nombre: 'Bruno', fechaDeCumpleanos: { mes: 9, dia: 6 } });

    archivarIntegrante(db, ana.id);

    expect(listarIntegrantes(db).map((i) => i.nombre)).toEqual(['Bruno']);
    expect(listarIntegrantes(db, true).map((i) => i.nombre).sort()).toEqual(['Ana', 'Bruno']);
    expect(buscarIntegrante(db, ana.id)?.archivado).toBe(true);
  });

  it('se puede revertir', () => {
    const ana = crearIntegrante(db, { nombre: 'Ana', fechaDeCumpleanos: { mes: 8, dia: 31 } });
    archivarIntegrante(db, ana.id);
    expect(desarchivarIntegrante(db, ana.id).archivado).toBe(false);
    expect(listarIntegrantes(db)).toHaveLength(1);
  });

  it('falla con un id que no existe', () => {
    expect(() => archivarIntegrante(db, 'no-existe')).toThrow(/no existe/i);
  });
});

describe('editar', () => {
  it('cambia la fecha de cumpleaños', () => {
    const ana = crearIntegrante(db, { nombre: 'Ana', fechaDeCumpleanos: { mes: 8, dia: 31 } });
    const editada = editarIntegrante(db, ana.id, {
      nombre: 'Ana María',
      fechaDeCumpleanos: { mes: 9, dia: 6 },
    });
    expect(editada.nombre).toBe('Ana María');
    expect(editada.fechaDeCumpleanos).toEqual({ mes: 9, dia: 6 });
  });

  it('valida igual que el alta', () => {
    const ana = crearIntegrante(db, { nombre: 'Ana', fechaDeCumpleanos: { mes: 8, dia: 31 } });
    expect(() => editarIntegrante(db, ana.id, { nombre: 'Ana', fechaDeCumpleanos: { mes: 2, dia: 30 } }))
      .toThrow(/inválida/i);
  });
});

describe('buscarIntegrante', () => {
  it('devuelve null si no existe', () => {
    expect(buscarIntegrante(db, 'no-existe')).toBeNull();
  });
});

describe('lo guardado alimenta al dominio', () => {
  it('la agenda y el próximo cumpleaños salen de la base sin traducción extra', () => {
    crearIntegrante(db, { nombre: 'Hoy', fechaDeCumpleanos: { mes: 8, dia: 31 } });
    crearIntegrante(db, { nombre: 'Pronto', fechaDeCumpleanos: { mes: 9, dia: 6 } });
    const exempleado = crearIntegrante(db, { nombre: 'Ex', fechaDeCumpleanos: { mes: 9, dia: 2 } });
    archivarIntegrante(db, exempleado.id);

    const activos = listarIntegrantes(db);
    const hoy = { anio: 2026, mes: 8, dia: 31 };

    // El archivado no aparece ni siquiera estando entre medio de los dos.
    expect(agenda(activos, hoy).map((e) => e.integrantes[0]!.nombre)).toEqual(['Hoy', 'Pronto']);
    expect(proximoCumpleanos(activos, hoy)!.integrantes[0]!.nombre).toBe('Pronto');
  });
});
