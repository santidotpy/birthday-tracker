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

/**
 * Cambia el email del Administrador.
 *
 * Alcanza con la sesión, sin volver a pedir la contraseña, por coherencia: el
 * mismo panel deja archivar a todo el mundo con la sesión sola. El email acá
 * es sólo el nombre con el que se entra.
 *
 * No pasa por `auth.api.changeEmail` a propósito; el porqué está en
 * `src/auth/cuenta.ts`.
 */
export const cambiarEmail = createServerFn({ method: 'POST' })
  .validator((datos: { email: string }) => datos)
  .handler(async ({ data }): Promise<Administrador> => {
    const { getRequest } = await import('@tanstack/react-start/server');
    const { auth } = await import('../auth/servidor.js');

    const { cambiarEmailDeUsuario } = await import('../auth/cuenta.js');
    const { db } = await import('../db/index.js');

    const headers = getRequest().headers;
    const sesion = await auth.api.getSession({ headers });
    if (!sesion) throw new Error('Tenés que entrar primero');

    const email = await cambiarEmailDeUsuario(db(), sesion.user.id, data.email);
    return { email, nombre: sesion.user.name };
  });

/**
 * Cambia la contraseña. Pide la actual: es la única operación del panel donde
 * el daño de que alguien se siente en la sesión abierta no se puede deshacer
 * —te deja afuera de tu propia app—, así que acá sí vale volver a preguntar.
 */
export const cambiarContrasena = createServerFn({ method: 'POST' })
  .validator((datos: { actual: string; nueva: string }) => datos)
  .handler(async ({ data }): Promise<null> => {
    const { getRequest } = await import('@tanstack/react-start/server');
    const { auth } = await import('../auth/servidor.js');

    const headers = getRequest().headers;
    if (!(await auth.api.getSession({ headers }))) throw new Error('Tenés que entrar primero');

    const respuesta = await auth.api.changePassword({
      body: { currentPassword: data.actual, newPassword: data.nueva },
      headers,
      asResponse: true,
    });

    if (!respuesta.ok) throw new Error(await motivo(respuesta));

    await reenviarCookies(respuesta);
    return null;
  });

/**
 * Traduce lo que contesta Better Auth.
 *
 * Sus mensajes son en inglés y no se pueden configurar, así que dejarlos pasar
 * mete un "Invalid password" en medio de una pantalla en castellano. Sólo se
 * traduce lo que puede pasar de verdad acá; cualquier otra cosa cae en un
 * mensaje propio en vez de filtrar el original.
 */
async function motivo(respuesta: Response): Promise<string> {
  let original = '';
  try {
    original = ((await respuesta.clone().json()) as { message?: string }).message ?? '';
  } catch {
    // Sin cuerpo JSON no hay nada que traducir; queda el mensaje por defecto.
  }

  const traducciones: Record<string, string> = {
    'invalid password': 'La contraseña actual no es correcta',
    'password too short': 'La contraseña nueva es demasiado corta',
    'password too long': 'La contraseña nueva es demasiado larga',
  };

  return traducciones[original.trim().toLowerCase()] ?? 'No se pudo cambiar la contraseña';
}
