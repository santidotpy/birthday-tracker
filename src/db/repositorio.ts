/**
 * Acceso a Integrantes. Traduce entre filas y el tipo del dominio.
 *
 * Las consultas son síncronas porque better-sqlite3 lo es. No las envuelvo en
 * promesas para aparentar lo contrario.
 */

import { eq, isNull } from 'drizzle-orm';
import type { Integrante } from '../domain/agenda.js';
import { esMesDiaValido, type MesDia } from '../domain/fechas.js';
import type { Db } from './index.js';
import { integrantes, type FilaIntegrante } from './schema.js';

export interface DatosDeIntegrante {
  nombre: string;
  fechaDeCumpleanos: MesDia;
  retrato?: string | null;
  retratoOrigen?: string | null;
  pais?: string | null;
}

export function aIntegrante(fila: FilaIntegrante): Integrante {
  return {
    id: fila.id,
    nombre: fila.nombre,
    fechaDeCumpleanos: { mes: fila.mesCumple, dia: fila.diaCumple },
    retrato: fila.retrato,
    pais: fila.pais,
    archivado: fila.archivadoEn !== null,
  };
}

function validar(datos: DatosDeIntegrante): void {
  if (datos.nombre.trim() === '') {
    throw new Error('El nombre no puede estar vacío');
  }
  if (!esMesDiaValido(datos.fechaDeCumpleanos)) {
    const { mes, dia } = datos.fechaDeCumpleanos;
    throw new Error(`Fecha de cumpleaños inválida: ${dia}/${mes}`);
  }
}

/** Los Integrantes activos. Los Archivados quedan afuera salvo que se pidan. */
export function listarIntegrantes(db: Db, incluirArchivados = false): Integrante[] {
  const consulta = db.select().from(integrantes);
  const filas = incluirArchivados
    ? consulta.all()
    : consulta.where(isNull(integrantes.archivadoEn)).all();
  return filas.map(aIntegrante);
}

export function buscarIntegrante(db: Db, id: string): Integrante | null {
  const fila = db.select().from(integrantes).where(eq(integrantes.id, id)).get();
  return fila ? aIntegrante(fila) : null;
}

export function crearIntegrante(db: Db, datos: DatosDeIntegrante): Integrante {
  validar(datos);
  const fila = db
    .insert(integrantes)
    .values({
      id: crypto.randomUUID(),
      nombre: datos.nombre.trim(),
      mesCumple: datos.fechaDeCumpleanos.mes,
      diaCumple: datos.fechaDeCumpleanos.dia,
      retrato: datos.retrato ?? null,
      retratoOrigen: datos.retratoOrigen ?? null,
      pais: datos.pais ?? null,
    })
    .returning()
    .get();
  return aIntegrante(fila);
}

export function editarIntegrante(db: Db, id: string, datos: DatosDeIntegrante): Integrante {
  validar(datos);
  const fila = db
    .update(integrantes)
    .set({
      nombre: datos.nombre.trim(),
      mesCumple: datos.fechaDeCumpleanos.mes,
      diaCumple: datos.fechaDeCumpleanos.dia,
      retrato: datos.retrato ?? null,
      retratoOrigen: datos.retratoOrigen ?? null,
      pais: datos.pais ?? null,
      actualizadoEn: new Date(),
    })
    .where(eq(integrantes.id, id))
    .returning()
    .get();
  if (!fila) throw new Error(`No existe el integrante ${id}`);
  return aIntegrante(fila);
}

/** Archivar no borra: el Integrante conserva sus datos y sale de las vistas. */
export function archivarIntegrante(db: Db, id: string): Integrante {
  const fila = db
    .update(integrantes)
    .set({ archivadoEn: new Date(), actualizadoEn: new Date() })
    .where(eq(integrantes.id, id))
    .returning()
    .get();
  if (!fila) throw new Error(`No existe el integrante ${id}`);
  return aIntegrante(fila);
}

export function desarchivarIntegrante(db: Db, id: string): Integrante {
  const fila = db
    .update(integrantes)
    .set({ archivadoEn: null, actualizadoEn: new Date() })
    .where(eq(integrantes.id, id))
    .returning()
    .get();
  if (!fila) throw new Error(`No existe el integrante ${id}`);
  return aIntegrante(fila);
}
