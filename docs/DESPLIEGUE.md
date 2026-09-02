# Despliegue en Coolify

La app corre en un contenedor propio, construido con el `Dockerfile` del repo.
No usa el buildpack de Nixpacks: la imagen es Debian (`node:22-slim`) a propósito,
porque `better-sqlite3` y `sharp` traen binarios precompilados para glibc y en
Alpine hay que compilarlos enteros.

## Lo único que importa entender antes de empezar

**Los datos viven en un volumen, no en la imagen.** La base SQLite y los Retratos
van los dos a `/datos`. Si ese camino no es un volumen persistente, la app anda
igual, se cargan los cumpleaños, se suben las fotos — y el primer redespliegue se
lo lleva todo.

Por eso la app **se niega a arrancar** si detecta que `/datos` es el disco del
contenedor y no un volumen montado. Es la falla que ninguna variable de entorno
delata, así que la revisa mirando el número de dispositivo del sistema de archivos.

## Paso a paso

### 1. Crear el recurso

En el proyecto de Coolify: **+ New** → **Application** → **Public/Private
Repository** apuntando a este repo, rama `main`.

En la configuración de la build:

| Campo | Valor |
| --- | --- |
| Build Pack | **Dockerfile** |
| Base Directory | `/` |
| Dockerfile Location | `/Dockerfile` |
| Ports Exposes | `3000` |

### 2. El volumen — antes del primer deploy

En **Storages** → **+ Add**, volumen nombrado:

| Campo | Valor |
| --- | --- |
| Name | `cumpleanos-datos` |
| Destination Path | `/datos` |

Que sea **antes** del primer deploy no es un detalle: si la app arranca sin
volumen, se niega y no pasa nada malo, pero si arranca, se carga gente y recién
después se agrega el volumen, ese trabajo se pierde al montar encima.

### 3. Variables de entorno

En **Environment Variables**, todas de runtime (no hace falta ninguna en build):

| Variable | Valor |
| --- | --- |
| `BETTER_AUTH_SECRET` | salida de `openssl rand -base64 32` |
| `BETTER_AUTH_URL` | la URL pública exacta, p. ej. `https://cumples.empresa.com` |
| `ADMIN_EMAIL` | el mail del Administrador |
| `ADMIN_PASSWORD` | mínimo 8 caracteres |
| `ADMIN_NAME` | opcional, por defecto `Administrador` |

`DATABASE_PATH` y `RETRATOS_PATH` **no se ponen acá**: el `Dockerfile` ya los
apunta a `/datos`. Si igual los definís, tienen que quedar los dos adentro de
`/datos`.

`NODE_ENV=production` tampoco: ya viene en la imagen, y es lo que enciende todas
las guardas de arranque.

Las tres `ADMIN_*` sólo las leen `seed:admin` y `admin:reset` (paso 6). La app
servida no las mira; se pueden borrar después de crear la cuenta.

### 4. Dominio y healthcheck

En **General**:

- **Domains**: la misma URL que pusiste en `BETTER_AUTH_URL`. Coolify saca el
  certificado solo. Si las dos no coinciden, la sesión no se guarda y el panel
  rebota al login sin decir por qué.
- **Health Check**: habilitado, path `/salud`, puerto `3000`.

`/salud` contesta `{"estado":"ok"}` y no toca la base a propósito: si la base
falla, lo que corresponde es la pantalla de error, no que Coolify reinicie en
loop algo que reiniciar no arregla.

### 5. Deploy

**Deploy**. La primera build tarda unos minutos (instala dependencias y compila
los módulos nativos); las siguientes reusan la capa de dependencias mientras no
cambie `pnpm-lock.yaml`.

Si algo falta, el contenedor no arranca y lo dice en castellano en los logs:

```
No se puede arrancar:

  - Falta BETTER_AUTH_SECRET. Generalo con: openssl rand -base64 32
  - /datos existe pero es el disco del contenedor, no un volumen: ...

Se configuran en las variables de entorno de Coolify.
```

Con todo bien:

```
Cumpleaños escuchando en http://localhost:3000
Base en /datos/birthday-tracker.sqlite
Retratos desde /datos/retratos
```

### 6. Crear el Administrador

Una sola vez, después del primer deploy. En Coolify: **Terminal** del recurso, o
por SSH `docker exec -it <contenedor> sh`. Adentro:

```sh
pnpm seed:admin
```

Es idempotente: si la cuenta ya existe, lo dice y no toca nada. Después entrás a
`/admin` con ese mail y esa contraseña, y de ahí en más los cambiás desde el
botón **Cuenta** del encabezado.

## Cómo se lee el primer arranque

La app migra la base al abrirla, no en un paso aparte. Si el archivo no existía,
deja una línea en el log:

```
[base] No existía /datos/birthday-tracker.sqlite. Se crea una nueva y vacía.
```

**En el primer deploy eso es normal.** En cualquier deploy posterior es la señal
de que el volumen se perdió o se remontó en otro lado. Es la única forma de
distinguir los dos casos, porque la pantalla que ve el usuario —"Todavía no hay
nadie"— es idéntica.

## Actualizar

Push a `main` y **Redeploy** en Coolify (o el webhook, si lo activaste). El
volumen no se toca: sobrevive la base, los Retratos y la cuenta del
Administrador. Las migraciones nuevas se aplican solas al abrir la base.

Lo que **no** sobrevive es cualquier cosa que se haya escrito fuera de `/datos`.
No hay nada así hoy, y conviene que siga siendo cierto.

## Si se pierde la contraseña del Administrador

No hay recuperación por mail: la app no manda correos, por decisión de producto.
La salida es, desde la terminal del contenedor:

```sh
pnpm admin:reset
```

Borra la cuenta y la rehace con las `ADMIN_*` del entorno. **No toca a los
Integrantes**, que viven en otra tabla.

Por eso la imagen final incluye las dependencias de desarrollo: sin `tsx` no se
puede correr ese script adentro del contenedor, y quedarse afuera del panel para
siempre cuesta más que unos megabytes de imagen.

## Respaldo

Todo el estado son dos cosas adentro del volumen:

- `/datos/birthday-tracker.sqlite` (más los `-wal` y `-shm` que la acompañan)
- `/datos/retratos/`

Copiar esa carpeta entera es el respaldo completo. Con SQLite en modo WAL,
copiar el archivo con la app andando puede dar una base a medio escribir; para
un respaldo consistente conviene `sqlite3 /datos/birthday-tracker.sqlite ".backup
/tmp/copia.sqlite"` o parar el contenedor un segundo.

## Probar la imagen localmente

Igual que en el servidor, para no descubrir los problemas allá:

```sh
docker build -t cumpleanos:prueba .

docker run --rm -p 3000:3000 \
  -v cumpleanos-datos:/datos \
  -e BETTER_AUTH_SECRET="$(openssl rand -base64 32)" \
  -e BETTER_AUTH_URL=http://localhost:3000 \
  cumpleanos:prueba
```

Sin el `-v` tiene que negarse a arrancar. Si arranca, la guarda del volumen dejó
de funcionar.
