/**
 * Esquema del dominio. Ver `CONTEXT.md` para el vocabulario.
 *
 * Las tablas de Better Auth viven en `schema-auth.ts`, generadas por su CLI.
 * No hay índices a propósito: son decenas de filas y un índice de más es
 * mantenimiento sin contrapartida.
 */

import { sql } from 'drizzle-orm';
import { check, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const integrantes = sqliteTable(
  'integrantes',
  {
    id: text('id').primaryKey(),
    nombre: text('nombre').notNull(),

    /** Fecha de cumpleaños: día y mes. Sin año, a propósito (ronda 2). */
    mesCumple: integer('mes_cumple').notNull(),
    diaCumple: integer('dia_cumple').notNull(),

    /** Nombre del archivo del Retrato que guarda la app. Ver ADR 0001. */
    retrato: text('retrato'),
    /** De dónde salió el Retrato. Solo procedencia: nada del render lo usa. */
    retratoOrigen: text('retrato_origen'),

    /** Decorativo. No entra en el cálculo de fechas. Ver ADR 0003. */
    pais: text('pais'),

    /**
     * Un Integrante Archivado conserva sus datos y desaparece de las vistas.
     * Timestamp en vez de booleano: la pregunta binaria sigue siendo trivial
     * (`archivadoEn !== null`) y además queda registrado cuándo fue.
     */
    archivadoEn: integer('archivado_en', { mode: 'timestamp' }),

    creadoEn: integer('creado_en', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
    actualizadoEn: integer('actualizado_en', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [
    // Red de seguridad. La validación real (incluido que el 29/02 vale y el
    // 31/04 no) vive en `esMesDiaValido`, que la base no puede expresar.
    check('mes_valido', sql`${t.mesCumple} between 1 and 12`),
    check('dia_valido', sql`${t.diaCumple} between 1 and 31`),
  ],
);

export type FilaIntegrante = typeof integrantes.$inferSelect;
export type NuevaFilaIntegrante = typeof integrantes.$inferInsert;
