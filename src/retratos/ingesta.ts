/**
 * Ingesta de Retratos: el Administrador pega una URL, la app se queda con una
 * copia propia. Ver `docs/adr/0001-retratos-copiados-no-referenciados.md`.
 *
 * Esto es un fetch del lado del servidor con una URL que escribe una persona,
 * o sea SSRF de manual. El servidor está en la red interna de la empresa, así
 * que "solo lo usa el admin" no alcanza: un enlace pegado sin mirar puede
 * apuntar a un servicio interno. De ahí el bloqueo de direcciones privadas.
 */

import { lookup } from 'node:dns/promises';
import sharp from 'sharp';
import { guardarRetrato } from './almacen.js';

/** 400px alcanza para la pantalla de Hoy y para una TV. */
const LADO = 400;
const MAX_BYTES = 8 * 1024 * 1024;
const TIMEOUT_MS = 10_000;
const MAX_REDIRECCIONES = 3;

export interface OpcionesDeIngesta {
  maxBytes?: number;
  timeoutMs?: number;
  directorio?: string;
  /** Solo para los tests, que sirven imágenes desde 127.0.0.1. */
  permitirRedPrivada?: boolean;
}

export class ErrorDeIngesta extends Error {}

function esIpPrivada(ip: string): boolean {
  const limpia = ip.startsWith('::ffff:') ? ip.slice(7) : ip;

  if (limpia.includes('.')) {
    const [a, b] = limpia.split('.').map(Number) as [number, number];
    if (a === 10 || a === 127 || a === 0) return true;
    if (a === 192 && b === 168) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 169 && b === 254) return true; // metadatos de nube
    if (a >= 224) return true; // multicast y reservadas
    return false;
  }

  const v6 = limpia.toLowerCase();
  if (v6 === '::1' || v6 === '::') return true;
  if (v6.startsWith('fe80')) return true; // link-local
  return /^f[cd]/.test(v6); // únicas locales
}

async function validarDestino(url: URL, permitirRedPrivada: boolean): Promise<void> {
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new ErrorDeIngesta(`Solo se aceptan URLs http o https, no ${url.protocol}`);
  }
  if (permitirRedPrivada) return;

  // Se valida la IP resuelta, no el nombre: un dominio puede apuntar adonde
  // quiera. Queda la ventana de DNS rebinding entre esta consulta y el fetch,
  // que para una acción manual de un administrador no justifica un pool propio.
  const { address } = await lookup(url.hostname);
  if (esIpPrivada(address)) {
    throw new ErrorDeIngesta(`${url.hostname} apunta a una dirección interna (${address})`);
  }
}

/** Descarga la imagen validando cada salto y cortando si se pasa de tamaño. */
export async function descargar(urlOriginal: string, opciones: OpcionesDeIngesta = {}): Promise<Buffer> {
  const maxBytes = opciones.maxBytes ?? MAX_BYTES;
  let url: URL;
  try {
    url = new URL(urlOriginal);
  } catch {
    throw new ErrorDeIngesta('La URL no es válida');
  }

  for (let salto = 0; salto <= MAX_REDIRECCIONES; salto++) {
    await validarDestino(url, opciones.permitirRedPrivada ?? false);

    const respuesta = await fetch(url, {
      redirect: 'manual',
      signal: AbortSignal.timeout(opciones.timeoutMs ?? TIMEOUT_MS),
      headers: { accept: 'image/*' },
    });

    if (respuesta.status >= 300 && respuesta.status < 400) {
      const destino = respuesta.headers.get('location');
      if (!destino) throw new ErrorDeIngesta('Redirección sin destino');
      // Cada salto se vuelve a validar: si no, un redirect a 169.254.169.254
      // saltea el control de arriba.
      url = new URL(destino, url);
      continue;
    }

    if (!respuesta.ok) {
      // Es lo que devuelve LinkedIn cuando expira la URL firmada.
      throw new ErrorDeIngesta(`La URL respondió ${respuesta.status}`);
    }

    const tipo = respuesta.headers.get('content-type') ?? '';
    if (!tipo.startsWith('image/')) {
      throw new ErrorDeIngesta(`La URL no devolvió una imagen (${tipo || 'sin content-type'})`);
    }

    const declarado = Number(respuesta.headers.get('content-length'));
    if (declarado > maxBytes) {
      throw new ErrorDeIngesta(`La imagen pesa más de ${Math.round(maxBytes / 1024 / 1024)} MB`);
    }

    // Se cuenta mientras se lee: sin content-length, el header no dice nada.
    const partes: Uint8Array[] = [];
    let total = 0;
    for await (const parte of respuesta.body as unknown as AsyncIterable<Uint8Array>) {
      total += parte.length;
      if (total > maxBytes) {
        throw new ErrorDeIngesta(`La imagen pesa más de ${Math.round(maxBytes / 1024 / 1024)} MB`);
      }
      partes.push(parte);
    }
    return Buffer.concat(partes);
  }

  throw new ErrorDeIngesta('Demasiadas redirecciones');
}

/**
 * Recorta al cuadrado y convierte a webp.
 * `rotate()` sin argumentos aplica la orientación EXIF: sin eso, las fotos
 * sacadas con el teléfono en vertical salen acostadas.
 * La metadata no se conserva, así que el GPS de la foto no viaja con ella.
 */
export async function procesarImagen(bytes: Buffer): Promise<Buffer> {
  try {
    return await sharp(bytes)
      .rotate()
      .resize(LADO, LADO, { fit: 'cover', position: 'attention' })
      .webp({ quality: 82 })
      .toBuffer();
  } catch {
    throw new ErrorDeIngesta('El archivo no es una imagen que se pueda procesar');
  }
}

export interface RetratoIngerido {
  /** Nombre del archivo guardado. Va a `integrantes.retrato`. */
  archivo: string;
  /** La URL de la que salió. Solo procedencia: nada del render la usa. */
  origen: string;
}

export async function ingerirRetrato(
  url: string,
  opciones: OpcionesDeIngesta = {},
): Promise<RetratoIngerido> {
  const bytes = await descargar(url, opciones);
  const procesada = await procesarImagen(bytes);
  const archivo = await guardarRetrato(procesada, opciones.directorio);
  return { archivo, origen: url };
}
