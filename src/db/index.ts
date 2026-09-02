import { existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as auth from './schema-auth.js';
import * as dominio from './schema.js';

export const esquema = { ...dominio, ...auth };

/** Abre una base en un archivo, o en memoria si se le pasa `:memory:`. */
export function crearDb(ruta: string) {
  const sqlite = new Database(ruta);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');
  return drizzle(sqlite, { schema: esquema });
}

export type Db = ReturnType<typeof crearDb>;

export const RUTA_DB = process.env.DATABASE_PATH ?? './birthday-tracker.sqlite';

/** Dónde están los SQL que genera `pnpm db:generate`. */
const RUTA_MIGRACIONES = process.env.MIGRATIONS_PATH ?? './drizzle';

/**
 * Deja la base lista para usar: crea la carpeta si hace falta y aplica las
 * migraciones que falten.
 *
 * Esto corre al abrir la base, no en un paso aparte del despliegue, porque
 * `new Database()` **crea el archivo en vez de fallar** cuando no existe. Sin
 * migrar acá, un volumen recién montado daba una base vacía sin tablas y la
 * primera consulta moría con `no such table: integrantes` — una pantalla de
 * error en inglés en la TV de la oficina. Migrando, el mismo caso arranca en
 * la pantalla de "Todavía no hay nadie", que es lo que corresponde.
 */
function prepararLaBase(ruta: string): Db {
  const nueva = ruta !== ':memory:' && !existsSync(ruta);

  if (nueva) {
    mkdirSync(dirname(resolve(ruta)), { recursive: true });
    // La distinción importa: en el primer despliegue esto es normal, y en el
    // segundo significa que el volumen no quedó montado y se perdieron los
    // cumpleaños. Desde afuera las dos se ven igual: una app vacía.
    console.warn(`[base] No existía ${ruta}. Se crea una nueva y vacía.`);
  }

  const base = crearDb(ruta);
  migrate(base, { migrationsFolder: RUTA_MIGRACIONES });
  return base;
}

let instancia: Db | undefined;

/** La base de la app. Perezosa, para que los tests puedan usar la suya. */
export function db(): Db {
  instancia ??= prepararLaBase(RUTA_DB);
  return instancia;
}
