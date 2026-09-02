/**
 * Entrada de producción. Node plano, sin build propio.
 *
 * Existe porque la app tiene que servir tres cosas y el handler construido
 * solo se ocupa de una:
 *   /retratos/*  -> archivos del volumen persistente, fuera del build
 *   /assets/*    -> el bundle del cliente
 *   el resto     -> la app (SSR y server functions)
 */

import { existsSync, mkdirSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, resolve } from 'node:path';
import { Readable } from 'node:stream';
import sirv from 'sirv';
import app from '../dist/server/server.js';

const PUERTO = Number(process.env.PORT ?? 3000);
const RUTA_RETRATOS = process.env.RETRATOS_PATH ?? './datos/retratos';

/**
 * ¿La carpeta de datos es un volumen de verdad, o el disco del contenedor?
 *
 * Es la única falla que las variables de entorno no delatan: el Dockerfile
 * define `DATABASE_PATH=/datos/...`, así que la guarda de "falta la variable"
 * pasa siempre, incluso sin volumen montado. La app arrancaría bien, se
 * cargarían los cumpleaños y las fotos, y el primer redespliegue se lo llevaría
 * todo.
 *
 * Un volumen —nombrado o bind mount— es otro sistema de archivos, así que
 * tiene otro número de dispositivo que `/`. Si coinciden, `/datos` es una
 * carpeta común adentro de la imagen.
 *
 * Sólo se pregunta adentro de un contenedor: fuera de uno, que la carpeta de
 * datos comparta dispositivo con la raíz es lo normal y no significa nada.
 */
function laCarpetaDeDatosNoEsUnVolumen(rutaDeLaBase) {
  if (!existsSync('/.dockerenv')) return false;

  const carpeta = dirname(resolve(rutaDeLaBase));
  // Docker crea el punto de montaje. Si no existe, no hay nada montado ahí.
  if (!existsSync(carpeta)) return true;

  try {
    return statSync(carpeta).dev === statSync('/').dev;
  } catch {
    return false;
  }
}

/**
 * Revisa el entorno antes de servir nada.
 *
 * Todo lo que se mira acá falla en silencio si nadie lo mira: la app arranca,
 * contesta, y el daño recién se ve semanas después. Es más barato no arrancar.
 *
 * Sólo aplica en producción. En desarrollo los valores por defecto están bien
 * y `pnpm dev` levanta el `.env` solo; el contenedor **no** lee ningún `.env`,
 * las variables las inyecta Coolify.
 */
function revisarElEntorno() {
  if (process.env.NODE_ENV !== 'production') return;

  const problemas = [];
  const secreto = process.env.BETTER_AUTH_SECRET;

  if (!secreto) {
    problemas.push('Falta BETTER_AUTH_SECRET. Generalo con: openssl rand -base64 32');
  } else if (secreto.length < 32) {
    // El de `.env.example` es corto a propósito. Si llegó hasta acá, nadie lo
    // reemplazó, y un secreto adivinable deja falsificar sesiones de Administrador.
    problemas.push(
      `BETTER_AUTH_SECRET tiene ${secreto.length} caracteres: es el de ejemplo o uno muy corto. ` +
        'Generá uno real con: openssl rand -base64 32',
    );
  }

  // Sin estas dos, los caminos por defecto caen adentro del contenedor y cada
  // redespliegue se lleva los cumpleaños y las fotos sin decir nada.
  for (const variable of ['DATABASE_PATH', 'RETRATOS_PATH']) {
    if (!process.env[variable]) {
      problemas.push(`Falta ${variable}. Tiene que apuntar al volumen persistente.`);
    }
  }

  if (process.env.DATABASE_PATH && laCarpetaDeDatosNoEsUnVolumen(process.env.DATABASE_PATH)) {
    problemas.push(
      `${dirname(resolve(process.env.DATABASE_PATH))} no es un volumen persistente, ` +
        'es el disco del contenedor: todo lo que se cargue se borra en el próximo ' +
        'redespliegue. Agregá el volumen en Coolify, montado en ese camino.',
    );
  }

  if (!process.env.BETTER_AUTH_URL) {
    problemas.push('Falta BETTER_AUTH_URL con la URL pública: sin eso la sesión no se guarda.');
  }

  if (problemas.length > 0) {
    console.error('\nNo se puede arrancar:\n');
    for (const problema of problemas) console.error(`  - ${problema}`);
    console.error('\nSe configuran en las variables de entorno de Coolify.\n');
    process.exit(1);
  }
}

revisarElEntorno();

// Los nombres de Retrato son UUID y nunca se reescriben: al reemplazar una
// foto cambia el nombre. Por eso se pueden cachear para siempre.
const PARA_SIEMPRE = 'public,max-age=31536000,immutable';
const inmutable = { etag: true, maxAge: 31_536_000, immutable: true };

// El volumen recién montado viene vacío, y `sirv` recorre la carpeta al
// construirse: sin esto el primer despliegue muere con ENOENT antes de
// contestar nada. La base se crea sola al migrar; los Retratos no tenían quién
// se los creara hasta que se subiera el primero.
mkdirSync(RUTA_RETRATOS, { recursive: true });

// `dev: true` acá no es un descuido. Sin eso `sirv` arma el índice de archivos
// una sola vez, al arrancar, y **cada Retrato subido después queda en 404 hasta
// el próximo reinicio**. En modo `dev` mira el disco en cada pedido, que es lo
// que corresponde para una carpeta que crece mientras el proceso vive.
//
// El costo es que `sirv` impone su propio `Cache-Control: no-cache`. Por eso el
// de siempre se pone antes de delegar: `send()` respeta las cabeceras que ya
// estén en la respuesta.
const retratos = sirv(RUTA_RETRATOS, { dev: true, etag: true });

// `dist/client` sí se indexa al arrancar: el bundle no cambia mientras el
// proceso vive, y cada pedido se ahorra el viaje al disco.
const cliente = sirv('dist/client', inmutable);

function comoRequest(peticion) {
  const url = new URL(peticion.url, `http://${peticion.headers.host ?? 'localhost'}`);
  const tieneCuerpo = peticion.method !== 'GET' && peticion.method !== 'HEAD';
  return new Request(url, {
    method: peticion.method,
    headers: peticion.headers,
    body: tieneCuerpo ? Readable.toWeb(peticion) : undefined,
    duplex: tieneCuerpo ? 'half' : undefined,
  });
}

async function delegarALaApp(peticion, respuesta) {
  try {
    const resultado = await app.fetch(comoRequest(peticion));
    respuesta.writeHead(resultado.status, Object.fromEntries(resultado.headers));
    if (resultado.body) await Readable.fromWeb(resultado.body).pipe(respuesta);
    else respuesta.end();
  } catch (error) {
    console.error(error);
    respuesta.writeHead(500);
    respuesta.end('Error interno');
  }
}

createServer((peticion, respuesta) => {
  // Para el healthcheck de Coolify. Dice que el proceso está vivo y nada más:
  // no toca la base a propósito, porque si la base falla lo que corresponde es
  // mostrar la pantalla de error, no que el orquestador reinicie en loop algo
  // que no se arregla reiniciando.
  if (peticion.url === '/salud') {
    respuesta.writeHead(200, { 'content-type': 'application/json' });
    return respuesta.end(JSON.stringify({ estado: 'ok' }));
  }

  if (peticion.url?.startsWith('/retratos/')) {
    peticion.url = peticion.url.slice('/retratos'.length);
    respuesta.setHeader('Cache-Control', PARA_SIEMPRE);
    return retratos(peticion, respuesta, () => {
      // Un 404 no se cachea para siempre: la foto puede aparecer en un minuto.
      respuesta.removeHeader('Cache-Control');
      respuesta.writeHead(404);
      respuesta.end();
    });
  }
  cliente(peticion, respuesta, () => void delegarALaApp(peticion, respuesta));
}).listen(PUERTO, () => {
  console.log(`Cumpleaños escuchando en http://localhost:${PUERTO}`);
  console.log(`Base en ${process.env.DATABASE_PATH ?? '(por defecto)'}`);
  console.log(`Retratos desde ${RUTA_RETRATOS}`);
});
