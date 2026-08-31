/**
 * Dónde viven los archivos de los Retratos.
 *
 * Van al mismo volumen persistente que la base (ver `.env.example`). Si el
 * directorio queda dentro del contenedor, cada redeploy se lleva las fotos.
 */

import { randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

export const RUTA_RETRATOS = process.env.RETRATOS_PATH ?? './datos/retratos';

/** Los nombres que genera esta app y los únicos que acepta de vuelta. */
const NOMBRE_VALIDO = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.webp$/;

export function esNombreDeRetrato(nombre: string): boolean {
  return NOMBRE_VALIDO.test(nombre);
}

/**
 * Ruta en disco de un Retrato. Valida el nombre aunque venga de la base:
 * es lo único que separa un `..%2F..%2Fetc%2Fpasswd` de una lectura de archivo.
 */
export function rutaDeRetrato(nombre: string, directorio = RUTA_RETRATOS): string {
  if (!esNombreDeRetrato(nombre)) {
    throw new Error(`Nombre de retrato inválido: ${nombre}`);
  }
  return join(directorio, nombre);
}

/** Guarda los bytes ya procesados y devuelve el nombre del archivo. */
export async function guardarRetrato(bytes: Buffer, directorio = RUTA_RETRATOS): Promise<string> {
  const nombre = `${randomUUID()}.webp`;
  await mkdir(directorio, { recursive: true });
  await writeFile(join(directorio, nombre), bytes);
  return nombre;
}

/** Borra un Retrato. No falla si el archivo ya no está. */
export async function borrarRetrato(nombre: string, directorio = RUTA_RETRATOS): Promise<void> {
  try {
    await unlink(rutaDeRetrato(nombre, directorio));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
}
