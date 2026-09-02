/**
 * El tema del demo estático.
 *
 * Reemplaza a `src/servidor/tema.ts` por alias de Vite cuando el build lleva
 * `VITE_DEMO=1`. Ver `docs/adr/0008-el-demo-es-un-modo-de-build.md`.
 *
 * La de verdad es una server function que lee la cookie del pedido para que el
 * HTML salga ya con el tema puesto. Acá no hay pedido: el sitio es estático, así
 * que la cookie se lee del documento y, si no hay ninguna, se sigue al sistema.
 *
 * El fogonazo que el ADR original evita no aparece igual, porque `estilos.css`
 * traduce la ausencia de `data-tema` a `prefers-color-scheme`. Lo único que se
 * pierde es `?tema=oscuro` en la URL, que existe para configurar la TV de la
 * oficina y a un demo no le hace falta.
 */

import { type Tema, TEMA_POR_DEFECTO, temaDeCookies } from '../tema/tema.js';

export function resolverTema(): Promise<Tema> {
  if (typeof document === 'undefined') return Promise.resolve(TEMA_POR_DEFECTO);
  return Promise.resolve(temaDeCookies(document.cookie));
}
