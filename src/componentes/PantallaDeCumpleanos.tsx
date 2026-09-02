import { Badge } from '@/components/ui/badge';
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty';
import { type Integrante, cumpleanerosEn, proximoCumpleanos } from '../domain/agenda.js';
import type { FechaSimple } from '../domain/fechas.js';
import { Agenda } from './Agenda.js';
import { Confetti } from './Confetti.js';
import { CuentaRegresiva } from './CuentaRegresiva.js';
import { Globos } from './Globos.js';
import { Retrato } from './Retrato.js';
import { comoISO, enCuantosDias, fechaCorta, fechaLarga, unirNombres } from './formato.js';

/**
 * `isolate` es por los Globos: los pone en su propio contexto de apilado, así
 * el z-index negativo de la capa los deja detrás del contenido de la pantalla
 * en vez de detrás del fondo del documento, que es donde terminarían sueltos.
 */
const PANTALLA =
  'isolate flex min-h-dvh flex-col items-center justify-center gap-5 p-6 text-center sm:gap-8 sm:p-10 2xl:gap-12';

/**
 * El orden en que llega cada pieza. Setenta milisegundos entre una y otra:
 * suficiente para que se lea como una secuencia, corto para que no se sienta
 * lento. El primero entra sin esperar, así la pantalla responde de inmediato.
 */
function enOrden(posicion: number): React.CSSProperties {
  return { '--retraso': `${posicion * 70}ms` } as React.CSSProperties;
}

interface Props {
  integrantes: Integrante[];
  /** La fecha que se está viendo. Puede no ser Hoy. */
  fecha: FechaSimple;
  esHoy: boolean;
}

export function PantallaDeCumpleanos({ integrantes, fecha, esHoy }: Props) {
  if (integrantes.length === 0) return <SinNadieCargado />;

  const cumpleaneros = cumpleanerosEn(integrantes, fecha);
  const proximo = proximoCumpleanos(integrantes, fecha);

  const agenda = (
    <div className="entra" style={enOrden(5)}>
      <Agenda integrantes={integrantes} desde={fecha} />
    </div>
  );

  return cumpleaneros.length > 0 ? (
    <Celebracion
      cumpleaneros={cumpleaneros}
      fecha={fecha}
      esHoy={esHoy}
      proximo={proximo}
      agenda={agenda}
    />
  ) : (
    <DiaTranquilo fecha={fecha} esHoy={esHoy} proximo={proximo} agenda={agenda} />
  );
}

type Proximo = ReturnType<typeof proximoCumpleanos>;

function Celebracion({
  cumpleaneros,
  fecha,
  esHoy,
  proximo,
  agenda,
}: {
  cumpleaneros: Integrante[];
  fecha: FechaSimple;
  esHoy: boolean;
  proximo: Proximo;
  agenda: React.ReactNode;
}) {
  const varios = cumpleaneros.length > 1;
  // Mirar una fecha vieja agrega la línea con la fecha arriba de todo, así que
  // lo demás entra un lugar más tarde.
  const desde = esHoy ? 0 : 1;

  return (
    <main className={PANTALLA}>
      {/*
        El festejo es de hoy, no de la fecha que se esté mirando. Navegar al
        cumpleaños de la semana pasada tiene que mostrar de quién fue, no
        volver a festejarlo: sin confeti, sin globos y sin saludo, que en pasado
        no va.
      */}
      {esHoy && (
        <>
          <Confetti clave={comoISO(fecha)} />
          <Globos clave={comoISO(fecha)} />
        </>
      )}

      {!esHoy && (
        <p
          className="entra m-0 text-sm tracking-wide lowercase text-muted-foreground 2xl:text-xl"
          style={enOrden(0)}
        >
          <time dateTime={comoISO(fecha)}>{fechaLarga(fecha)}</time>
        </p>
      )}

      <div
        className={
          // El gorrito sale un 20% por encima de su caja, así que se le mete
          // encima a lo que tenga arriba. Sólo pasa mirando otra fecha, que es
          // cuando aparece la línea con el día: se le reserva ese 20%, calcado
          // del `clamp` del Retrato en `Retrato.tsx`.
          'entra flex flex-wrap items-end justify-center gap-4 sm:gap-10' +
          (esHoy ? '' : ' mt-[clamp(1.8rem,4.8vw,5.2rem)]')
        }
        style={enOrden(desde)}
      >
        {cumpleaneros.map((integrante) => (
          <figure key={integrante.id} className="m-0 flex flex-col items-center gap-3">
            <Retrato integrante={integrante} conGorrito tamano={varios ? 'medio' : 'hero'} />
            {varios && (
              <figcaption className="flex flex-col items-center gap-1.5">
                <span className="text-lg font-semibold 2xl:text-3xl">{integrante.nombre}</span>
                {integrante.area && <Badge variant="secondary">{integrante.area}</Badge>}
              </figcaption>
            )}
          </figure>
        ))}
      </div>

      <h1
        className="entra m-0 text-3xl leading-tight font-bold tracking-tight text-balance sm:text-5xl sm:tracking-[-0.03em] lg:text-7xl lg:tracking-[-0.035em] 2xl:text-8xl 2xl:tracking-[-0.04em]"
        style={enOrden(desde + 1)}
      >
        {esHoy ? (
          <>
            ¡Feliz cumpleaños,{' '}
            <span className="text-primary">{unirNombres(cumpleaneros.map((i) => i.nombre))}!</span>
          </>
        ) : (
          <>
            Cumple años{' '}
            <span className="text-primary">{unirNombres(cumpleaneros.map((i) => i.nombre))}</span>
          </>
        )}
      </h1>

      {/* Con una sola persona el área va suelta; con varias va bajo cada retrato. */}
      {!varios && cumpleaneros[0]?.area && (
        <Badge variant="secondary" className="entra px-3 py-1 text-sm sm:text-base 2xl:px-4 2xl:py-1.5 2xl:text-xl"
          style={enOrden(desde + 2)}>
          {cumpleaneros[0].area}
        </Badge>
      )}

      {proximo && (
        <p
          className="entra m-0 max-w-[46ch] leading-relaxed text-balance text-muted-foreground sm:text-lg 2xl:text-2xl"
          style={enOrden(desde + 3)}
        >
          El próximo cumpleaños es de{' '}
          <strong className="font-semibold text-foreground">
            {unirNombres(proximo.integrantes.map((i) => i.nombre))}
          </strong>
          , {enCuantosDias(proximo.dias)}.
        </p>
      )}

      {agenda}
    </main>
  );
}

function DiaTranquilo({
  fecha,
  esHoy,
  proximo,
  agenda,
}: {
  fecha: FechaSimple;
  esHoy: boolean;
  proximo: Proximo;
  agenda: React.ReactNode;
}) {
  return (
    <main className={PANTALLA}>
      <p className="entra m-0 text-sm tracking-wide lowercase text-muted-foreground 2xl:text-xl" style={enOrden(0)}>
        <time dateTime={comoISO(fecha)}>{esHoy ? 'Hoy' : fechaLarga(fecha)}</time>
        {' · '}
        {esHoy ? fechaCorta(fecha) : 'sin cumpleaños'}
      </p>

      {proximo ? (
        <>
          <div
            className="entra flex flex-wrap items-end justify-center gap-4 sm:gap-6"
            style={enOrden(1)}
          >
            {proximo.integrantes.map((integrante) => (
              <Retrato key={integrante.id} integrante={integrante} tamano="medio" />
            ))}
          </div>

          <h1 className="entra m-0 flex flex-col gap-1.5" style={enOrden(2)}>
            <span className="text-base font-normal text-muted-foreground sm:text-lg 2xl:text-2xl">
              El próximo cumpleaños es de
            </span>
            <span className="text-3xl font-bold tracking-tight text-balance sm:text-5xl sm:tracking-[-0.03em] 2xl:text-7xl 2xl:tracking-[-0.035em]">
              {unirNombres(proximo.integrantes.map((i) => i.nombre))}
            </span>
          </h1>

          {proximo.integrantes.some((i) => i.area) && (
            <div className="entra flex flex-wrap justify-center gap-2" style={enOrden(3)}>
              {proximo.integrantes.map(
                (integrante) =>
                  integrante.area && (
                    <Badge key={integrante.id} variant="secondary">
                      {integrante.area}
                    </Badge>
                  ),
              )}
            </div>
          )}

          {/*
            La cuenta regresiva al segundo solo tiene sentido desde ahora.
            Parada en una fecha cualquiera, un contador tickeando es ruido.
          */}
          {esHoy ? (
            <div className="entra" style={enOrden(4)}>
              <CuentaRegresiva hasta={proximo.fecha} />
            </div>
          ) : (
            <p className="entra m-0 text-muted-foreground sm:text-lg 2xl:text-2xl" style={enOrden(4)}>
              {enCuantosDias(proximo.dias)}, el {fechaCorta(proximo.fecha)}
            </p>
          )}
        </>
      ) : (
        <p className="m-0 text-muted-foreground">Nadie tiene el cumpleaños cargado todavía.</p>
      )}

      {agenda}
    </main>
  );
}

function SinNadieCargado() {
  return (
    <main className={`${PANTALLA} aparece`}>
      <Empty>
        <EmptyHeader>
          <EmptyTitle>Todavía no hay nadie</EmptyTitle>
          <EmptyDescription>
            Cargá al primer integrante y su cumpleaños va a aparecer acá.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    </main>
  );
}
