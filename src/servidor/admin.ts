/**
 * Operaciones del Administrador. Todas exigen sesión.
 *
 * La comprobación va adentro de cada handler, no en la ruta: una ruta protegida
 * evita que se vea el panel, pero la server function es un endpoint HTTP y
 * cualquiera puede llamarla directo.
 */

import { createServerFn } from '@tanstack/react-start';
import type { Integrante } from '../domain/agenda.js';
import type { Area } from '../domain/areas.js';
import type { MesDia } from '../domain/fechas.js';

async function exigirAdministrador() {
  const { getRequest } = await import('@tanstack/react-start/server');
  const { auth } = await import('../auth/servidor.js');
  const sesion = await auth.api.getSession({ headers: getRequest().headers });
  if (!sesion) throw new Error('No autorizado');
  return sesion;
}

export interface DatosDelFormulario {
  nombre: string;
  fechaDeCumpleanos: MesDia;
  /** `undefined` deja el Retrato como está, una URL lo reemplaza, `null` lo quita. */
  urlDeRetrato?: string | null;
  pais?: string | null;
  area?: Area | null;
}

/** Incluye a los Archivados: el panel es el único lugar donde se los ve. */
export const listarParaAdmin = createServerFn({ method: 'GET' }).handler(
  async (): Promise<Integrante[]> => {
    await exigirAdministrador();
    const { db } = await import('../db/index.js');
    const { listarIntegrantes } = await import('../db/repositorio.js');
    return listarIntegrantes(db(), true);
  },
);

export const crear = createServerFn({ method: 'POST' })
  .validator((datos: DatosDelFormulario) => datos)
  .handler(async ({ data }): Promise<Integrante> => {
    await exigirAdministrador();
    const { db } = await import('../db/index.js');
    const { altaDeIntegrante } = await import('../servicios/integrantes.js');
    return altaDeIntegrante(db(), data);
  });

export const editar = createServerFn({ method: 'POST' })
  .validator((datos: DatosDelFormulario & { id: string }) => datos)
  .handler(async ({ data }): Promise<Integrante> => {
    await exigirAdministrador();
    const { db } = await import('../db/index.js');
    const { edicionDeIntegrante } = await import('../servicios/integrantes.js');
    const { id, ...resto } = data;
    return edicionDeIntegrante(db(), id, resto);
  });

export const cambiarArchivado = createServerFn({ method: 'POST' })
  .validator((datos: { id: string; archivar: boolean }) => datos)
  .handler(async ({ data }): Promise<Integrante> => {
    await exigirAdministrador();
    const { db } = await import('../db/index.js');
    const { archivarIntegrante, desarchivarIntegrante } = await import('../db/repositorio.js');
    return data.archivar
      ? archivarIntegrante(db(), data.id)
      : desarchivarIntegrante(db(), data.id);
  });
