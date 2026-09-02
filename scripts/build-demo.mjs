/**
 * Arma el demo estático en `dist/client`, listo para GitHub Pages.
 *
 * Es un script y no una línea en `package.json` por dos motivos: poner la
 * variable de entorno adelante del comando no anda en Windows, y después del
 * build hay que acomodar dos archivos que Pages necesita y Vite no emite.
 *
 * Ver `docs/adr/0008-el-demo-es-un-modo-de-build.md`.
 */

import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const SALIDA = join(process.cwd(), 'dist', 'client');

const build = spawnSync('pnpm', ['vite', 'build'], {
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, VITE_DEMO: '1' },
});

if (build.status !== 0) process.exit(build.status ?? 1);

/**
 * `spa` deja la cáscara en `_shell.html` y no emite `index.html`, porque en un
 * servidor de verdad la sirve él para cualquier ruta que no prerenderizó.
 *
 * En Pages no hay quien haga eso, así que la cáscara se copia a los dos
 * archivos que Pages sí sabe servir: `index.html` para la raíz y `404.html`
 * para todo lo demás, que es como se hace andar un deep link como
 * `/2026-06-24` en un hosting estático.
 *
 * Que la raíz sea la cáscara y no HTML prerenderizado es lo correcto acá, y no
 * una limitación: esta pantalla muestra el cumpleaños de HOY. Prerenderizarla
 * dejaría clavado el día del build, y el demo mostraría para siempre a quien
 * cumplía el día que se compiló.
 */
const shell = join(SALIDA, '_shell.html');
if (!existsSync(shell)) {
  console.error(`\nNo se generó ${shell}. ¿Sigue prendido "spa" en vite.config.ts?\n`);
  process.exit(1);
}

copyFileSync(shell, join(SALIDA, 'index.html'));
copyFileSync(shell, join(SALIDA, '404.html'));

// Sin esto Pages pasa todo por Jekyll, que se saltea los archivos y carpetas
// que empiezan con guión bajo — incluido el propio `_shell.html`.
writeFileSync(join(SALIDA, '.nojekyll'), '');

console.log('\nDemo listo en dist/client (index.html, 404.html, .nojekyll)\n');
