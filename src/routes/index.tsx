import { createFileRoute } from '@tanstack/react-router';
import { PantallaDeCumpleanos } from '../componentes/PantallaDeCumpleanos.js';
import { hoyEnArgentina } from '../domain/fechas.js';
import { obtenerIntegrantes } from '../servidor/consultas.js';

export const Route = createFileRoute('/')({
  loader: () => obtenerIntegrantes(),
  component: Hoy,
});

function Hoy() {
  const integrantes = Route.useLoaderData();
  // Hoy se calcula en el cliente, en horario de Argentina (ADR 0003).
  return <PantallaDeCumpleanos integrantes={integrantes} fecha={hoyEnArgentina()} esHoy />;
}
