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

`DATABASE_PATH` y `RETRATOS_PATH` apuntan al **mismo volumen persistente** de Coolify. Si `datos/` queda adentro del contenedor, cada redeploy borra los cumpleaños y las fotos, y la app arranca vacía sin avisar.

**La base de desarrollo tiene personas reales de la empresa.** No inventes, completes ni reasignes sus datos —área, país, foto— sin que el Administrador los confirme.

### Ingesta de Retratos

El Administrador pega una URL y la app se queda con una copia propia (ADR 0001: las URLs firmadas de LinkedIn vencen). `src/retratos/ingesta.ts` bloquea la red privada antes de bajar nada y **revalida en cada redirección** (ADR 0005). El flag `permitirRedPrivada` existe solo para los tests, que levantan un servidor en 127.0.0.1: no lo expongas nunca en una ruta ni en un formulario.

### Tema

Cookie → servidor → `light-dark()`. `src/servidor/tema.ts` resuelve el tema del pedido (primero `?tema=` en la URL, después la cookie) y `__root.tsx` lo estampa como `data-tema` en el `<html>`, así el HTML sale ya con el tema puesto y no hay fogonazo. De ahí en más `estilos.css` traduce `data-tema` a `color-scheme`, y **todos los tokens son `light-dark()`**: no hay un bloque oscuro duplicado que se pueda desincronizar.

Si tocás el tema, las dos piezas tienen que seguir de acuerdo: los tokens `light-dark()` y el `@custom-variant dark`, que es lo que hace andar las clases `dark:` que traen los componentes de shadcn.

El cambio de tema pasa por `document.startViewTransition` con un `flushSync` adentro, para que el fondo no salte de golpe y para que el botón marcado del selector cambie en el mismo cuadro. Ese crossfade **no** va adentro de `prefers-reduced-motion`: es opacidad pura y suavizar el salto de brillo le importa más a quien pidió menos movimiento.

La paleta de iniciales (`src/retratos/iniciales.ts`) son **pares**, uno por tema, porque los colores que llevan texto blanco son todos oscuros y en tema oscuro el círculo del Retrato desaparecía contra el fondo. Los tests verifican contraste contra la tinta *y* contra el fondo de cada tema; si agregás un color, ellos deciden si entra.

### Motion

Una sola curva, `--sale`, para todo. La entrada de las pantallas es en cascada: `.entra` con `--retraso` por elemento, setenta milisegundos entre uno y otro, y el confeti espera a que el Retrato haya llegado para que se lea como un evento y no como dos.

Movimiento reducido conserva la cascada pero se queda solo con el fundido; el crossfade del tema tampoco se apaga, porque es opacidad pura.

Los dígitos de la cuenta regresiva **no** se animan, a propósito: cambian una vez por segundo y animarlos los haría ilegibles.

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

## Windows

- `pnpm add` puede fallar con EPERM y **reportar exit code 0 igual**. Verificá `node_modules` en vez de confiar en el código de salida.
- `node -e` y `npx tsx -e` no imprimen nada en este entorno: usá archivos de script.
- Cada llamada a la shell es un proceso nuevo; un `export` no persiste. Poné las variables de entorno en la misma línea del comando.

## Pendiente conocido

`.env` todavía usa el `BETTER_AUTH_SECRET` de ejemplo. Antes de desplegar hay que reemplazarlo por uno real (`openssl rand -base64 32`).
