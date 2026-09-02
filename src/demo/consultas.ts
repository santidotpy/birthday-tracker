/**
 * La fuente de Integrantes del demo estático.
 *
 * Reemplaza a `src/servidor/consultas.ts` por alias de Vite cuando el build
 * lleva `VITE_DEMO=1`. Ver `docs/adr/0008-el-demo-es-un-modo-de-build.md`.
 *
 * Tiene la misma firma que la de verdad —una función sin argumentos que
 * devuelve `Promise<Integrante[]>`— porque eso es todo lo que las rutas usan.
 * Que la de producción sea una server function y esta una lectura de un JSON
 * importado no lo nota nadie más arriba: `src/domain/` es puro y la Agenda, el
 * Próximo cumpleaños y la cuenta regresiva ya se calculaban en el cliente.
 */

import type { Area } from '../domain/areas.js';
import type { Integrante } from '../domain/agenda.js';
import datos from './datos.json' with { type: 'json' };

/**
 * Las Áreas del demo no son las de `areas.ts`: son categorías de personajes.
 * Se puede porque `areaONada` sólo corre en el camino de lectura de la base
 * —`repositorio.ts`— y acá no hay base. Los componentes muestran el string tal
 * cual, así que "Ciencia" o "Fútbol" se renderizan igual que "IT".
 */
const integrantes: Integrante[] = datos.integrantes.map((fila) => ({
  id: fila.id,
  nombre: fila.nombre,
  fechaDeCumpleanos: fila.fechaDeCumpleanos,
  retrato: fila.retrato,
  pais: fila.pais,
  area: fila.area as Area,
  archivado: false,
}));

export function obtenerIntegrantes(): Promise<Integrante[]> {
  return Promise.resolve(integrantes);
}
