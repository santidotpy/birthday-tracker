/**
 * Alta, edición y baja de Integrantes, coordinando base y Retratos.
 *
 * El repositorio no sabe de archivos y la ingesta no sabe de la base; acá se
 * juntan, que es donde aparecen las dos cosas que ninguno de los dos puede
 * resolver solo: no dejar archivos huérfanos y no dejar Retratos viejos.
 */

import { borrarRetrato } from '../retratos/almacen.js';
import { ingerirRetrato } from '../retratos/ingesta.js';
import type { Integrante } from '../domain/agenda.js';
import type { MesDia } from '../domain/fechas.js';
import type { Db } from '../db/index.js';
import {
  archivarIntegrante,
  buscarIntegrante,
  crearIntegrante,
  editarIntegrante,
  validarDatos,
} from '../db/repositorio.js';
import { integrantes } from '../db/schema.js';
import { eq } from 'drizzle-orm';

export interface DatosDeAlta {
  nombre: string;
  fechaDeCumpleanos: MesDia;
  /** URL de donde traer el Retrato. La app se queda con una copia (ADR 0001). */
  urlDeRetrato?: string | null;
  pais?: string | null;
}

interface OpcionesDeServicio {
  directorio?: string;
  permitirRedPrivada?: boolean;
}

export async function altaDeIntegrante(
  db: Db,
  datos: DatosDeAlta,
  opciones: OpcionesDeServicio = {},
): Promise<Integrante> {
  // Validar antes de descargar: no tiene sentido bajarse una foto de 8 MB
  // para después rechazar el alta por un nombre vacío.
  validarDatos(datos);

  const retrato = datos.urlDeRetrato
    ? await ingerirRetrato(datos.urlDeRetrato, opciones)
    : null;

  try {
    return crearIntegrante(db, {
      nombre: datos.nombre,
      fechaDeCumpleanos: datos.fechaDeCumpleanos,
      retrato: retrato?.archivo ?? null,
      retratoOrigen: retrato?.origen ?? null,
      pais: datos.pais ?? null,
    });
  } catch (error) {
    // El alta no quedó: el archivo que acabamos de bajar no le sirve a nadie.
    if (retrato) await borrarRetrato(retrato.archivo, opciones.directorio);
    throw error;
  }
}

export interface DatosDeEdicion extends DatosDeAlta {
  /**
   * `undefined` deja el Retrato como está, una URL lo reemplaza y `null` lo
   * quita. Sin los tres casos no hay forma de sacarle la foto a alguien.
   */
  urlDeRetrato?: string | null;
}

export async function edicionDeIntegrante(
  db: Db,
  id: string,
  datos: DatosDeEdicion,
  opciones: OpcionesDeServicio = {},
): Promise<Integrante> {
  validarDatos(datos);

  const actual = buscarIntegrante(db, id);
  if (!actual) throw new Error(`No existe el integrante ${id}`);

  const cambiaElRetrato = datos.urlDeRetrato !== undefined;
  const nuevo = datos.urlDeRetrato ? await ingerirRetrato(datos.urlDeRetrato, opciones) : null;

  const anterior = db
    .select({ retrato: integrantes.retrato, origen: integrantes.retratoOrigen })
    .from(integrantes)
    .where(eq(integrantes.id, id))
    .get();

  try {
    const editado = editarIntegrante(db, id, {
      nombre: datos.nombre,
      fechaDeCumpleanos: datos.fechaDeCumpleanos,
      retrato: cambiaElRetrato ? (nuevo?.archivo ?? null) : (anterior?.retrato ?? null),
      retratoOrigen: cambiaElRetrato ? (nuevo?.origen ?? null) : (anterior?.origen ?? null),
      pais: datos.pais ?? null,
    });

    // Recién ahora, con la base ya actualizada, el archivo viejo sobra.
    if (cambiaElRetrato && anterior?.retrato) {
      await borrarRetrato(anterior.retrato, opciones.directorio);
    }
    return editado;
  } catch (error) {
    if (nuevo) await borrarRetrato(nuevo.archivo, opciones.directorio);
    throw error;
  }
}

/**
 * Archivar conserva el Retrato: un Archivado mantiene sus datos y podría volver.
 * Borrar el archivo acá dejaría la fila apuntando a algo que no existe.
 */
export function bajaDeIntegrante(db: Db, id: string): Integrante {
  return archivarIntegrante(db, id);
}
