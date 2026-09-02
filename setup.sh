#!/usr/bin/env sh
# Arranque de desarrollo en un comando. Para producción, ver docs/DESPLIEGUE.md.
#
# One-command development bootstrap. For production, see docs/DESPLIEGUE.md.
#
# En Windows: correlo desde Git Bash, o seguí los pasos a mano del README.
# On Windows: run this from Git Bash, or follow the manual steps in the README.

set -eu

command -v node >/dev/null 2>&1 || { echo "Falta Node 22+. / Node 22+ is required."; exit 1; }
command -v pnpm >/dev/null 2>&1 || { echo "Falta pnpm: corepack enable / pnpm is required: corepack enable"; exit 1; }

echo "==> Dependencias / Dependencies"
pnpm install

if [ ! -f .env ]; then
  echo "==> .env"
  cp .env.example .env

  # Un secreto real desde el principio: el ejemplo es corto a propósito y la app
  # se niega a arrancar con él en producción.
  if command -v openssl >/dev/null 2>&1; then
    secreto=$(openssl rand -base64 32)
    # El secreto puede traer / y +, así que el separador de sed es |.
    sed -i.bak "s|^BETTER_AUTH_SECRET=.*|BETTER_AUTH_SECRET=${secreto}|" .env && rm -f .env.bak
    echo "    BETTER_AUTH_SECRET generado / generated"
  else
    echo "    Sin openssl: poné BETTER_AUTH_SECRET a mano. / No openssl: set BETTER_AUTH_SECRET by hand."
  fi
else
  echo "==> .env ya existe, no se toca / already exists, left alone"
fi

echo "==> Base de datos / Database"
pnpm db:migrate

echo ""
echo "Listo. / Done."
echo ""
echo "Falta una cosa: la cuenta del Administrador."
echo "One thing left: the administrator account."
echo ""
echo "  1. Completá ADMIN_EMAIL y ADMIN_PASSWORD en .env (mínimo 8 caracteres)"
echo "     Fill in ADMIN_EMAIL and ADMIN_PASSWORD in .env (8 characters minimum)"
echo "  2. pnpm seed:admin"
echo "  3. pnpm dev     ->  http://localhost:3000"
