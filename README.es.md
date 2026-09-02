# Birthday Tracker

Una pantalla ambiental que contesta una sola pregunta de un vistazo: **¿quién
cumple años?**

Hecha para una empresa chica —menos de treinta personas— para dejarla prendida
semanas en un televisor de la oficina. Muestra quién cumple hoy, quién sigue y
cuánto falta. Nadie inicia sesión, nadie busca, nadie filtra.

**[Read in English →](README.md)**

> [!CAUTION]
> **La app no tiene autenticación, y es a propósito.** Todo menos `/admin` es
> público: el nombre completo, la foto y el cumpleaños de cada persona de la
> lista los puede leer cualquiera que llegue a la URL.
>
> Es la decisión correcta en la red de la oficina o detrás de una VPN, que es
> para lo que está hecha. **No** lo es en un dominio público: ponerla ahí
> publica los datos personales de tus compañeros en internet y en los
> buscadores. `docs/DESPLIEGUE.md` te lleva de la mano a conectarle un dominio
> público con certificado; asegurate de querer eso antes de hacerlo.
>
> Si la necesitás desde afuera de la oficina, ponela detrás de una VPN, una
> lista de IPs permitidas, o un proxy reverso que autentique.

## Qué hace

- **El cumpleaños de hoy**, en primer plano — retrato, nombre, área y confeti.
- **El próximo cumpleaños** con cuenta regresiva en vivo, cuando hoy no cumple
  nadie.
- **La agenda**: los cumpleaños de todos desde hoy en adelante, dando la vuelta
  al año en vez de volver a empezar en enero.
- **Cualquier fecha**, en `/<fecha>` — ir al cumpleaños de la semana pasada
  muestra de quién fue, sin confeti. El festejo es del día, no de la fecha que
  se mire.
- **Panel de administración** en `/admin` para un único Administrador
  autenticado: da de alta, edita y archiva Integrantes. Quien se va se archiva,
  no se borra.
- **Retratos desde una URL.** El Administrador pega una y la app la baja, la
  recorta y se queda con una copia propia. Sin foto, muestra las iniciales sobre
  un color derivado del nombre.
- **Tema claro y oscuro**, o seguir al sistema. `?tema=oscuro` lo fija, que es
  cómo se configura una TV, donde `prefers-color-scheme` reporta claro porque no
  sabe que es un televisor.

La edad no se guarda ni se muestra nunca: un cumpleaños es un día y un mes, y
eso es todo lo que la app sabe.

## Arranque rápido

Necesita **Node 22+** y **pnpm** (`corepack enable`).

```sh
git clone https://github.com/santidotpy/birthday-tracker.git
cd birthday-tracker
./setup.sh
```

`setup.sh` instala las dependencias, crea el `.env` con un secreto recién
generado y migra la base. Después completá `ADMIN_EMAIL` y `ADMIN_PASSWORD` en
el `.env` y corré:

```sh
pnpm seed:admin
pnpm dev            # http://localhost:3000
```

<details>
<summary>A mano (o en Windows sin Git Bash)</summary>

```sh
pnpm install
cp .env.example .env
# BETTER_AUTH_SECRET con la salida de: openssl rand -base64 32
# ADMIN_EMAIL y ADMIN_PASSWORD (mínimo 8 caracteres)
pnpm db:migrate
pnpm seed:admin
pnpm dev
```

</details>

## Configuración

| Variable | ¿Obligatoria? | Qué es |
| --- | --- | --- |
| `BETTER_AUTH_SECRET` | sí | Secreto de sesión. `openssl rand -base64 32`. En producción la app se niega a arrancar con menos de 32 caracteres. |
| `BETTER_AUTH_URL` | sí | La URL pública exacta. Si no coincide con la dirección que la gente usa, la sesión no se guarda y el panel rebota al login sin decir por qué. |
| `DATABASE_PATH` | sí | El archivo SQLite. Tiene que vivir en un volumen persistente. |
| `RETRATOS_PATH` | sí | La carpeta de Retratos. **El mismo volumen** que la base. |
| `ADMIN_EMAIL` · `ADMIN_PASSWORD` · `ADMIN_NAME` | sólo seed | Las leen `pnpm seed:admin` y `pnpm admin:reset`. La app servida no las mira. |
| `PORT` | no | Por defecto 3000. |
| `MIGRATIONS_PATH` | no | Por defecto `drizzle/`. |

## Despliegue

```sh
cp .env.example .env      # completá BETTER_AUTH_SECRET y BETTER_AUTH_URL
docker compose up -d
docker compose exec app pnpm seed:admin
```

La imagen es Debian (`node:22-slim`), no Alpine, a propósito: `better-sqlite3` y
`sharp` traen binarios precompilados para glibc y en musl hay que compilarlos
enteros.

> [!IMPORTANT]
> **Los datos viven en un volumen, no en la imagen.** La base SQLite y los
> Retratos van los dos a `/datos`. Si ese camino no es persistente, todo anda
> igual —se carga gente, se suben fotos— y el primer redespliegue se lo lleva
> todo. La app se niega a arrancar si detecta que `/datos` es el disco del
> contenedor y no un volumen montado.

Para Coolify, con el volumen, el healthcheck y el respaldo, está el paso a paso
en **[docs/DESPLIEGUE.md](docs/DESPLIEGUE.md)**.

¿Se perdió la contraseña del Administrador? No hay recuperación por mail —la app
no manda correos—. Se corre `pnpm admin:reset` adentro del contenedor: rehace la
cuenta con las `ADMIN_*` del entorno y no toca el cumpleaños de nadie.

## Para adaptarla

Tres cosas que conviene cambiar antes de usarla con otro equipo.

**La zona horaria.** Todas las fechas se evalúan en una única zona fija, para que
dos personas mirando al mismo tiempo desde lugares distintos vean el mismo
"faltan N días" y el confeti salga el mismo día para todos. Esa zona es
Argentina, fija en [`src/domain/fechas.ts`](src/domain/fechas.ts) como `ZONA`.
Cambiá esa constante por tu zona IANA — lo que el ADR 0003 defiende es que haya
*una sola* zona, no que sea *esa*. La columna `pais` de un Integrante es
decorativa a propósito.

**Las Áreas.** La lista de áreas es cerrada y vive en
[`src/domain/areas.ts`](src/domain/areas.ts), para que no convivan "IT",
"Sistemas" e "it" como si fueran tres cosas distintas. Editá la lista y volvé a
desplegar. Sacar un área no rompe a los Integrantes que la tenían: simplemente
se muestran sin área.

**El idioma.** La interfaz está entera en castellano, igual que el código.

## Cómo funciona

[TanStack Start](https://tanstack.com/start) · React 19 · SQLite con
[Drizzle](https://orm.drizzle.team) · [Better Auth](https://better-auth.com) ·
Tailwind 4 · shadcn sobre [Base UI](https://base-ui.com)

Algunas decisiones que explican la forma del código:

- **El dominio es puro y corre de los dos lados.** `src/domain/` no importa nada
  de Node ni del navegador, así que lo único que viaja del servidor es la lista
  de Integrantes: la Agenda, el Próximo cumpleaños y la cuenta regresiva se
  calculan en el cliente. Por eso la cuenta regresiva avanza cada segundo sin
  pedirle nada a nadie.
- **La aritmética de fechas es propia**, no de una librería. `MesDia` es día y
  mes sin año; `FechaSimple` es un día del calendario sin hora ni zona. `Date`
  aparece en exactamente dos funciones.
- **Los Retratos se copian, nunca se enlazan.** Las URLs de imagen de LinkedIn
  están firmadas y vencen. La descarga bloquea las direcciones de red privada y
  revalida en cada redirección, porque un fetch del servidor con una URL que
  escribe una persona es SSRF, y alcanza con que el Administrador pegue sin
  mirar un enlace que le pasaron.
- **El servidor son server functions, no rutas HTTP.** Lo que significa que cada
  handler que toca datos de administración llama a `exigirAdministrador()`
  *adentro del handler*: una server function es un endpoint HTTP invocable
  directo, así que la guarda de la ruta no la protege.
- **El 29 de febrero** se observa el 1 de marzo en años no bisiestos.

El porqué de las difíciles de revertir está en [`docs/adr/`](docs/adr/): siete
decisiones, cada una con la alternativa que se descartó y el motivo.

## Documentación

| Archivo | Qué tiene |
| --- | --- |
| [`CONTEXT.md`](CONTEXT.md) | El glosario del dominio. Leelo antes de nombrar algo nuevo. |
| [`PRODUCT.md`](PRODUCT.md) | Para quién es, y qué decidió no ser. |
| [`docs/adr/`](docs/adr/) | Siete decisiones de arquitectura, con su razonamiento. |
| [`docs/DESPLIEGUE.md`](docs/DESPLIEGUE.md) | El paso a paso del despliegue en Coolify. |
| [`CLAUDE.md`](CLAUDE.md) | Notas para agentes de IA — y el recorrido más rápido por las trampas. |

## Desarrollo

```sh
pnpm dev          # Vite en :3000
pnpm typecheck    # tsc --noEmit
pnpm test         # vitest run
pnpm build && pnpm start
```

Los tests corren en Node, sin navegador; los de componentes usan
`renderToStaticMarkup`.

Cómo contribuir, y por qué el código va en castellano, en
[CONTRIBUTING.md](CONTRIBUTING.md).
