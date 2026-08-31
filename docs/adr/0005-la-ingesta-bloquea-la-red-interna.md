---
status: accepted
---

# La ingesta de Retratos bloquea la red interna

`src/retratos/ingesta.ts` resuelve el nombre de la URL pegada y rechaza la descarga si la IP cae en un rango privado, de loopback o de link-local. Revalida en cada redirección, exige http o https, y corta por tamaño y por tiempo.

## Considered Options

Descargar la URL sin más era lo obvio: la acción la dispara el único Administrador autenticado, en una app interna. Se descartó porque el servidor está **dentro** de la red de la empresa y por VPN. Un fetch del lado del servidor con una URL que escribe una persona es SSRF, y acá el atacante no necesita ser un extraño: alcanza con que el Administrador pegue sin mirar un enlace que le pasaron. "Solo lo usa el admin" limita quién dispara la descarga, no adónde llega.

La revalidación por salto es lo que hace que el control sirva: sin ella, cualquier redirección a `169.254.169.254` lo saltea entero.

## Consequences

- Queda abierta la ventana de DNS rebinding entre la resolución y el fetch. Cerrarla pide un agente HTTP propio que fije la IP validada; para un alta manual y ocasional no lo vale.
- `permitirRedPrivada` existe **solo** para los tests, que sirven imágenes desde `127.0.0.1`. No exponerla en ninguna ruta ni formulario.
- El código parece desproporcionado para "bajar una foto" y es lo primero que alguien va a querer simplificar. No lo hagas sin releer esto.
