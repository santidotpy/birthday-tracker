---
status: accepted
---

# TanStack Start con SQLite

La app necesita un panel de administración autenticado, así que hay servidor. Elegimos TanStack Start sobre Next.js, y SQLite sobre Postgres.

## Considered Options

**Next.js** aporta RSC, streaming y optimización de imágenes: nada de eso se aprovecha acá, porque los datos son decenas de filas que cambian unas pocas veces al año. Lo que sí aportaría es la carga conceptual de la frontera server/client y su semántica de caché. TanStack Start da server functions para el CRUD sin montar una API aparte y sin esa carga.

**Postgres** sería un servicio más para administrar en el server de la empresa a cambio de nada: el dataset son ~50 filas sin concurrencia de escritura. SQLite es un archivo, y el backup es copiarlo.

También se consideró **no tener servidor** (Vite + TanStack Router y los datos en un JSON commiteado). Se descartó porque el Administrador tiene que poder dar de alta y editar Integrantes sin abrir un pull request.

## Consequences

- TanStack Start está en Release Candidate de v1 al momento de decidir esto, con API estable. Es un riesgo aceptado.
- El estado vive en un único archivo SQLite en el server de Coolify. Si ese archivo se pierde sin backup, se pierde todo.
