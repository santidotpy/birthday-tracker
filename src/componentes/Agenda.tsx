import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { CalendarDaysIcon, SearchIcon } from 'lucide-react';
import { useMemo, useState } from 'react';
import { type Integrante, agenda, agendaPorMes } from '../domain/agenda.js';
import type { FechaSimple } from '../domain/fechas.js';
import { Retrato } from './Retrato.js';
import { SelectorDeTema } from './SelectorDeTema.js';
import { diaMesLargo, enCuantosDias, mesDeAgenda } from './formato.js';

interface Props {
  integrantes: Integrante[];
  /** La fecha desde la que se ordena. La Agenda la incluye. */
  desde: FechaSimple;
}

/** Normaliza para buscar sin acentos ni mayúsculas: "peña" encuentra "Peña". */
function paraBuscar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/** Cierto solo cuando la Ocurrencia cae en otra fecha que la de nacimiento. */
function seObservaOtroDia(
  integrante: Integrante,
  entrada: { fecha: FechaSimple },
): boolean {
  return (
    entrada.fecha.mes !== integrante.fechaDeCumpleanos.mes ||
    entrada.fecha.dia !== integrante.fechaDeCumpleanos.dia
  );
}

/**
 * La Agenda: todos los cumpleaños desde hoy hacia adelante, dando la vuelta al
 * año. Contesta las dos preguntas que la pantalla de Hoy no contesta —"¿quién
 * sigue?" y "¿cuándo cumple X?"— sin obligar a navegar día por día.
 */
export function Agenda({ integrantes, desde }: Props) {
  const [busqueda, setBusqueda] = useState('');

  const meses = useMemo(() => {
    const termino = paraBuscar(busqueda.trim());
    const entradas = agenda(integrantes, desde)
      .map((entrada) => ({
        ...entrada,
        integrantes: termino
          ? entrada.integrantes.filter(
              (i) =>
                paraBuscar(i.nombre).includes(termino) ||
                (i.area ? paraBuscar(i.area).includes(termino) : false),
            )
          : entrada.integrantes,
      }))
      .filter((entrada) => entrada.integrantes.length > 0);

    return agendaPorMes(entradas);
  }, [integrantes, desde, busqueda]);

  const total = meses.reduce((suma, mes) => suma + mes.entradas.length, 0);

  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button variant="ghost" size="sm" className="text-muted-foreground">
            <CalendarDaysIcon data-icon="inline-start" />
            Ver todos los cumpleaños
          </Button>
        }
      />

      <DialogContent className="flex max-h-[85dvh] flex-col gap-0 p-0 sm:max-w-lg">
        <DialogHeader className="border-b p-5 pb-4 text-left">
          <DialogTitle>Todos los cumpleaños</DialogTitle>
          <DialogDescription>
            Desde hoy hacia adelante. Buscá por nombre o por área.
          </DialogDescription>

          <div className="relative mt-3">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={busqueda}
              onChange={(evento) => setBusqueda(evento.target.value)}
              placeholder="Buscar…"
              className="pl-9"
              aria-label="Buscar por nombre o área"
            />
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {total === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">
              {busqueda.trim() ? `Nadie coincide con "${busqueda.trim()}".` : 'Todavía no hay nadie cargado.'}
            </p>
          ) : (
            meses.map((mes) => (
              <section key={`${mes.anio}-${mes.mes}`}>
                {/*
                  El encabezado queda pegado arriba al scrollear: con la lista
                  a mitad de camino, saber en qué mes estás parado es la única
                  referencia que queda.
                */}
                <h3 className="sticky top-0 z-10 bg-background/95 px-5 py-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase backdrop-blur">
                  {mesDeAgenda(mes.anio, mes.mes, desde.anio)}
                </h3>

                <ul className="m-0 list-none p-0">
                  {mes.entradas.flatMap((entrada) =>
                    entrada.integrantes.map((integrante) => (
                      <li
                        key={integrante.id}
                        className="flex items-center gap-3 px-5 py-2.5 data-[hoy=true]:bg-primary/10"
                        data-hoy={entrada.dias === 0}
                      >
                        <Retrato integrante={integrante} tamano="fila" />

                        <div className="flex min-w-0 flex-1 flex-col">
                          <div className="flex min-w-0 flex-wrap items-center gap-2">
                            <span className="truncate font-medium">{integrante.nombre}</span>
                            {integrante.area && (
                              <Badge variant="secondary" className="shrink-0">
                                {integrante.area}
                              </Badge>
                            )}
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {diaMesLargo(integrante.fechaDeCumpleanos)}
                            {/*
                              Solo pasa con el 29 de febrero en un año no
                              bisiesto. Sin esta aclaración, la fila dice
                              "29 de febrero" debajo de un encabezado que dice
                              "marzo" y parece un error.
                            */}
                            {seObservaOtroDia(integrante, entrada) && (
                              <> · se festeja el {diaMesLargo(entrada.fecha)}</>
                            )}
                          </span>
                        </div>

                        <span
                          className="shrink-0 text-sm text-muted-foreground data-[hoy=true]:font-semibold data-[hoy=true]:text-primary"
                          data-hoy={entrada.dias === 0}
                        >
                          {enCuantosDias(entrada.dias)}
                        </span>
                      </li>
                    )),
                  )}
                </ul>
              </section>
            ))
          )}
        </div>

        {/*
          El tema vive acá y no en la pantalla de Hoy a propósito: esa pantalla
          contesta una sola pregunta de un vistazo y no tiene un solo control
          más que este diálogo. Quien viene a cambiar el tema ya está mirando,
          no de reojo.
        */}
        <div className="flex items-center justify-between gap-3 border-t p-3">
          <span className="pl-2 text-sm text-muted-foreground">Tema</span>
          <SelectorDeTema />
        </div>
      </DialogContent>
    </Dialog>
  );
}
