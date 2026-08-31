---
status: accepted
---

# Todas las fechas se evalúan en horario de Argentina

Hoy, las Ocurrencias y el Próximo cumpleaños se calculan siempre en `America/Argentina/Buenos_Aires`, sin importar la zona horaria del dispositivo que mira la app.

## Considered Options

Usar la zona local del dispositivo era la opción por defecto y se descartó. La app se accede por VPN desde fuera de la oficina: con zona local, dos personas mirando al mismo tiempo verían distinto "faltan N días", el confetti aparecería un día antes o después según quién mire, y la pantalla de la oficina no coincidiría con nadie.

## Consequences

- Un Integrante puede tener un país asociado. **Ese campo es decorativo y no entra jamás en el cálculo de fechas.** Es lo que más probablemente alguien intente "arreglar" en el futuro: no lo es.
- Una Fecha de cumpleaños es día y mes, sin año y sin instante. No debe convertirse nunca a `Date` de JavaScript sin fijar la zona explícitamente: `new Date("1990-08-31")` se interpreta como medianoche UTC y adelanta el cumpleaños un día en Argentina.
