import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import viteReact from '@vitejs/plugin-react';
import sirv from 'sirv';
import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';

const RUTA_RETRATOS = process.env.RETRATOS_PATH ?? './datos/retratos';

/**
 * Sirve los Retratos en desarrollo igual que `servidor/produccion.mjs` en el
 * server: los archivos viven en un volumen fuera del build, así que ni Vite ni
 * el bundle los conocen. `sirv` se ocupa del content-type y de que un
 * `../../etc/passwd` no salga del directorio.
 */
function servirRetratos(): Plugin {
  return {
    name: 'servir-retratos',
    configureServer(servidor) {
      const estaticos = sirv(RUTA_RETRATOS, { dev: true, etag: true });
      servidor.middlewares.use('/retratos', (peticion, respuesta, siguiente) =>
        estaticos(peticion, respuesta, siguiente),
      );
    },
  };
}

/**
 * El demo estático: la misma app, con otra fuente de datos.
 *
 * Dos módulos se cambian por alias y nada más, porque son los dos únicos
 * puntos donde las pantallas públicas tocan el servidor. Ver
 * `docs/adr/0008-el-demo-es-un-modo-de-build.md`.
 *
 * El `base` es por GitHub Pages, que sirve en `/<repo>/` salvo dominio propio.
 */
const DEMO = process.env.VITE_DEMO === '1';

const rutaDe = (relativa: string) => fileURLToPath(new URL(relativa, import.meta.url));

/**
 * Los dos módulos que el demo reemplaza. La forma con expresión regular y no
 * con prefijo es a propósito: el mismo módulo se importa desde profundidades
 * distintas (`../servidor/…` desde las rutas), y un alias por prefijo de texto
 * no atrapa las dos.
 */
const aliasDelDemo = DEMO
  ? [
      { find: /(?:\.\.\/)+servidor\/consultas\.js$/, replacement: rutaDe('./src/demo/consultas.ts') },
      { find: /(?:\.\.\/)+servidor\/tema\.js$/, replacement: rutaDe('./src/demo/tema.ts') },
      { find: /(?:\.\.\/)+servidor\/sesion\.js$/, replacement: rutaDe('./src/demo/sesion.ts') },
    ]
  : [];

export default defineConfig({
  server: { port: 3000 },
  base: DEMO ? (process.env.DEMO_BASE ?? '/birthday-tracker/') : '/',
  /**
   * Los Retratos del demo son archivos del repo; los de la app de verdad viven
   * en el volumen y los sirve `servidor/produccion.mjs`.
   *
   * Por eso la carpeta pública existe sólo en el demo. Con la de Vite por
   * defecto (`public/`), esas fotos se copiaban **también al build normal** y
   * terminaban adentro de la imagen Docker de cualquiera que autohospede.
   */
  publicDir: DEMO ? rutaDe('./src/demo/publico') : false,
  define: { 'import.meta.env.VITE_DEMO': JSON.stringify(DEMO) },
  resolve: {
    alias: [
      ...aliasDelDemo,
      // TypeScript resuelve `@/` por tsconfig, pero el escaneo de dependencias
      // de Vite no lee esos paths: sin esto, en dev no encuentra los componentes.
      { find: '@', replacement: rutaDe('./src') },
    ],
  },
  plugins: [
    servirRetratos(),
    tailwindcss(),
    // En el demo no hay servidor que responda: `spa` emite una cáscara que
    // hidrata en el cliente, y con eso `/2026-06-24` anda igual. GitHub Pages
    // no tiene fallback de SPA, así que el workflow copia esa cáscara a
    // `404.html`, que es lo que Pages sirve cuando no encuentra el archivo.
    // `spa` emite la cáscara que hidrata en el cliente, y `prerender` es lo que
    // dispara su generación: con `spa` solo, no sale `_shell.html`.
    //
    // El base sale del workflow y anda con cualquiera de los dos: `/<repo>/`
    // cuando el sitio va en `usuario.github.io`, y `/` cuando hay dominio
    // propio y el sitio queda en la raíz. Los dos están probados.
    DEMO
      ? tanstackStart({ spa: { enabled: true }, prerender: { enabled: true } })
      : tanstackStart(),
    viteReact(),
  ],
  test: {
    // Los tests son de Node: no cargan el entorno del navegador. Los de
    // componentes usan `renderToStaticMarkup`, que tampoco lo necesita.
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
});
