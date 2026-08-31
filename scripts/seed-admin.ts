/**
 * Siembra el único Administrador. Idempotente.
 *
 * Usa la API de Better Auth en vez de escribir en la tabla `account` a mano,
 * para que el hash de la contraseña lo haga quien sabe hacerlo.
 */

import { eq } from 'drizzle-orm';
import { crearAuth } from '../src/auth/servidor.js';
import { db } from '../src/db/index.js';
import { account, user } from '../src/db/schema-auth.js';

const email = process.env.ADMIN_EMAIL;
const password = process.env.ADMIN_PASSWORD;
const nombre = process.env.ADMIN_NAME ?? 'Administrador';

if (!email || !password) {
  console.error('Faltan ADMIN_EMAIL y/o ADMIN_PASSWORD.');
  console.error('Ejemplo: ADMIN_EMAIL=vos@empresa.com ADMIN_PASSWORD=... pnpm seed:admin');
  process.exit(1);
}

const base = db();
const existente = base.select().from(user).where(eq(user.email, email)).get();

if (existente) {
  // Un usuario sin credencial es un alta que se cortó por la mitad. Tratarlo
  // como "ya está" deja la cuenta inutilizable y sin forma de recrearla.
  const credencial = base
    .select()
    .from(account)
    .where(eq(account.userId, existente.id))
    .all()
    .find((c) => c.providerId === 'credential');

  if (credencial) {
    console.log(`Ya existe un administrador con ${email}. Nada que hacer.`);
    process.exit(0);
  }

  console.warn(`Había un alta incompleta para ${email}. Se descarta y se rehace.`);
  base.delete(user).where(eq(user.id, existente.id)).run();
}

const auth = crearAuth({ permitirRegistro: true, base });

try {
  await auth.api.signUpEmail({ body: { email, password, name: nombre } });
} catch (error) {
  // No dejar el usuario colgado sin credencial para el próximo intento.
  base.delete(user).where(eq(user.email, email)).run();
  throw error;
}

console.log(`Administrador creado: ${email}`);
