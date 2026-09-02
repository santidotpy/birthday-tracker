import { Alert, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';
import { createFileRoute, redirect, useRouter } from '@tanstack/react-router';
import { LogOutIcon, MonitorIcon } from 'lucide-react';
import { useState } from 'react';
import { Retrato } from '../componentes/Retrato.js';
import { Cuenta } from '../componentes/Cuenta.js';
import { SelectorDeTema } from '../componentes/SelectorDeTema.js';
import { diaMesLargo, nombresDeMes } from '../componentes/formato.js';
import type { Integrante } from '../domain/agenda.js';
import { AREAS, areaONada } from '../domain/areas.js';
import { cambiarArchivado, crear, editar, listarParaAdmin } from '../servidor/admin.js';
import { cerrarSesion, sesionActual } from '../servidor/sesion.js';

/** El Select necesita un string; este representa "sin Área". */
const SIN_AREA = '__ninguna';

/*
 * Base UI muestra el valor crudo salvo que Root reciba el mapa de etiquetas.
 * Sin esto el trigger decía "1" en vez de "enero" y "__ninguna" en vez de
 * "Sin área".
 */
const ETIQUETAS_DE_MES = Object.fromEntries(
  nombresDeMes.map((nombre, indice) => [String(indice + 1), nombre]),
);

const ETIQUETAS_DE_AREA = {
  [SIN_AREA]: 'Sin área',
  ...Object.fromEntries(AREAS.map((area) => [area, area])),
};

export const Route = createFileRoute('/admin')({
  beforeLoad: async () => {
    const admin = await sesionActual();
    if (!admin) throw redirect({ to: '/entrar' });
    // Viaja como contexto de la ruta para que el diálogo de Cuenta sepa con
    // qué email se entró, sin pedir la sesión una segunda vez.
    return { admin };
  },
  loader: () => listarParaAdmin(),
  component: Admin,
});

function Admin() {
  const integrantes = Route.useLoaderData();
  const { admin } = Route.useRouteContext();
  const router = useRouter();
  const [editando, setEditando] = useState<Integrante | null>(null);

  const activos = integrantes.filter((i) => !i.archivado);
  const archivados = integrantes.filter((i) => i.archivado);

  async function refrescar() {
    setEditando(null);
    await router.invalidate();
  }

  return (
    <main className="aparece mx-auto flex w-full max-w-3xl flex-col gap-5 p-6 sm:p-10">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="m-0 text-2xl font-bold tracking-tight sm:text-3xl">
          Integrantes{' '}
          <span className="align-middle text-base font-medium text-muted-foreground">
            {activos.length}
          </span>
        </h1>

        <div className="flex items-center gap-2">
          <SelectorDeTema compacto />
          <Cuenta emailActual={admin.email} />
          <Button variant="outline" size="sm" render={<a href="/" />}>
            <MonitorIcon data-icon="inline-start" />
            Ver la pantalla
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              await cerrarSesion();
              await router.navigate({ to: '/entrar' });
            }}
          >
            <LogOutIcon data-icon="inline-start" />
            Salir
          </Button>
        </div>
      </header>

      <Formulario
        key={editando?.id ?? 'nuevo'}
        integrante={editando}
        alGuardar={refrescar}
        alCancelar={() => setEditando(null)}
      />

      <ListaDeIntegrantes
        titulo="Activos"
        integrantes={activos}
        alEditar={setEditando}
        alCambiarArchivado={refrescar}
        vacio="Todavía no hay nadie. Cargá al primero acá arriba."
      />

      {archivados.length > 0 && (
        <ListaDeIntegrantes
          titulo="Archivados"
          integrantes={archivados}
          alEditar={setEditando}
          alCambiarArchivado={refrescar}
        />
      )}
    </main>
  );
}

function Formulario({
  integrante,
  alGuardar,
  alCancelar,
}: {
  integrante: Integrante | null;
  alGuardar: () => Promise<void>;
  alCancelar: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  // Mes y casilla van por estado: los componentes de Base UI no participan
  // de un FormData nativo como lo harían un <select> y un <input> comunes.
  const [mes, setMes] = useState(String(integrante?.fechaDeCumpleanos.mes ?? 1));
  const [quitarRetrato, setQuitarRetrato] = useState(false);
  const [area, setArea] = useState(integrante?.area ?? SIN_AREA);

  async function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const campos = new FormData(evento.currentTarget);
    const url = String(campos.get('urlDeRetrato') ?? '').trim();

    const datos = {
      nombre: String(campos.get('nombre') ?? ''),
      fechaDeCumpleanos: { mes: Number(mes), dia: Number(campos.get('dia')) },
      pais: String(campos.get('pais') ?? '').trim() || null,
      area: area === SIN_AREA ? null : areaONada(area),
      // Tres estados: quitar la foto, reemplazarla, o dejarla como está.
      urlDeRetrato: quitarRetrato ? null : url !== '' ? url : undefined,
    };

    setGuardando(true);
    setError(null);
    try {
      if (integrante) await editar({ data: { ...datos, id: integrante.id } });
      else await crear({ data: datos });
      await alGuardar();
    } catch (fallo) {
      setError(fallo instanceof Error ? fallo.message : 'No se pudo guardar');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {integrante ? `Editando a ${integrante.nombre}` : 'Agregar integrante'}
        </CardTitle>
      </CardHeader>

      <CardContent>
        <form onSubmit={enviar}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="nombre">Nombre</FieldLabel>
              <Input
                id="nombre"
                name="nombre"
                defaultValue={integrante?.nombre ?? ''}
                required
                maxLength={120}
              />
            </Field>

            <div className="flex flex-wrap gap-4">
              <Field className="w-24 shrink-0">
                <FieldLabel htmlFor="dia">Día</FieldLabel>
                <Input
                  id="dia"
                  name="dia"
                  type="number"
                  min={1}
                  max={31}
                  defaultValue={integrante?.fechaDeCumpleanos.dia ?? ''}
                  required
                />
              </Field>

              <Field className="w-44 shrink-0">
                <FieldLabel htmlFor="mes">Mes</FieldLabel>
                <Select
                  items={ETIQUETAS_DE_MES}
                  value={mes}
                  onValueChange={(valor) => setMes(valor ?? '1')}
                >
                  <SelectTrigger id="mes">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {nombresDeMes.map((nombre, indice) => (
                        <SelectItem key={nombre} value={String(indice + 1)}>
                          {nombre}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>

            </div>

            <div className="flex flex-wrap gap-4">
              <Field className="w-56 shrink-0">
                <FieldLabel htmlFor="area">Área</FieldLabel>
                <Select
                  items={ETIQUETAS_DE_AREA}
                  value={area}
                  onValueChange={(valor) => setArea(valor ?? SIN_AREA)}
                >
                  <SelectTrigger id="area">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value={SIN_AREA}>Sin área</SelectItem>
                      {AREAS.map((nombre) => (
                        <SelectItem key={nombre} value={nombre}>
                          {nombre}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>

              <Field className="w-24 shrink-0">
                <FieldLabel htmlFor="pais">País</FieldLabel>
                <Input
                  id="pais"
                  name="pais"
                  defaultValue={integrante?.pais ?? ''}
                  maxLength={40}
                  placeholder="AR"
                />
              </Field>
            </div>

            <Field>
              <FieldLabel htmlFor="urlDeRetrato">URL de una foto</FieldLabel>
              <Input
                id="urlDeRetrato"
                name="urlDeRetrato"
                type="url"
                disabled={quitarRetrato}
                placeholder={
                  integrante?.retrato ? 'Dejar vacío para conservar la actual' : 'https://…'
                }
              />
              <FieldDescription>
                Se descarga una vez y queda guardada acá. Si la original se rompe o cambia, esta no.
              </FieldDescription>
            </Field>

            {integrante?.retrato && (
              <Field orientation="horizontal">
                <Checkbox
                  id="quitarRetrato"
                  checked={quitarRetrato}
                  onCheckedChange={(marcado) => setQuitarRetrato(marcado === true)}
                />
                <FieldLabel htmlFor="quitarRetrato">Quitar la foto actual</FieldLabel>
              </Field>
            )}

            {error && (
              <Alert variant="destructive" role="alert">
                <AlertTitle>{error}</AlertTitle>
              </Alert>
            )}

            <div className="flex gap-2">
              <Button type="submit" disabled={guardando}>
                {guardando && <Spinner data-icon="inline-start" />}
                {guardando ? 'Guardando…' : integrante ? 'Guardar cambios' : 'Agregar'}
              </Button>
              {integrante && (
                <Button type="button" variant="outline" onClick={alCancelar}>
                  Cancelar
                </Button>
              )}
            </div>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}

function ListaDeIntegrantes({
  titulo,
  integrantes,
  alEditar,
  alCambiarArchivado,
  vacio,
}: {
  titulo: string;
  integrantes: Integrante[];
  alEditar: (integrante: Integrante) => void;
  alCambiarArchivado: () => Promise<void>;
  vacio?: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{titulo}</CardTitle>
      </CardHeader>

      <CardContent>
        {integrantes.length === 0 ? (
          <p className="m-0 text-sm text-muted-foreground">{vacio}</p>
        ) : (
          <ul className="m-0 flex list-none flex-col p-0">
            {integrantes.map((integrante, indice) => (
              <li key={integrante.id}>
                {indice > 0 && <Separator />}
                <div
                  className="flex flex-wrap items-center gap-3 py-3 data-[archivado=true]:opacity-55"
                  data-archivado={integrante.archivado}
                >
                  <Retrato integrante={integrante} tamano="fila" />

                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate font-semibold">{integrante.nombre}</span>
                      {integrante.area && <Badge variant="secondary">{integrante.area}</Badge>}
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {diaMesLargo(integrante.fechaDeCumpleanos)}
                      {integrante.pais ? ` · ${integrante.pais}` : ''}
                    </span>
                  </div>

                  <div className="flex shrink-0 gap-2">
                    <Button variant="outline" size="sm" onClick={() => alEditar(integrante)}>
                      Editar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        await cambiarArchivado({
                          data: { id: integrante.id, archivar: !integrante.archivado },
                        });
                        await alCambiarArchivado();
                      }}
                    >
                      {integrante.archivado ? 'Restaurar' : 'Archivar'}
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
