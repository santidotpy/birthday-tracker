/**
 * El tema que le corresponde a este pedido, resuelto en el servidor para que
 * el HTML salga ya con el tema puesto y no haya un fogonazo al hidratar.
 */

import { createServerFn } from '@tanstack/react-start';
import { type Tema, TEMA_POR_DEFECTO, cookieDeTema, temaDeCookies, temaONada } from '../tema/tema.js';

/**
 * Prioridad: primero `?tema=` en la URL, después la cookie.
 *
 * El parámetro existe por la TV. Una pantalla colgada en la pared no tiene a
 * nadie que le toque un selector, y el kiosco arranca reportando tema claro
 * porque `prefers-color-scheme` no sabe que es un televisor. Con la URL,
 * quien la deja configurada la pincha una vez y queda: al verla, el servidor
 * además guarda la cookie, así que sigue andando aunque después se abra sin
 * el parámetro.
 */
export const resolverTema = createServerFn({ method: 'GET' }).handler(async (): Promise<Tema> => {
  const { getRequest, setResponseHeader } = await import('@tanstack/react-start/server');

  const pedido = getRequest();
  if (!pedido) return TEMA_POR_DEFECTO;

  const enLaUrl = temaONada(new URL(pedido.url).searchParams.get('tema'));
  if (enLaUrl) {
    setResponseHeader('set-cookie', cookieDeTema(enLaUrl));
    return enLaUrl;
  }

  return temaDeCookies(pedido.headers.get('cookie'));
});
