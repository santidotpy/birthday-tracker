import { type Integrante, cumpleanerosEn, proximoCumpleanos } from '../domain/agenda.js';
import type { FechaSimple } from '../domain/fechas.js';
import { Confetti } from './Confetti.js';
import { CuentaRegresiva } from './CuentaRegresiva.js';
import { Retrato } from './Retrato.js';
import { comoISO, enCuantosDias, fechaCorta, fechaLarga, unirNombres } from './formato.js';

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

  return cumpleaneros.length > 0 ? (
    <Celebracion cumpleaneros={cumpleaneros} fecha={fecha} proximo={proximo} />
  ) : (
    <DiaTranquilo fecha={fecha} esHoy={esHoy} proximo={proximo} />
  );
}

type Proximo = ReturnType<typeof proximoCumpleanos>;

function Celebracion({
  cumpleaneros,
  fecha,
  proximo,
}: {
  cumpleaneros: Integrante[];
  fecha: FechaSimple;
  proximo: Proximo;
}) {
  return (
    <main className="pantalla pantalla-fiesta">
      <Confetti clave={comoISO(fecha)} />

      <div className="retratos" data-cuantos={cumpleaneros.length}>
        {cumpleaneros.map((integrante) => (
          <figure key={integrante.id} className="cumpleanero">
            <Retrato integrante={integrante} conGorrito />
            {cumpleaneros.length > 1 && <figcaption>{integrante.nombre}</figcaption>}
          </figure>
        ))}
      </div>

      <h1 className="saludo">
        <span className="saludo-feliz">¡Feliz cumpleaños,</span>{' '}
        <span className="saludo-nombre">{unirNombres(cumpleaneros.map((i) => i.nombre))}!</span>
      </h1>

      {proximo && (
        <p className="nota-proximo">
          El próximo cumpleaños es de <strong>{unirNombres(proximo.integrantes.map((i) => i.nombre))}</strong>,{' '}
          {enCuantosDias(proximo.dias)}.
        </p>
      )}
    </main>
  );
}

function DiaTranquilo({
  fecha,
  esHoy,
  proximo,
}: {
  fecha: FechaSimple;
  esHoy: boolean;
  proximo: Proximo;
}) {
  return (
    <main className="pantalla pantalla-tranquila">
      <p className="fecha-mirada">
        <time dateTime={comoISO(fecha)}>{esHoy ? 'Hoy' : fechaLarga(fecha)}</time>
        {' · '}
        {esHoy ? fechaCorta(fecha) : 'sin cumpleaños'}
      </p>

      {proximo ? (
        <>
          <div className="retratos retratos-chicos" data-cuantos={proximo.integrantes.length}>
            {proximo.integrantes.map((integrante) => (
              <Retrato key={integrante.id} integrante={integrante} />
            ))}
          </div>

          <h1 className="proximo-titulo">
            <span className="proximo-etiqueta">El próximo cumpleaños es de</span>
            <span className="proximo-nombre">
              {unirNombres(proximo.integrantes.map((i) => i.nombre))}
            </span>
          </h1>

          {/*
            La cuenta regresiva al segundo solo tiene sentido desde ahora.
            Parada en una fecha cualquiera, un contador tickeando es ruido.
          */}
          {esHoy ? (
            <CuentaRegresiva hasta={proximo.fecha} />
          ) : (
            <p className="cuenta-estatica">
              {enCuantosDias(proximo.dias)}, el {fechaCorta(proximo.fecha)}
            </p>
          )}
        </>
      ) : (
        <p className="nota-vacia">Nadie tiene el cumpleaños cargado todavía.</p>
      )}
    </main>
  );
}

function SinNadieCargado() {
  return (
    <main className="pantalla pantalla-tranquila">
      <h1 className="proximo-titulo">
        <span className="proximo-nombre">Todavía no hay nadie</span>
      </h1>
      <p className="nota-vacia">
        Cargá al primer integrante y su cumpleaños va a aparecer acá.
      </p>
    </main>
  );
}
