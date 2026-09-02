# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

**Audiencia principal:** todos los integrantes de la empresa, menos de treinta personas. Entran desde su propio dispositivo, sin credenciales, para enterarse de quién cumple años. No tienen cuenta y nunca inician sesión.

**Administrador:** una sola persona autenticada. Mantiene el padrón a mano: da de alta, edita y archiva integrantes. Es el único rol con acceso al panel.

**Uso previsto a futuro:** una TV en la oficina mostrando la misma pantalla sin que nadie la toque durante semanas.

## Product Purpose

Mostrar quién cumple años hoy y cuánto falta para el próximo, para que en una empresa lo bastante chica como para que a todos les importe, ningún cumpleaños pase inadvertido. El éxito es que la gente se entere a tiempo.

## Positioning

Es una pantalla ambiental interna, no un calendario ni una herramienta de RRHH. Contesta una sola pregunta de un vistazo, sin que nadie tenga que buscar ni filtrar nada.

## Operating Context

- Autohospedada en un server Ubuntu de la empresa con Coolify, accesible solo desde la oficina o por VPN.
- Todas las fechas se evalúan en horario de Argentina, sin importar desde dónde se mire (`docs/adr/0003`).
- El padrón se mantiene a mano. No hay integración con ningún sistema de RRHH ni con LinkedIn.
- La base y las fotos viven en un volumen persistente. Si queda dentro del contenedor, cada redeploy borra todo. La app se prepara sola —crea el archivo y aplica las migraciones al arrancar—, así que un volumen nuevo arranca vacío en vez de romperse, y avisa en el log.

## Capabilities and Constraints

- Un cumpleaños es **día y mes**. El año de nacimiento no se guarda, por decisión explícita: la app nunca muestra la edad de nadie.
- El 29 de febrero se observa el 1 de marzo en años no bisiestos.
- **El festejo es del día, no de la fecha que se mire.** Navegar al cumpleaños de la semana pasada muestra de quién fue —retrato, nombre, área— pero sin confeti y sin saludo, y con la fecha a la vista.
- Varias personas pueden compartir fecha y aparecen juntas. Con menos de treinta integrantes los empates son ocasionales, no la norma.
- Quien deja la empresa se **archiva**, no se borra: conserva sus datos y desaparece de todas las vistas.
- Retratos: el Administrador pega una URL y la app se queda con una copia propia (`docs/adr/0001`). Sin foto, muestra las iniciales sobre un color derivado del nombre, que tiene una versión por tema.
- Solo el Administrador se autentica. No hay registro público.
- Cada integrante puede tener un **Área** asociada, elegida de una **lista cerrada** que vive en `src/domain/areas.ts`. Es opcional: un integrante sin área simplemente no la muestra. La lista sembrada tiene solo las dos áreas confirmadas (IT y Control de Gestión); el Administrador completa el resto editando ese archivo.
- **Tema**: claro, oscuro, o seguir al sistema, que es el default. La elección se guarda en una cookie, o sea por dispositivo: nadie le cambia el tema a la pantalla de otro. `?tema=oscuro` en la URL lo fija y lo persiste, que es cómo se configura la TV, donde `prefers-color-scheme` reporta claro porque no sabe que es un televisor.
- Sin notificaciones en v1: no se empuja nada a Slack ni a mail.
- El vocabulario canónico vive en `CONTEXT.md`. Las decisiones difíciles de revertir, en `docs/adr/`.

## Brand Commitments

No hay marca corporativa que respetar. La app tiene identidad propia y festiva, y el logo de la empresa no aparece: el protagonista de la pantalla es la persona que cumple, no la empresa.

## Evidence on Hand

El Administrador ya empezó a cargar integrantes reales en `datos/dev.sqlite`. **Esos nombres son personas reales de la empresa: no son datos de prueba y no se inventan, completan ni reasignan sus datos** (área, país, foto) sin que él los confirme. La base es local y está fuera del repositorio.

No hay logo ni assets de marca. LinkedIn no puede proveer los retratos: su API no expone perfiles de terceros y sus URLs de imagen están firmadas y vencen (`docs/adr/0001`).

## Product Principles

1. **Una pregunta, contestada de un vistazo.** Quien abre la app tiene que saber quién cumple sin leer.
2. **El festejo es de una persona, no de una fila de la base.** Alguien sin foto igual merece una presencia digna, no un cuadrado gris.
3. **La edad de nadie es asunto de nadie.** Día y mes es toda la verdad que la app guarda.
4. **Tiene que estar bien el día que importa.** Un error de fechas se manifiesta el día del cumpleaños de alguien, que es el peor día posible para que aparezca.
5. **Irse no es desaparecer.** Quien deja la empresa se archiva con sus datos intactos.

## Accessibility & Inclusion

- Se respeta `prefers-reduced-motion`: se cancela el confeti y se saca todo lo que se desplaza, conservando el fundido. El crossfade al cambiar de tema queda igual: es opacidad pura y suavizar el salto de brillo importa más, no menos.
- Se respetan `prefers-reduced-transparency` (las superficies translúcidas se vuelven opacas, con borde en lugar de blur) y `prefers-contrast: more` (tinta apagada y bordes más marcados).
- La paleta de iniciales son pares, uno por tema, verificados con tests: 4.5:1 o más contra su tinta, y 3:1 o más contra el fondo de su tema, para que el círculo del Retrato no se pierda contra el fondo.
- No se estableció ningún otro estándar específico del producto.
