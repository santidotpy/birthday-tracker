import { createServer, type Server } from 'node:http';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { rutaDeRetrato } from './almacen.js';
import { ErrorDeIngesta, descargar, ingerirRetrato, procesarImagen } from './ingesta.js';

let servidor: Server;
let base: string;
let directorio: string;

/** Imagen apaisada, para comprobar que el recorte la deja cuadrada. */
async function imagenDePrueba(ancho = 800, alto = 600): Promise<Buffer> {
  return sharp({
    create: { width: ancho, height: alto, channels: 3, background: { r: 200, g: 30, b: 30 } },
  })
    .png()
    .toBuffer();
}

beforeAll(async () => {
  const png = await imagenDePrueba();

  servidor = createServer(async (peticion, respuesta) => {
    const ruta = peticion.url ?? '/';

    if (ruta === '/foto.png') {
      respuesta.writeHead(200, { 'content-type': 'image/png' });
      respuesta.end(png);
    } else if (ruta === '/no-es-imagen') {
      respuesta.writeHead(200, { 'content-type': 'text/html' });
      respuesta.end('<html>hola</html>');
    } else if (ruta === '/sin-content-type') {
      respuesta.writeHead(200, {});
      respuesta.end(png);
    } else if (ruta === '/rota') {
      respuesta.writeHead(200, { 'content-type': 'image/png' });
      respuesta.end(Buffer.from('esto no es un png'));
    } else if (ruta === '/expirada') {
      // Lo que devuelve LinkedIn cuando vence la URL firmada.
      respuesta.writeHead(403, { 'content-type': 'text/plain' });
      respuesta.end('Forbidden');
    } else if (ruta === '/redirige') {
      respuesta.writeHead(302, { location: '/foto.png' });
      respuesta.end();
    } else if (ruta === '/redirige-siempre') {
      respuesta.writeHead(302, { location: '/redirige-siempre' });
      respuesta.end();
    } else if (ruta === '/gigante-declarado') {
      respuesta.writeHead(200, { 'content-type': 'image/png', 'content-length': '99999999' });
      respuesta.end(png);
    } else if (ruta === '/gigante-sin-declarar') {
      // Sin content-length: solo contando mientras se lee se lo puede frenar.
      respuesta.writeHead(200, { 'content-type': 'image/png' });
      for (let i = 0; i < 40; i++) respuesta.write(Buffer.alloc(256 * 1024, 1));
      respuesta.end();
    } else {
      respuesta.writeHead(404);
      respuesta.end();
    }
  });

  await new Promise<void>((listo) => servidor.listen(0, '127.0.0.1', listo));
  base = `http://127.0.0.1:${(servidor.address() as AddressInfo).port}`;
});

afterAll(async () => {
  await new Promise<void>((listo) => servidor.close(() => listo()));
});

beforeEach(async () => {
  directorio = await mkdtemp(join(tmpdir(), 'ingesta-'));
});

afterEach(async () => {
  await rm(directorio, { recursive: true, force: true });
});

/** La red privada solo se habilita acá: el servidor de prueba es 127.0.0.1. */
const local = () => ({ permitirRedPrivada: true, directorio });

/**
 * Lee el retrato guardado a memoria antes de mirarlo. Pasarle la ruta a sharp
 * deja el archivo abierto y en Windows la limpieza falla con EBUSY.
 */
async function retratoGuardado(archivo: string) {
  return sharp(await readFile(rutaDeRetrato(archivo, directorio))).metadata();
}

describe('ingerirRetrato', () => {
  it('descarga, recorta al cuadrado y guarda una copia propia', async () => {
    const { archivo, origen } = await ingerirRetrato(`${base}/foto.png`, local());

    const guardada = await retratoGuardado(archivo);
    expect(guardada.format).toBe('webp');
    expect(guardada.width).toBe(400);
    expect(guardada.height).toBe(400);
    expect(origen).toBe(`${base}/foto.png`);
  });

  it('sigue una redirección', async () => {
    const { archivo } = await ingerirRetrato(`${base}/redirige`, local());
    expect((await retratoGuardado(archivo)).width).toBe(400);
  });
});

describe('descargar rechaza', () => {
  const casos: Array<[string, string, RegExp]> = [
    ['una URL que no es imagen', '/no-es-imagen', /no devolvió una imagen/i],
    ['una respuesta sin content-type', '/sin-content-type', /no devolvió una imagen/i],
    ['una URL firmada vencida', '/expirada', /respondió 403/i],
    ['una imagen demasiado grande declarada', '/gigante-declarado', /más de/i],
    ['una imagen demasiado grande sin declarar', '/gigante-sin-declarar', /más de/i],
    ['un ciclo de redirecciones', '/redirige-siempre', /demasiadas redirecciones/i],
  ];

  it.each(casos)('%s', async (_, ruta, mensaje) => {
    await expect(descargar(`${base}${ruta}`, { ...local(), maxBytes: 5 * 1024 * 1024 })).rejects.toThrow(
      mensaje,
    );
  });

  it('una URL que no se puede parsear', async () => {
    await expect(descargar('no-es-una-url', local())).rejects.toThrow(/no es válida/i);
  });

  it('un protocolo que no es http ni https', async () => {
    await expect(descargar('ftp://ejemplo.com/foto.png', local())).rejects.toThrow(/http o https/i);
    await expect(descargar('file:///etc/passwd', local())).rejects.toThrow(/http o https/i);
  });
});

describe('el bloqueo de red interna', () => {
  it('rechaza direcciones privadas cuando no se lo desactiva', async () => {
    // Sin `permitirRedPrivada`, este mismo servidor de prueba queda afuera.
    await expect(descargar(`${base}/foto.png`, { directorio })).rejects.toThrow(/interna/i);
  });

  it('rechaza localhost y los metadatos de nube', async () => {
    await expect(descargar('http://localhost/foto.png')).rejects.toThrow(/interna/i);
    await expect(descargar('http://169.254.169.254/latest/meta-data/')).rejects.toThrow(/interna/i);
    await expect(descargar('http://10.0.0.1/foto.png')).rejects.toThrow(/interna/i);
    await expect(descargar('http://192.168.1.1/foto.png')).rejects.toThrow(/interna/i);
  });
});

describe('procesarImagen', () => {
  it('rechaza bytes que no son una imagen', async () => {
    await expect(procesarImagen(Buffer.from('esto no es un png'))).rejects.toThrow(ErrorDeIngesta);
  });

  it('achica una imagen enorme al lado fijo', async () => {
    const procesada = await procesarImagen(await imagenDePrueba(3000, 2000));
    const meta = await sharp(procesada).metadata();
    expect([meta.width, meta.height]).toEqual([400, 400]);
  });

  it('agranda una imagen chica en vez de dejarla borrosa a medias', async () => {
    const meta = await sharp(await procesarImagen(await imagenDePrueba(100, 100))).metadata();
    expect([meta.width, meta.height]).toEqual([400, 400]);
  });
});
