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

export default defineConfig({
  server: { port: 3000 },
  // TypeScript resuelve `@/` por tsconfig, pero el escaneo de dependencias de
  // Vite no lee esos paths: sin esto, en dev no encuentra los componentes.
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  plugins: [servirRetratos(), tailwindcss(), tanstackStart(), viteReact()],
  test: {
    // Los tests son de Node: no cargan el entorno del navegador.
    include: ['src/**/*.test.ts'],
  },
});
