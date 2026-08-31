import { Badge } from '@/components/ui/badge';
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty';
import { type Integrante, cumpleanerosEn, proximoCumpleanos } from '../domain/agenda.js';
import type { FechaSimple } from '../domain/fechas.js';
import { Agenda } from './Agenda.js';
import { Confetti } from './Confetti.js';
import { CuentaRegresiva } from './CuentaRegresiva.js';
import { Retrato } from './Retrato.js';
import { comoISO, enCuantosDias, fechaCorta, fechaLarga, unirNombres } from './formato.js';

const PANTALLA =
  'aparece flex min-h-dvh flex-col items-center justify-center gap-5 p-6 text-center sm:gap-8 sm:p-10';

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

  const agenda = <Agenda integrantes={integrantes} desde={fecha} />;

  return cumpleaneros.length > 0 ? (
    <Celebracion cumpleaneros={cumpleaneros} fecha={fecha} proximo={proximo} agenda={agenda} />
  ) : (
    <DiaTranquilo fecha={fecha} esHoy={esHoy} proximo={proximo} agenda={agenda} />
  );
}

type Proximo = ReturnType<typeof proximoCumpleanos>;

function Celebracion({
  cumpleaneros,
  fecha,
  proximo,
  agenda,
}: {
  cumpleaneros: Integrante[];
  fecha: FechaSimple;
  proximo: Proximo;
  agenda: React.ReactNode;
}) {
  const varios = cumpleaneros.length > 1;

  return (
    <main className={PANTALLA}>
      <Confetti clave={comoISO(fecha)} />

      <div className="flex flex-wrap items-end justify-center gap-4 sm:gap-10">
        {cumpleaneros.map((integrante) => (
          <figure key={integrante.id} className="m-0 flex flex-col items-center gap-3">
            <Retrato integrante={integrante} conGorrito tamano={varios ? 'medio' : 'hero'} />
            {varios && (
              <figcaption className="flex flex-col items-center gap-1.5">
                <span className="text-lg font-semibold">{integrante.nombre}</span>
                {integrante.area && <Badge variant="secondary">{integrante.area}</Badge>}
              </figcaption>
            )}
          </figure>
        ))}
      </div>

      <h1 className="m-0 text-3xl leading-tight font-bold tracking-tight text-balance sm:text-5xl lg:text-7xl">
        ¡Feliz cumpleaños,{' '}
        <span className="text-primary">{unirNombres(cumpleaneros.map((i) => i.nombre))}!</span>
      </h1>

      {/* Con una sola persona el área va suelta; con varias va bajo cada retrato. */}
      {!varios && cumpleaneros[0]?.area && (
        <Badge variant="secondary" className="px-3 py-1 text-sm sm:text-base">
          {cumpleaneros[0].area}
        </Badge>
      )}

      {proximo && (
        <p className="m-0 max-w-[34ch] leading-relaxed text-balance text-muted-foreground">
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
      <p className="m-0 text-sm tracking-wide lowercase text-muted-foreground">
        <time dateTime={comoISO(fecha)}>{esHoy ? 'Hoy' : fechaLarga(fecha)}</time>
        {' · '}
        {esHoy ? fechaCorta(fecha) : 'sin cumpleaños'}
      </p>

      {proximo ? (
        <>
          <div className="flex flex-wrap items-end justify-center gap-4 sm:gap-6">
            {proximo.integrantes.map((integrante) => (
              <Retrato key={integrante.id} integrante={integrante} tamano="medio" />
            ))}
          </div>

          <h1 className="m-0 flex flex-col gap-1.5">
            <span className="text-base font-normal text-muted-foreground sm:text-lg">
              El próximo cumpleaños es de
            </span>
            <span className="text-3xl font-bold tracking-tight text-balance sm:text-5xl">
              {unirNombres(proximo.integrantes.map((i) => i.nombre))}
            </span>
          </h1>

          {proximo.integrantes.some((i) => i.area) && (
            <div className="flex flex-wrap justify-center gap-2">
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
            <CuentaRegresiva hasta={proximo.fecha} />
          ) : (
            <p className="m-0 text-muted-foreground sm:text-lg">
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
    <main className={PANTALLA}>
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
