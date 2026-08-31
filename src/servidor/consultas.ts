/**
 * Lo único que el navegador necesita del servidor: la lista de Integrantes.
 *
 * La Agenda, el Próximo cumpleaños y las cuentas regresivas se calculan en el
 * cliente. `src/domain/` es aritmética pura sin nada de Node, así que corre
 * igual de los dos lados, y así la cuenta regresiva avanza cada segundo sin
 * pedirle nada al servidor.
 */

import { createServerFn } from '@tanstack/react-start';
import type { Integrante } from '../domain/agenda.js';

export const obtenerIntegrantes = createServerFn({ method: 'GET' }).handler(
  async (): Promise<Integrante[]> => {
    const { db } = await import('../db/index.js');
    const { listarIntegrantes } = await import('../db/repositorio.js');
    return listarIntegrantes(db());
  },
);
