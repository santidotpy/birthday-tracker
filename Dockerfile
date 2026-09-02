# Imagen de producción.
#
# Base Debian (`slim`), no Alpine, a propósito: `better-sqlite3` y `sharp` son
# módulos nativos y sus binarios precompilados son para glibc. En Alpine, que
# usa musl, o no hay binario o hay que compilarlo entero — es la trampa clásica
# de meter SQLite en un contenedor.

# --- Etapa de construcción --------------------------------------------------
# Las herramientas de compilación viven sólo acá: si algún módulo nativo no
# tiene binario listo para esta plataforma, se compila en esta etapa y a la
# imagen final llega el `.node` ya hecho, sin arrastrar g++.
FROM node:22-slim AS build

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

RUN corepack enable
WORKDIR /app

# Las dependencias primero, en su propia capa: mientras el lockfile no cambie,
# reconstruir después de tocar el código no vuelve a instalar nada.
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

# --- Imagen final -----------------------------------------------------------
FROM node:22-slim AS runtime

RUN corepack enable
WORKDIR /app
ENV NODE_ENV=production

# Se copian las dependencias ya instaladas y compiladas de la etapa anterior.
# Incluyen las de desarrollo, y eso es deliberado: sin `tsx` no se puede correr
# `pnpm admin:reset` adentro del contenedor, que es la única forma de recuperar
# el acceso si se pierde la contraseña —esta app no manda mails—. En un server
# propio, unos megabytes valen menos que quedarse afuera del panel.
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist

# `drizzle/` NO es sólo de desarrollo: la app migra al arrancar y sin esta
# carpeta no encuentra qué aplicar. `src/` y `scripts/` van para el reset.
COPY --from=build /app/drizzle ./drizzle
COPY --from=build /app/servidor ./servidor
COPY --from=build /app/src ./src
COPY --from=build /app/scripts ./scripts
COPY --from=build /app/package.json /app/tsconfig.json ./

# El volumen persistente se monta acá. Los dos caminos tienen que caer adentro:
# si quedan en el sistema de archivos del contenedor, cada redespliegue borra
# los cumpleaños y las fotos.
ENV DATABASE_PATH=/datos/birthday-tracker.sqlite \
    RETRATOS_PATH=/datos/retratos \
    PORT=3000

EXPOSE 3000

# Node como PID 1 recibe el SIGTERM de Docker sin intermediarios, así el
# contenedor se apaga en el momento y no después de diez segundos de espera.
CMD ["node", "servidor/produccion.mjs"]
