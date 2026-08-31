/**
 * Better Auth. El único que se autentica es el Administrador (ver `CONTEXT.md`);
 * los Integrantes no tienen credenciales y nunca inician sesión.
 */

import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { crearDb, db, esquema, type Db } from '../db/index.js';

const secreto = process.env.BETTER_AUTH_SECRET;
if (!secreto && process.env.NODE_ENV === 'production') {
  throw new Error('Falta BETTER_AUTH_SECRET');
}

interface Opciones {
  /**
   * La app no tiene registro público: es interna y el único Administrador se
   * siembra con `pnpm seed:admin`. Ese script es el único que abre el registro,
   * y lo hace sobre su propia instancia.
   */
  permitirRegistro?: boolean;
  base?: Db;
}

export function crearAuth({ permitirRegistro = false, base }: Opciones = {}) {
  return betterAuth({
    database: drizzleAdapter(base ?? db(), { provider: 'sqlite', schema: esquema }),
    secret: secreto ?? 'secreto-solo-para-desarrollo-no-usar-en-produccion',
    baseURL: process.env.BETTER_AUTH_URL ?? 'http://localhost:3000',
    emailAndPassword: {
      enabled: true,
      disableSignUp: !permitirRegistro,
    },
  });
}

export const auth = crearAuth();

export type Auth = ReturnType<typeof crearAuth>;
export { crearDb };
