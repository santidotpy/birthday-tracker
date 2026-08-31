import { createFileRoute } from '@tanstack/react-router';
import { PantallaDeCumpleanos } from '../componentes/PantallaDeCumpleanos.js';
import { useDatosFrescos, useHoyEnArgentina } from '../componentes/frescura.js';
import { obtenerIntegrantes } from '../servidor/consultas.js';

export const Route = createFileRoute('/')({
  loader: () => obtenerIntegrantes(),
  component: Hoy,
});

function Hoy() {
  const integrantes = Route.useLoaderData();
  // Hoy se calcula en el cliente, en horario de Argentina (ADR 0003), y se
  // recalcula solo al cruzar la medianoche: esta pantalla va a quedar abierta.
  const hoy = useHoyEnArgentina();
  useDatosFrescos();

  return <PantallaDeCumpleanos integrantes={integrantes} fecha={hoy} esHoy />;
}
