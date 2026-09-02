/**
 * La sesión del demo estático: no hay ninguna, y lo dice.
 *
 * Reemplaza a `src/servidor/sesion.ts` por alias de Vite cuando el build lleva
 * `VITE_DEMO=1`. Ver `docs/adr/0008-el-demo-es-un-modo-de-build.md`.
 *
 * El panel de administración no puede andar sin servidor: escribe en SQLite y
 * baja Retratos, las dos cosas de Node. La alternativa era sacar las rutas del
 * build, y se descartó: `/entrar` es parte del producto y prerenderiza a una
 * pantalla de login perfectamente real. Lo que no puede pasar es que el botón
 * tire un error de red crudo, así que se explica en castellano.
 */

/** Repetido y no importado del original a propósito: en el demo ese módulo se
 *  reemplaza por éste, y un import a sí mismo es un círculo esperando pasar. */
export interface Administrador {
  email: string;
  nombre: string;
}

const SIN_SERVIDOR =
  'Este es el demo y no tiene servidor: el panel de administración sólo anda en una instalación de verdad.';

/** Nunca hay sesión: el demo siempre rebota al login. */
export function sesionActual(): Promise<Administrador | null> {
  return Promise.resolve(null);
}

export function iniciarSesion(): Promise<Administrador> {
  return Promise.reject(new Error(SIN_SERVIDOR));
}

export function cerrarSesion(): Promise<null> {
  return Promise.resolve(null);
}

export function cambiarEmail(): Promise<Administrador> {
  return Promise.reject(new Error(SIN_SERVIDOR));
}

export function cambiarContrasena(): Promise<null> {
  return Promise.reject(new Error(SIN_SERVIDOR));
}


