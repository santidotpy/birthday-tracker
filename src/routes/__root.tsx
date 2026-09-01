import { HeadContent, Outlet, Scripts, createRootRoute } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import estilos from '../estilos.css?url';
import { resolverTema } from '../servidor/tema.js';
import { ProveedorDeTema } from '../tema/contexto.js';
import { type Tema, TEMA_POR_DEFECTO, temaODefecto } from '../tema/tema.js';

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'Cumpleaños' },
    ],
    links: [{ rel: 'stylesheet', href: estilos }],
  }),
  // El tema se resuelve en el servidor, desde la cookie, para que el HTML
  // salga ya con el tema puesto. Con `localStorage` habría un fogonazo blanco
  // en cada carga, que en una TV prendida todo el día se ve en cada arranque.
  loader: () => resolverTema(),
  component: () => (
    <Documento>
      <Outlet />
    </Documento>
  ),
  notFoundComponent: () => (
    <Documento>
      <main className="aparece flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
        <h1 className="m-0 text-3xl font-bold tracking-tight sm:text-5xl">Esa fecha no existe</h1>
        <a className="text-muted-foreground underline underline-offset-4" href="/">
          Volver a hoy
        </a>
      </main>
    </Documento>
  ),
});

function Documento({ children }: Readonly<{ children: ReactNode }>) {
  const tema = useTemaInicial();

  return (
    // Sin atributo manda `prefers-color-scheme`; con atributo manda la
    // elección. `estilos.css` traduce esto a `color-scheme`, y de ahí sale
    // todo lo demás vía `light-dark()`.
    <html lang="es-AR" data-tema={tema === 'sistema' ? undefined : tema}>
      <head>
        <HeadContent />
      </head>
      <body>
        <ProveedorDeTema inicial={tema}>{children}</ProveedorDeTema>
        <Scripts />
      </body>
    </html>
  );
}

/** Tolera que el loader no haya corrido: sin tema, se sigue al sistema. */
function useTemaInicial(): Tema {
  const datos = Route.useLoaderData({ structuralSharing: false });
  return typeof datos === 'string' ? temaODefecto(datos) : TEMA_POR_DEFECTO;
}
