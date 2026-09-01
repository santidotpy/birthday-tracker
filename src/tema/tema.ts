/**
 * El tema visual: claro, oscuro, o lo que diga el sistema.
 *
 * Vive en una cookie y no en `localStorage` a propósito. El servidor renderiza
 * el HTML antes de que exista `localStorage`, así que con `localStorage` la
 * primera pintada sale siempre con el tema por defecto y recién después salta
 * al elegido: un fogonazo blanco en cada carga. La cookie viaja con el pedido,
 * el servidor la lee y estampa el tema en el `<html>` desde el vamos.
 *
 * Es puro y sin nada de Node ni de navegador: lo usan los dos lados.
 */

export const TEMAS = ['sistema', 'claro', 'oscuro'] as const;

export type Tema = (typeof TEMAS)[number];

/**
 * Seguir al sistema es el default y tiene que seguir siéndolo: en un celular,
 * oscuro de noche y claro de día es mejor que cualquier cosa que elijamos acá.
 */
export const TEMA_POR_DEFECTO: Tema = 'sistema';

export const NOMBRE_DE_COOKIE = 'tema';

/** Un año. Es una preferencia de dispositivo, no una sesión. */
const DURACION_EN_SEGUNDOS = 60 * 60 * 24 * 365;

export function esTema(valor: string): valor is Tema {
  return (TEMAS as readonly string[]).includes(valor);
}

/** Lo que viene de una cookie, de la URL o de un formulario. `null` si no sirve. */
export function temaONada(valor: string | null | undefined): Tema | null {
  if (!valor) return null;
  const limpio = valor.trim();
  return esTema(limpio) ? limpio : null;
}

/** Igual que `temaONada` pero sin nulos: un valor viejo o roto cae en el default. */
export function temaODefecto(valor: string | null | undefined): Tema {
  return temaONada(valor) ?? TEMA_POR_DEFECTO;
}

/**
 * El tema que pide la cabecera `Cookie` de un pedido.
 *
 * Parsea a mano porque es una sola cookie y no vale traer una dependencia.
 * Tolera espacios de más y cookies con `=` en el valor, que las hay.
 */
export function temaDeCookies(cabecera: string | null | undefined): Tema {
  if (!cabecera) return TEMA_POR_DEFECTO;

  for (const parte of cabecera.split(';')) {
    const corte = parte.indexOf('=');
    if (corte === -1) continue;
    if (parte.slice(0, corte).trim() !== NOMBRE_DE_COOKIE) continue;
    return temaODefecto(decodeURIComponent(parte.slice(corte + 1).trim()));
  }

  return TEMA_POR_DEFECTO;
}

/**
 * La cookie serializada, para `Set-Cookie` en el servidor o `document.cookie`
 * en el navegador.
 *
 * Sin `HttpOnly` porque el navegador tiene que poder escribirla al tocar el
 * selector, y sin `Secure` porque esto se sirve por HTTP dentro de la VPN de
 * la oficina: con `Secure` la cookie no se guardaría y el tema no persistiría.
 * No hay nada sensible acá: dice si la pantalla va clara u oscura.
 */
export function cookieDeTema(tema: Tema): string {
  return [
    `${NOMBRE_DE_COOKIE}=${tema}`,
    'Path=/',
    `Max-Age=${DURACION_EN_SEGUNDOS}`,
    'SameSite=Lax',
  ].join('; ');
}
