/**
 * Rehace la cuenta del Administrador desde cero.
 *
 * Existe porque la app no manda correos: si se pierde la contraseña no hay
 * "olvidé mi clave" que valga, y la guardada es un hash que no se puede leer.
 * Este script es la única salida, y se corre desde el server con acceso a la
 * base — o sea que quien lo corre ya tiene acceso a todo igual.
 *
 * Borra la cuenta que haya y crea una nueva con `ADMIN_EMAIL` y
 * `ADMIN_PASSWORD`. No toca los Integrantes: son tablas distintas.
 */

import { crearAuth } from '../src/auth/servidor.js';
import { db } from '../src/db/index.js';
import { session, user } from '../src/db/schema-auth.js';

const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD;
const nombre = process.env.ADMIN_NAME ?? 'Administrador';

if (!email || !password) {
  console.error('Faltan ADMIN_EMAIL y/o ADMIN_PASSWORD.');
  console.error('Ejemplo: ADMIN_EMAIL=vos@empresa.com ADMIN_PASSWORD=... pnpm admin:reset');
  process.exit(1);
}

const base = db();

// Las credenciales cuelgan del usuario con borrado en cascada, así que sacando
// al usuario se va también su `account`. Las sesiones se limpian aparte para
// que no quede ninguna pestaña vieja con acceso.
const previos = base.select({ email: user.email }).from(user).all();
base.delete(session).run();
base.delete(user).run();

for (const previo of previos) console.log(`Se borró la cuenta de ${previo.email}.`);

const auth = crearAuth({ permitirRegistro: true, base });

try {
  await auth.api.signUpEmail({ body: { email, password, name: nombre } });
} catch (error) {
  // El motivo más común es la longitud mínima, y el mensaje de Better Auth no
  // lo dice tan claro como conviene a las dos de la mañana.
  console.error('\nNo se pudo crear la cuenta:', (error as Error).message);
  console.error('La contraseña tiene que tener al menos 8 caracteres.');
  process.exit(1);
}

console.log(`\nListo. Entrá con ${email} y la contraseña de ADMIN_PASSWORD.`);
console.log('Podés cambiarlas después desde el panel, en el botón "Cuenta".');
