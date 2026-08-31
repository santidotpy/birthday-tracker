import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
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

let instancia: Db | undefined;

/** La base de la app. Perezosa, para que los tests puedan usar la suya. */
export function db(): Db {
  instancia ??= crearDb(RUTA_DB);
  return instancia;
}
