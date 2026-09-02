import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * Guardas sobre `servidor/produccion.mjs`, que ningún test puede ejercitar:
 * importa `dist/server/server.js`, que sólo existe después de `pnpm build`, y
 * lo que se quiere fijar acá son dos líneas que *parecen* errores y se borran
 * solas en la próxima limpieza.
 *
 * Las dos fallan únicamente en producción y con el volumen recién montado, que
 * es el peor momento para descubrirlas.
 */
describe('la entrada de producción', () => {
  const fuente = readFileSync(new URL('../../servidor/produccion.mjs', import.meta.url), 'utf8');

  it('sirve los Retratos mirando el disco en cada pedido', () => {
    // `sirv` sin `dev` arma el índice de archivos una sola vez, al arrancar.
    // La carpeta de Retratos crece mientras el proceso vive: sin `dev: true`,
    // cada foto que sube el Administrador queda en 404 hasta el reinicio.
    expect(
      fuente,
      'los Retratos necesitan `dev: true` en sirv o quedan en 404 hasta reiniciar',
    ).toContain("sirv(RUTA_RETRATOS, { dev: true, etag: true })");
  });

  it('crea la carpeta de Retratos antes de construir el servidor de archivos', () => {
    // `sirv` recorre la carpeta al construirse. En un volumen recién montado no
    // existe, y el proceso muere con ENOENT antes de contestar nada.
    const creacion = fuente.indexOf('mkdirSync(RUTA_RETRATOS');
    const uso = fuente.indexOf('sirv(RUTA_RETRATOS');

    expect(creacion, 'falta crear RETRATOS_PATH: el primer despliegue muere con ENOENT').toBeGreaterThan(-1);
    expect(creacion, 'la carpeta se tiene que crear antes de que sirv la recorra').toBeLessThan(uso);
  });
});
