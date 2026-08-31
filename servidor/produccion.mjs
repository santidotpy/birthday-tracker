/**
 * Entrada de producción. Node plano, sin build propio.
 *
 * Existe porque la app tiene que servir tres cosas y el handler construido
 * solo se ocupa de una:
 *   /retratos/*  -> archivos del volumen persistente, fuera del build
 *   /assets/*    -> el bundle del cliente
 *   el resto     -> la app (SSR y server functions)
 */

import { createServer } from 'node:http';
import { Readable } from 'node:stream';
import sirv from 'sirv';
import app from '../dist/server/server.js';

const PUERTO = Number(process.env.PORT ?? 3000);
const RUTA_RETRATOS = process.env.RETRATOS_PATH ?? './datos/retratos';

// Los nombres de Retrato son UUID y nunca se reescriben: al reemplazar una
// foto cambia el nombre. Por eso se pueden cachear para siempre.
const inmutable = { etag: true, maxAge: 31_536_000, immutable: true };

const retratos = sirv(RUTA_RETRATOS, inmutable);
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
  if (peticion.url?.startsWith('/retratos/')) {
    peticion.url = peticion.url.slice('/retratos'.length);
    return retratos(peticion, respuesta, () => {
      respuesta.writeHead(404);
      respuesta.end();
    });
  }
  cliente(peticion, respuesta, () => void delegarALaApp(peticion, respuesta));
}).listen(PUERTO, () => {
  console.log(`Cumpleaños escuchando en http://localhost:${PUERTO}`);
  console.log(`Retratos desde ${RUTA_RETRATOS}`);
});
