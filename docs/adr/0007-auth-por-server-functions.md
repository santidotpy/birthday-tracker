---
status: accepted
---

# Better Auth se usa desde server functions, sin montar su handler HTTP

`src/servidor/sesion.ts` llama a la API de Better Auth (`signInEmail`, `signOut`, `getSession`) con `asResponse: true` y reenvía a mano las cookies que emite. No se monta `auth.handler` en ninguna ruta HTTP.

## Considered Options

Lo documentado por Better Auth es montar su handler en `/api/auth/*`. En esta versión de TanStack Start no encontramos una API de rutas de servidor a nivel de ruta (`createServerFileRoute` ya no existe), así que montarlo habría significado hacerlo en `servidor/produccion.mjs` y en el middleware de Vite: dos entradas que tendrían que importar el módulo de auth, una de ellas siendo `.mjs` que no puede importar TypeScript.

Las server functions ya estaban verificadas y funcionando. Usarlas deja todo el auth adentro del framework y las entradas siguen sin saber nada del tema.

## Consequences

- Hay que reenviar las cookies explícitamente. Si se agrega otro flujo de Better Auth que emita cookies (recuperar contraseña, verificar email), tiene que pasar por `reenviarCookies` o la sesión no se va a establecer.
- El cliente de Better Auth para React no se usa: no hay endpoints HTTP a los que hablarle. La sesión se lee con la server function `sesionActual`.
- La comprobación de sesión va **adentro de cada handler**, no en la ruta. `beforeLoad` evita que se vea el panel, pero una server function es un endpoint HTTP y se puede llamar directo.
- Si Start incorpora rutas de servidor, conviene volver al handler montado, que es el camino soportado.
