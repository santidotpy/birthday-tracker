/**
 * Sesión del Administrador.
 *
 * Better Auth se usa desde server functions en vez de montar su handler HTTP:
 * así todo pasa por el mismo camino ya verificado y las entradas de
 * `servidor/produccion.mjs` y de Vite no tienen que saber nada de auth.
 * El precio es reenviar a mano las cookies que Better Auth emite.
 */

import { createServerFn } from '@tanstack/react-start';

export interface Administrador {
  email: string;
  nombre: string;
}

/** Reenvía las cookies que emitió Better Auth a la respuesta de la app. */
async function reenviarCookies(respuesta: Response) {
  const { setResponseHeader } = await import('@tanstack/react-start/server');
  const cookies = respuesta.headers.getSetCookie();
  if (cookies.length > 0) setResponseHeader('set-cookie', cookies);
}

export const sesionActual = createServerFn({ method: 'GET' }).handler(
  async (): Promise<Administrador | null> => {
    const { getRequest } = await import('@tanstack/react-start/server');
    const { auth } = await import('../auth/servidor.js');
    const sesion = await auth.api.getSession({ headers: getRequest().headers });
    return sesion ? { email: sesion.user.email, nombre: sesion.user.name } : null;
  },
);

export const iniciarSesion = createServerFn({ method: 'POST' })
  .validator((datos: { email: string; password: string }) => datos)
  .handler(async ({ data }): Promise<Administrador> => {
    const { auth } = await import('../auth/servidor.js');

    const respuesta = await auth.api.signInEmail({ body: data, asResponse: true });
    if (!respuesta.ok) {
      // El mensaje es a propósito el mismo para usuario inexistente y para
      // contraseña equivocada: no hay por qué confirmar qué emails existen.
      throw new Error('Email o contraseña incorrectos');
    }

    await reenviarCookies(respuesta);
    const { user } = (await respuesta.json()) as { user: { email: string; name: string } };
    return { email: user.email, nombre: user.name };
  });

export const cerrarSesion = createServerFn({ method: 'POST' }).handler(async () => {
  const { getRequest } = await import('@tanstack/react-start/server');
  const { auth } = await import('../auth/servidor.js');
  const respuesta = await auth.api.signOut({ headers: getRequest().headers, asResponse: true });
  await reenviarCookies(respuesta);
  return null;
});
