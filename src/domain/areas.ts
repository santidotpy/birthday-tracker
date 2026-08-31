/**
 * Las Áreas de la empresa. Lista cerrada: el Administrador elige de acá, no
 * escribe libre, para que no convivan "IT", "Sistemas" e "it" como si fueran
 * cosas distintas.
 *
 * ---------------------------------------------------------------------------
 * PARA AGREGAR O RENOMBRAR UN ÁREA: editá esta lista y volvé a desplegar.
 * Es el único lugar donde vive. Nada más hay que tocar.
 * ---------------------------------------------------------------------------
 *
 * IT y Control de Gestión son las confirmadas. El resto son áreas genéricas de
 * empresa, agregadas a pedido como punto de partida: NO son el organigrama
 * real. Borrá las que no existan antes de que alguien las elija por error.
 *
 * En orden alfabético, que es el orden en que aparecen en el desplegable.
 *
 * Al quitar un Área, los Integrantes que la tenían quedan con un valor que ya
 * no está en la lista. `esAreaValida` los detecta y la app los muestra sin
 * Área en vez de romperse.
 */
export const AREAS = [
  'Administración',
  'Comercial',
  'Contaduría',
  'Control de Gestión',
  'IT',
  'Legales',
  'Marketing',
  'Operaciones',
  'Recursos Humanos',
] as const;

export type Area = (typeof AREAS)[number];

export function esAreaValida(valor: string): valor is Area {
  return (AREAS as readonly string[]).includes(valor);
}

/**
 * Normaliza lo que viene de la base o de un formulario.
 * Devuelve `null` para vacío, y también para un Área que salió de la lista:
 * un dato viejo no debería tumbar la pantalla de cumpleaños de alguien.
 */
export function areaONada(valor: string | null | undefined): Area | null {
  if (!valor) return null;
  const limpio = valor.trim();
  return esAreaValida(limpio) ? limpio : null;
}
