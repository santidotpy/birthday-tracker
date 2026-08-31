import { HeadContent, Outlet, Scripts, createRootRoute } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import estilos from '../estilos.css?url';

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'Cumpleaños' },
    ],
    links: [{ rel: 'stylesheet', href: estilos }],
  }),
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
  return (
    <html lang="es-AR">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}
