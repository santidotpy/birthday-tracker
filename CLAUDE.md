# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Idioma

**Todo el código está en castellano**: nombres de archivo, identificadores, tipos, comentarios, tests y mensajes de la interfaz. `Integrante`, `Retrato`, `cumpleaneros`, `proximaOcurrenciaEstricta`. Escribí código nuevo igual; mezclar inglés rompe la lectura del resto.

Las excepciones son las APIs de terceros (`createServerFn`, `useEffect`) y los componentes de `src/components/ui/`, que vienen generados por shadcn.

## Comandos

```bash
pnpm dev                              # Vite en :3000 (busca otro puerto si está ocupado)
pnpm build && pnpm start              # build + entrada propia de Node (ADR 0006)
pnpm typecheck                        # tsc --noEmit
pnpm test                             # vitest run
pnpm vitest run src/domain/fechas.test.ts   # un solo archivo
pnpm vitest run -t "el 29 de febrero"       # un solo caso, por nombre
pnpm db:generate                      # migración desde src/db/schema.ts
pnpm db:migrate
pnpm auth:generate                    # regenera src/db/schema-auth.ts desde Better Auth
pnpm seed:admin                       # crea el único administrador, con ADMIN_* del .env
```

Los tests corren en entorno Node, sin navegador. Los de componentes usan `renderToStaticMarkup`, que tampoco lo necesita.

Hay dos escenarios que sólo se ven levantando el server con el entorno cambiado, no con los tests: `DATABASE_PATH` a una carpeta nueva (tiene que arrancar vacío, no romperse) y `MIGRATIONS_PATH` a una que no existe (tiene que dar la pantalla de error en castellano).

## Dónde vive el porqué

- `CONTEXT.md` — el glosario del dominio. **Leelo antes de nombrar algo nuevo.** Fija distinciones que el código depende de que se respeten, sobre todo: el **Próximo cumpleaños** es estrictamente posterior a la fecha que se mira y nunca la incluye, mientras que la **Agenda** sí la incluye y arranca ahí, no en enero.
- `PRODUCT.md` — para quién es y qué decidió el Administrador.
- `docs/adr/` — siete decisiones difíciles de revertir, con el motivo. Si algo parece raro, probablemente esté explicado ahí.

## Arquitectura

### El dominio es puro y corre de los dos lados

`src/domain/` no importa nada de Node ni del navegador. Por eso el navegador puede calcular la Agenda, el Próximo cumpleaños y la cuenta regresiva sin pedirle nada al servidor: **lo único que viaja es la lista de Integrantes** (`src/servidor/consultas.ts`).

Dos reglas que se rompen fácil:

- **Toda fecha se evalúa en horario de Argentina** (ADR 0003), sin importar desde dónde se mire. La columna `pais` de un Integrante es decorativa a propósito.
- **La aritmética de fechas es propia** (ADR 0004). `MesDia` es día y mes sin año; `FechaSimple` es un día del calendario sin hora ni zona. `Date` aparece solamente en `hoyEnArgentina` e `inicioDelDiaEnArgentina`. No metas una librería de fechas ni un `Date` en el medio.

### El servidor son server functions, no rutas HTTP

No hay handlers de rutas: todo pasa por `createServerFn` (ADR 0007). Consecuencia importante:

> **Cada handler que toca datos de administración llama a `exigirAdministrador()` adentro del handler**, no solo en el `beforeLoad` de la ruta. Una server function es un endpoint HTTP invocable directo; la guarda de la ruta no la protege.

Usá `.validator()`, no el `.inputValidator()` deprecado.

### Los datos viven fuera del repo

`DATABASE_PATH` y `RETRATOS_PATH` apuntan al **mismo volumen persistente** de Coolify. Si `datos/` queda adentro del contenedor, cada redeploy borra los cumpleaños y las fotos.

`db()` migra al abrir, no en un paso aparte del despliegue. Es a propósito: `new Database()` **crea el archivo en vez de fallar**, así que sin migrar ahí un volumen recién montado daba una base sin tablas y la primera consulta moría con `no such table: integrantes`. Ahora ese caso arranca en la pantalla de "Todavía no hay nadie" y deja un `[base] No existía…` en el log — que es la única señal que distingue un primer despliegue de un volumen perdido.

**La carpeta `drizzle/` tiene que estar en la imagen.** Sin ella no hay migraciones que correr y la app entra en la pantalla de error.

**La base de desarrollo tiene personas reales de la empresa.** No inventes, completes ni reasignes sus datos —área, país, foto— sin que el Administrador los confirme.

### Ingesta de Retratos

El Administrador pega una URL y la app se queda con una copia propia (ADR 0001: las URLs firmadas de LinkedIn vencen). `src/retratos/ingesta.ts` bloquea la red privada antes de bajar nada y **revalida en cada redirección** (ADR 0005). El flag `permitirRedPrivada` existe solo para los tests, que levantan un servidor en 127.0.0.1: no lo expongas nunca en una ruta ni en un formulario.

### Tema

Cookie → servidor → `light-dark()`. `src/servidor/tema.ts` resuelve el tema del pedido (primero `?tema=` en la URL, después la cookie) y `__root.tsx` lo estampa como `data-tema` en el `<html>`, así el HTML sale ya con el tema puesto y no hay fogonazo. De ahí en más `estilos.css` traduce `data-tema` a `color-scheme`, y **todos los tokens son `light-dark()`**: no hay un bloque oscuro duplicado que se pueda desincronizar.

Si tocás el tema, las dos piezas tienen que seguir de acuerdo: los tokens `light-dark()` y el `@custom-variant dark`, que es lo que hace andar las clases `dark:` que traen los componentes de shadcn.

El cambio de tema pasa por `document.startViewTransition` con un `flushSync` adentro, para que el fondo no salte de golpe y para que el botón marcado del selector cambie en el mismo cuadro. Ese crossfade **no** va adentro de `prefers-reduced-motion`: es opacidad pura y suavizar el salto de brillo le importa más a quien pidió menos movimiento.

Mientras cruza, `contexto.tsx` pone `.cambiando-tema` en el `<html>` y `estilos.css` apaga con eso **todas** las transiciones. No es opcional: los componentes de shadcn traen `transition-colors`, y el panel del diálogo lleva `duration-200` sin `transition-property`, que en CSS es `transition: all 200ms`. Con eso puesto, la captura del estado nuevo sale con esos elementos todavía en el color viejo, y cada uno completa su interpolación **después** del crossfade — el diálogo se oscurece por partes. Hay guardas en `src/tema/contexto.test.ts`.

La paleta de iniciales (`src/retratos/iniciales.ts`) son **pares**, uno por tema, porque los colores que llevan texto blanco son todos oscuros y en tema oscuro el círculo del Retrato desaparecía contra el fondo. Los tests verifican contraste contra la tinta *y* contra el fondo de cada tema; si agregás un color, ellos deciden si entra.

### Motion

Una sola curva, `--sale`, para todo. La entrada de las pantallas es en cascada: `.entra` con `--retraso` por elemento, setenta milisegundos entre uno y otro, y el confeti espera a que el Retrato haya llegado para que se lea como un evento y no como dos.

Movimiento reducido conserva la cascada pero se queda solo con el fundido; el crossfade del tema tampoco se apaga, porque es opacidad pura.

Los dígitos de la cuenta regresiva **no** se animan, a propósito: cambian una vez por segundo y animarlos los haría ilegibles.

Los **Globos** son la única animación que se repite sola, y el porqué está en `Globos.tsx`. Tres cosas que se rompen fácil:

- **No flotan: suben una vez y se van.** El bucle es lo que la TV prendida ocho horas no soporta, igual que el confeti continuo. Lo que se repite es la *tanda*, cada media hora, no el globo.
- **El intervalo lo comparten con la revalidación de datos** (`INTERVALO_DE_FONDO_MS`, en `frescura.ts`). Es el mismo número a propósito: los dos existen porque una pantalla que nadie toca no dispara `focus`.
- **Nacen vacíos en el servidor** y todo se decide en el cliente. Es lo que resuelve a la vez el movimiento reducido —que el servidor no puede conocer— y la hidratación. Por eso tampoco hay `Math.random()` en la configuración: hay guardas en `Globos.test.ts`.

El confeti **no** acompaña las repeticiones: la llegada es el momento grande y las vueltas son recordatorios.

### La cuenta regresiva y la hidratación

Los números de `CuentaRegresiva` llevan `suppressHydrationWarning`. **No lo saques.** Son la hora: el servidor los pinta en un segundo y el navegador hidrata en el siguiente, así que nunca coinciden. Sin eso, React da la hidratación por fallida y **reconstruye toda la pantalla en el cliente**, dejando una ventana en la que los clics no hacen nada — el síntoma es que "Ver todos los cumpleaños" no abre.

No se ve en los tests: `renderToStaticMarkup` no hidrata, y la prop no deja rastro en el HTML. Se ve en la consola del navegador. Hay una guarda en `CuentaRegresiva.test.ts` que mira el archivo, que es lo único verificable sin navegador.

Regla general: cualquier cosa que dependa del reloj o del azar y se renderice en el servidor tiene el mismo problema.

### Tamaños: el destino es un televisor

Los techos de `clamp()` en `Retrato.tsx` y los pasos `2xl:` de tipografía existen porque esta pantalla vive en una TV de 2500px que se mira de lejos. Con los topes bajos de antes, todo quedaba del mismo tamaño en un celular que en la TV, flotando en un vacío enorme. Si tocás tamaños, miralo a 2500px de ancho, no solo en la laptop.

### Frescura

La app está pensada para quedar abierta días, y en algún momento meses en una TV. `src/componentes/frescura.ts` recalcula la fecha al cruzar la medianoche y revalida los datos al volver al frente. El intervalo de treinta minutos existe **por la TV**: una pantalla que nadie toca nunca dispara `focus` ni `visibilitychange`.

## shadcn: es Base UI, no Radix

`components.json` dice `base-nova`. Las APIs difieren de los ejemplos de Radix que andan dando vueltas:

- Composición con `render={<Button />}`, no `asChild`. Si el `render` no es un botón, agregá `nativeButton={false}`.
- `Select` necesita `items` en la raíz. **Sin eso muestra el valor crudo en vez de la etiqueta** — ya pasó dos veces en este repo.
- `ToggleGroup` de selección única no lleva `type`, y el valor va como arreglo: `value={[tema]}`.
- Base UI no publica `value` en el DOM: la opción activa se reconoce por `aria-pressed`.

Iconos en botones con `data-icon="inline-start"`, sin clases de tamaño.

## Cuenta del Administrador

`pnpm seed:admin` crea la única cuenta con `ADMIN_EMAIL` y `ADMIN_PASSWORD` del `.env`. De ahí en más se cambian desde el panel, en el botón **Cuenta** del encabezado.

**La contraseña tiene un mínimo de 8 caracteres** (el default de Better Auth). Con menos, el seed falla y la cuenta no se crea.

`pnpm admin:reset` es la única salida si se pierde la contraseña: no hay recuperación por correo porque la app no manda mails. Borra la cuenta y la rehace con lo que diga el `.env`; **no toca los Integrantes**, que viven en otra tabla.

El email **no** pasa por `auth.api.changeEmail`: Better Auth 1.7 exige un mailer configurado aunque el email no esté verificado, y contesta `Verification email isn't enabled` sin cambiar nada. Como la app no manda correos por decisión de producto, `src/auth/cuenta.ts` actualiza la fila. Es seguro porque `account.account_id` guarda el id del usuario, no el email, y las sesiones cuelgan de `user_id` — hay un test que lo fija por si eso cambiara.

Los mensajes de error de Better Auth son en inglés y no se configuran: `motivo()` en `sesion.ts` traduce los que pueden aparecer y manda el resto a un mensaje propio, en vez de filtrar el original a una pantalla en castellano.

## Windows

- `pnpm add` puede fallar con EPERM y **reportar exit code 0 igual**. Verificá `node_modules` en vez de confiar en el código de salida.
- `node -e` y `npx tsx -e` no imprimen nada en este entorno: usá archivos de script.
- Cada llamada a la shell es un proceso nuevo; un `export` no persiste. Poné las variables de entorno en la misma línea del comando.

## Despliegue

El paso a paso está en `docs/DESPLIEGUE.md`. Lo que conviene saber sin abrirlo:

- La imagen se construye con el `Dockerfile` del repo, base **Debian (`node:22-slim`), no Alpine**: `better-sqlite3` y `sharp` traen binarios para glibc y en musl hay que compilarlos enteros.
- La imagen final **incluye las dependencias de desarrollo, a propósito**: sin `tsx` no se puede correr `pnpm admin:reset` adentro del contenedor, que es la única forma de recuperar el acceso al panel.
- `servidor/produccion.mjs` corre `revisarElEntorno()` antes de servir nada, y sólo en producción. Si falta el secreto, la URL pública o los caminos, no arranca y lo explica en castellano.
- Esa misma guarda detecta **el volumen sin montar** comparando el número de dispositivo de la carpeta de datos con el de `/`, porque el `Dockerfile` define `DATABASE_PATH` y entonces la revisión de "falta la variable" pasa siempre. Sólo pregunta si hay `/.dockerenv`: fuera de un contenedor, compartir dispositivo con la raíz es lo normal.
- `/salud` es para el healthcheck y **no toca la base** a propósito: una base rota se arregla mirando la pantalla de error, no reiniciando en loop.
- Los Retratos se sirven con `sirv(..., { dev: true })` y la carpeta se crea con `mkdirSync` antes. Las dos líneas parecen de más y no lo son: sin `dev`, `sirv` indexa la carpeta una sola vez al arrancar y **cada foto subida después queda en 404 hasta el próximo reinicio**; sin el `mkdirSync`, ese mismo recorrido inicial muere con ENOENT en un volumen recién montado. `dev` impone su propio `Cache-Control`, así que el inmutable se pone en la respuesta antes de delegar. Hay guardas en `src/servidor/produccion.test.ts`, que es lo único verificable sin construir.
