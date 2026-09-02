/**
 * Cambiar el email del Administrador.
 *
 * Better Auth tiene `changeEmail`, pero en 1.7 exige un mailer configurado
 * aunque el email todavía no esté verificado: sin él contesta
 * "Verification email isn't enabled" y no cambia nada. Esta app no manda
 * correos por decisión de producto, así que el cambio se hace sobre la fila.
 *
 * Es seguro hacerlo a mano: `account.account_id` guarda el id del usuario, no
 * el email, y las sesiones cuelgan de `user_id`. O sea que cambiar el email no
 * desengancha la credencial ni voltea la sesión abierta —el email es sólo el
 * nombre con el que se entra—.
 */

import { eq } from 'drizzle-orm';
import type { Db } from '../db/index.js';
import { user } from '../db/schema-auth.js';

/**
 * Normaliza igual que al entrar. Sin esto, guardar `Admin@Empresa.com` y
 * después tipear `admin@empresa.com` no encontraría al usuario.
 */
export function normalizarEmail(valor: string): string {
  return valor.trim().toLowerCase();
}

/** Lo mínimo para no guardar algo con lo que después no se pueda entrar. */
export function pareceEmail(valor: string): boolean {
  const limpio = normalizarEmail(valor);
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(limpio);
}

export async function cambiarEmailDeUsuario(
  base: Db,
  idUsuario: string,
  nuevoEmail: string,
): Promise<string> {
  const email = normalizarEmail(nuevoEmail);
  if (!pareceEmail(email)) throw new Error('Ese email no parece válido');

  const [fila] = await base
    .update(user)
    .set({ email, updatedAt: new Date() })
    .where(eq(user.id, idUsuario))
    .returning({ email: user.email });

  if (!fila) throw new Error('No se encontró la cuenta');
  return fila.email;
}
