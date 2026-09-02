# 0008 — El demo es un modo de build, no una rama

## Decisión

El demo público sale del mismo `main` que la app, con `VITE_DEMO=1`. Ese build
reemplaza tres módulos por alias de Vite y no toca nada más. No hay rama `demo`.

## Motivo

Una rama de larga vida hay que **fusionarla para siempre**, y los conflictos
caen justo en los archivos que el demo modifica. La primera vez que resolverlos
da pereza, el demo queda viejo — y un demo viejo miente sobre el producto, que
es peor que no tenerlo.

Con un modo de build el CI compila el demo en cada push a `main`: si un cambio
lo rompe, se ve en el PR y no tres meses después por un issue.

## Por qué alcanza con tres módulos

Porque las pantallas públicas ya casi no tocaban el servidor. `src/domain/` es
puro y corre de los dos lados (ADR 0002), así que la Agenda, el Próximo
cumpleaños y la cuenta regresiva siempre se calcularon en el cliente. Lo único
que viajaba era la lista de Integrantes.

| Módulo | En el demo |
| --- | --- |
| `servidor/consultas.ts` | Lee `src/demo/datos.json` en vez de la base |
| `servidor/tema.ts` | Lee la cookie del documento; sin pedido no hay cookie del pedido |
| `servidor/sesion.ts` | No hay sesión, y el login lo explica en castellano |

Los alias van por expresión regular y no por prefijo de texto porque el mismo
módulo se importa desde profundidades distintas.

## Consecuencias

**La raíz se sirve como cáscara de SPA, no prerenderizada, y es lo correcto.**
Esta pantalla muestra el cumpleaños de *hoy*: prerenderizarla dejaría clavado el
día del build y el demo mostraría para siempre a quien cumplía cuando se
compiló. La cáscara hidrata y calcula el día en el navegador.

**`?hoy=AAAA-MM-DD` existe sólo en el demo.** Con cuarenta personas repartidas
en el año, quien lo abre cae en un cumpleaños una vez de cada doce: sin el
parámetro, casi nadie vería el confeti, que es el mejor momento de la app.
Navegar a `/2026-06-24` no sirve para eso, porque esa ruta muestra de quién fue
el cumpleaños con `esHoy` en false y sin festejo — que es la decisión de
producto correcta y exactamente lo contrario de lo que un demo necesita. La
guarda es `import.meta.env.VITE_DEMO`, que Vite resuelve al compilar: en el
build normal es código muerto y no llega al bundle.

**El panel de administración no anda en el demo, a propósito.** Escribe en
SQLite y baja Retratos, las dos cosas de Node. Se evaluó sacar las rutas del
build y se descartó: `/entrar` es parte del producto y prerenderiza a una
pantalla de login real. Lo que no puede pasar es un error de red crudo al tocar
el botón, así que el stub contesta en castellano.

**Los Retratos del demo van vacíos.** Sin foto la app muestra las iniciales
sobre un color derivado del nombre, que es una función real y no un placeholder.
Agregar fotos es agregar archivos a `public/retratos/` y el nombre al JSON.

**`Retrato.tsx` arma la URL con `import.meta.env.BASE_URL`.** GitHub Pages sirve
en `/<repo>/`; con el camino absoluto de antes, ahí las fotos daban 404.

## Alternativas descartadas

**Rama `demo` de larga vida.** El motivo está arriba: se desincroniza sola.

**Hostearlo en Vercel con base hosteada.** Sería la única forma de que el panel
funcione, y pide Turso más almacenamiento de objetos porque el filesystem de una
función serverless es efímero. Se descartó porque un demo que corre sobre una
arquitectura que la app no usa engaña más de lo que muestra: lo que este
proyecto propone es un archivo SQLite en un server propio.

**Rama `gh-pages` con el build commiteado.** Innecesaria: `actions/deploy-pages`
sube el artefacto sin que el repo guarde nada.
