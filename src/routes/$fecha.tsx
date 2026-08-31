import { createFileRoute, notFound } from '@tanstack/react-router';
import { PantallaDeCumpleanos } from '../componentes/PantallaDeCumpleanos.js';
import { hoyEnArgentina, mismaFecha, parsearFechaISO } from '../domain/fechas.js';
import { obtenerIntegrantes } from '../servidor/consultas.js';

/**
 * Cualquier día del calendario por URL: `/2026-09-06`.
 * La ruta existe desde el día uno porque sale gratis siendo un parámetro; la
 * forma de llegar sin escribirla a mano es la Agenda (paso 5).
 */
export const Route = createFileRoute('/$fecha')({
  loader: async ({ params }) => {
    const fecha = parsearFechaISO(params.fecha);
    if (!fecha) throw notFound();
    return { fecha, integrantes: await obtenerIntegrantes() };
  },
  component: EnUnaFecha,
});

function EnUnaFecha() {
  const { fecha, integrantes } = Route.useLoaderData();
  return (
    <PantallaDeCumpleanos
      integrantes={integrantes}
      fecha={fecha}
      esHoy={mismaFecha(fecha, hoyEnArgentina())}
    />
  );
}
