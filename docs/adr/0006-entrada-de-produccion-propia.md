---
status: accepted
---

# La entrada de producción es propia

`servidor/produccion.mjs` es un servidor Node de unas cincuenta líneas que sirve tres cosas: los Retratos desde el volumen persistente, el bundle del cliente, y todo lo demás delegado al handler `fetch` que produce el build de TanStack Start.

## Considered Options

Usar la entrada por defecto de Start era lo natural y no alcanza. Los Retratos viven en un volumen que se monta en tiempo de ejecución (ADR 0001), fuera del build: ni Vite ni el bundle los conocen, y `public/` se copia al compilar, así que un archivo escrito después de compilar no se serviría nunca.

También se evaluó servir los Retratos desde el proxy reverso de Coolify. Se descartó porque parte del comportamiento de la app quedaría en configuración de infraestructura, invisible desde el repo y distinta en desarrollo.

`sirv` se encarga de los content-type y de que una ruta no se escape del directorio. No reimplementamos eso.

## Consequences

- El mismo módulo se usa en desarrollo, montado como middleware de Vite en `vite.config.ts`. Los Retratos se sirven igual de los dos lados, que era el punto.
- Los nombres de Retrato son UUID y nunca se reescriben —reemplazar una foto genera un nombre nuevo—, así que se sirven con `immutable` y un año de caché.
- Si Start incorpora rutas de servidor para archivos, esto se puede tirar. Mientras tanto, es la única pieza del deploy que hay que mantener a mano.
