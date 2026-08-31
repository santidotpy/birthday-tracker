import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { beforeEach, describe, expect, it } from 'vitest';
import { crearDb, type Db } from '../db/index.js';
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
