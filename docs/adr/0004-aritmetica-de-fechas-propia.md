---
status: accepted
---

# La aritmética de fechas es propia, sin librería

`src/domain/fechas.ts` implementa a mano el año bisiesto, la Ocurrencia y la distancia en días. La única ayuda externa es `Intl.DateTimeFormat`, que es parte del runtime, y se usa solo en el borde que traduce entre instante y día de calendario.

## Considered Options

**Temporal** era la opción natural: `PlainMonthDay` y `PlainDate` son literalmente los tipos de este dominio. Node 22 no lo trae nativo, así que exigía el polyfill, y el peso caería también en el cliente.

**date-fns** o **Day.js** resuelven mucho más de lo que hace falta y ninguno modela un día-mes sin año, que es el tipo central acá. Terminaríamos igual escribiendo la lógica de Ocurrencia a mano, pero con una dependencia encima.

El dominio completo son unas pocas decenas de líneas de aritmética de enteros sobre `{mes, dia}`, con tests que cubren bisiestos, el 29/02, los empates y la vuelta al año.

## Consequences

- `Date` no aparece en la aritmética, solo en `hoyEnArgentina` e `inicioDelDiaEnArgentina`. Ese aislamiento es la protección real contra el bug de zona horaria del ADR 0003, y hay que sostenerlo.
- `inicioDelDiaEnArgentina` hace dos pasadas para ubicar la medianoche. Es más de lo necesario hoy —Argentina no tiene horario de verano— pero lo tuvo hasta 2009 y podría volver. Un test recorre los doce meses para detectarlo si pasa.
- Si en algún momento aparece una segunda zona horaria de verdad (no la columna decorativa de país), esta decisión hay que revisarla: ahí Temporal empieza a valer lo que cuesta.
