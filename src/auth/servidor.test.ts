import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { beforeEach, describe, expect, it } from 'vitest';
import { crearDb, type Db } from '../db/index.js';
import { cambiarEmailDeUsuario } from './cuenta.js';
import { crearAuth } from './servidor.js';

const EMAIL = 'admin@empresa.com';
const CLAVE = 'clave-de-prueba-larga-123';

let base: Db;

/** Hace lo mismo que `pnpm seed:admin`: abre el registro solo para el alta. */
async function sembrarAdmin() {
  const auth = crearAuth({ permitirRegistro: true, base });
  await auth.api.signUpEmail({ body: { email: EMAIL, password: CLAVE, name: 'Admin' } });
}

beforeEach(() => {
  base = crearDb(':memory:');
  migrate(base, { migrationsFolder: './drizzle' });
});

describe('el Administrador sembrado', () => {
  it('puede iniciar sesión con su contraseña', async () => {
    await sembrarAdmin();
    const auth = crearAuth({ base });
    const sesion = await auth.api.signInEmail({ body: { email: EMAIL, password: CLAVE } });
    expect(sesion.user.email).toBe(EMAIL);
    expect(sesion.token).toBeTruthy();
  });

  it('no entra con la contraseña equivocada', async () => {
    await sembrarAdmin();
    const auth = crearAuth({ base });
    await expect(
      auth.api.signInEmail({ body: { email: EMAIL, password: 'la-que-no-es' } }),
    ).rejects.toThrow();
  });
});

describe('el registro público', () => {
  it('está cerrado: nadie más puede crearse una cuenta', async () => {
    await sembrarAdmin();
    const auth = crearAuth({ base });
    await expect(
      auth.api.signUpEmail({
        body: { email: 'intruso@empresa.com', password: 'otra-clave-larga-123', name: 'Intruso' },
      }),
    ).rejects.toThrow();
  });

  it('sigue cerrado incluso sin ningún administrador sembrado', async () => {
    const auth = crearAuth({ base });
    await expect(
      auth.api.signUpEmail({
        body: { email: 'intruso@empresa.com', password: 'otra-clave-larga-123', name: 'Intruso' },
      }),
    ).rejects.toThrow();
  });
});

// --- La cuenta se puede cambiar desde adentro -------------------------------

/** Entra y devuelve las cabeceras con la cookie de sesión, como haría el navegador. */
async function entrar(clave = CLAVE, email = EMAIL): Promise<Headers> {
  const auth = crearAuth({ base });
  const respuesta = await auth.api.signInEmail({
    body: { email, password: clave },
    asResponse: true,
  });
  expect(respuesta.ok, 'debería poder entrar').toBe(true);
  const cabeceras = new Headers();
  cabeceras.set('cookie', respuesta.headers.getSetCookie().map((c) => c.split(';')[0]).join('; '));
  return cabeceras;
}

describe('cambiar la contraseña', () => {
  const NUEVA = 'otra-clave-igual-de-larga-456';

  it('la reemplaza, y la vieja deja de servir', async () => {
    await sembrarAdmin();
    const auth = crearAuth({ base });

    await auth.api.changePassword({
      body: { currentPassword: CLAVE, newPassword: NUEVA },
      headers: await entrar(),
    });

    const sesion = await auth.api.signInEmail({ body: { email: EMAIL, password: NUEVA } });
    expect(sesion.user.email).toBe(EMAIL);
    await expect(
      auth.api.signInEmail({ body: { email: EMAIL, password: CLAVE } }),
    ).rejects.toThrow();
  });

  it('no la cambia si la actual está mal', async () => {
    await sembrarAdmin();
    const auth = crearAuth({ base });

    await expect(
      auth.api.changePassword({
        body: { currentPassword: 'la-que-no-es', newPassword: NUEVA },
        headers: await entrar(),
      }),
    ).rejects.toThrow();

    // Y la original sigue andando: un intento fallido no deja la cuenta a medias.
    const sesion = await auth.api.signInEmail({ body: { email: EMAIL, password: CLAVE } });
    expect(sesion.user.email).toBe(EMAIL);
  });
});

describe('cambiar el email', () => {
  const NUEVO = 'santiago@empresa.com';

  it('lo reemplaza y se entra con el nuevo', async () => {
    await sembrarAdmin();
    const auth = crearAuth({ base });
    const { id } = (await auth.api.signInEmail({ body: { email: EMAIL, password: CLAVE } })).user;

    await cambiarEmailDeUsuario(base, id, NUEVO);

    const sesion = await auth.api.signInEmail({ body: { email: NUEVO, password: CLAVE } });
    expect(sesion.user.email).toBe(NUEVO);
  });

  it('el email viejo deja de entrar', async () => {
    await sembrarAdmin();
    const auth = crearAuth({ base });
    const { id } = (await auth.api.signInEmail({ body: { email: EMAIL, password: CLAVE } })).user;

    await cambiarEmailDeUsuario(base, id, NUEVO);

    await expect(
      auth.api.signInEmail({ body: { email: EMAIL, password: CLAVE } }),
    ).rejects.toThrow();
  });

  it('no rompe la contraseña ni la credencial', async () => {
    // La credencial cuelga del id del usuario, no del email. Si algún día eso
    // cambiara, este test avisa antes de que alguien quede afuera de su app.
    await sembrarAdmin();
    const auth = crearAuth({ base });
    const { id } = (await auth.api.signInEmail({ body: { email: EMAIL, password: CLAVE } })).user;

    await cambiarEmailDeUsuario(base, id, NUEVO);
    const sesion = await auth.api.signInEmail({ body: { email: NUEVO, password: CLAVE } });
    expect(sesion.user.id).toBe(id);
  });

  it('lo guarda normalizado, así el tipeo con mayúsculas igual entra', async () => {
    await sembrarAdmin();
    const auth = crearAuth({ base });
    const { id } = (await auth.api.signInEmail({ body: { email: EMAIL, password: CLAVE } })).user;

    const guardado = await cambiarEmailDeUsuario(base, id, '  Santiago@Empresa.COM ');
    expect(guardado).toBe(NUEVO);

    const sesion = await auth.api.signInEmail({ body: { email: NUEVO, password: CLAVE } });
    expect(sesion.user.email).toBe(NUEVO);
  });

  it('rechaza lo que no es un email antes de tocar la base', async () => {
    await sembrarAdmin();
    const auth = crearAuth({ base });
    const { id } = (await auth.api.signInEmail({ body: { email: EMAIL, password: CLAVE } })).user;

    for (const basura of ['', '   ', 'admin', 'admin@', '@empresa.com', 'a b@c.com']) {
      await expect(cambiarEmailDeUsuario(base, id, basura), basura).rejects.toThrow();
    }

    // Y el original sigue entrando: un intento inválido no deja nada a medias.
    const sesion = await auth.api.signInEmail({ body: { email: EMAIL, password: CLAVE } });
    expect(sesion.user.email).toBe(EMAIL);
  });
});
