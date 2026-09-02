import { createRouter } from '@tanstack/react-router';
import { PantallaDeError } from './componentes/PantallaDeError.js';
import { routeTree } from './routeTree.gen';

export function getRouter() {
  return createRouter({
    routeTree,
    scrollRestoration: true,
    defaultPreload: 'intent',
    // Un fallo en el loader de una ruta hija —la lista de Integrantes, sin ir
    // más lejos— no lo agarra el `errorComponent` de la raíz: cada ruta usa el
    // suyo, y sin esto cae en el de fábrica, que es una pantalla en inglés con
    // el stack trace. El de la raíz sigue existiendo para lo que falle allá.
    defaultErrorComponent: ({ error, reset }) => (
      <PantallaDeError error={error} reintentar={reset} />
    ),
  });
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
