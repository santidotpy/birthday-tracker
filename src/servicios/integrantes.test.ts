import { createServer, type Server } from 'node:http';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { sql } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import sharp from 'sharp';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { crearDb, type Db } from '../db/index.js';
import { buscarIntegrante } from '../db/repositorio.js';
import { integrantes } from '../db/schema.js';
import { altaDeIntegrante, bajaDeIntegrante, edicionDeIntegrante } from './integrantes.js';

let servidor: Server;
let base: string;
let directorio: string;
let db: Db;

beforeAll(async () => {
  const png = await sharp({
    create: { width: 600, height: 400, channels: 3, background: { r: 10, g: 90, b: 200 } },
  })
    .png()
    .toBuffer();

  servidor = createServer((peticion, respuesta) => {
    if (peticion.url === '/rota') {
      respuesta.writeHead(404);
      respuesta.end();
      return;
    }
    respuesta.writeHead(200, { 'content-type': 'image/png' });
    respuesta.end(png);
  });
  await new Promise<void>((listo) => servidor.listen(0, '127.0.0.1', listo));
  base = `http://127.0.0.1:${(servidor.address() as AddressInfo).port}`;
});

afterAll(async () => {
  await new Promise<void>((listo) => servidor.close(() => listo()));
});

beforeEach(async () => {
  directorio = await mkdtemp(join(tmpdir(), 'servicio-'));
  db = crearDb(':memory:');
  migrate(db, { migrationsFolder: './drizzle' });
});

afterEach(async () => {
  await rm(directorio, { recursive: true, force: true });
});

const opciones = () => ({ directorio, permitirRedPrivada: true });
const archivos = () => readdir(directorio);

const ana = { nombre: 'Ana Pérez', fechaDeCumpleanos: { mes: 8, dia: 31 } };

describe('altaDeIntegrante', () => {
  it('se queda con una copia propia del retrato', async () => {
    const creada = await altaDeIntegrante(
      db,
      { ...ana, urlDeRetrato: `${base}/foto.png` },
      opciones(),
    );

    expect(creada.retrato).toBeTruthy();
    expect(await archivos()).toEqual([creada.retrato]);

    // La URL de origen queda como procedencia, pero fuera del dominio.
    const fila = db.select().from(integrantes).get()!;
    expect(fila.retratoOrigen).toBe(`${base}/foto.png`);
  });

  it('deja el retrato vacío si no se le pasa URL', async () => {
    const creada = await altaDeIntegrante(db, ana, opciones());
    expect(creada.retrato).toBeNull();
    expect(await archivos()).toEqual([]);
  });

  it('no descarga nada si los datos no son válidos', async () => {
    await expect(
      altaDeIntegrante(db, { ...ana, nombre: '   ', urlDeRetrato: `${base}/foto.png` }, opciones()),
    ).rejects.toThrow(/nombre/i);
    expect(await archivos()).toEqual([]);
  });

  it('no crea al integrante si la URL no sirve', async () => {
    await expect(
      altaDeIntegrante(db, { ...ana, urlDeRetrato: `${base}/rota` }, opciones()),
    ).rejects.toThrow(/404/);
    expect(db.select().from(integrantes).all()).toEqual([]);
    expect(await archivos()).toEqual([]);
  });

  it('no deja el archivo huérfano si el alta falla después de descargar', async () => {
    db.run(sql`drop table integrantes`);
    await expect(
      altaDeIntegrante(db, { ...ana, urlDeRetrato: `${base}/foto.png` }, opciones()),
    ).rejects.toThrow();
    expect(await archivos()).toEqual([]);
  });
});

describe('edicionDeIntegrante', () => {
  it('reemplaza el retrato y borra el anterior', async () => {
    const creada = await altaDeIntegrante(
      db,
      { ...ana, urlDeRetrato: `${base}/foto.png` },
      opciones(),
    );
    const viejo = creada.retrato!;

    const editada = await edicionDeIntegrante(
      db,
      creada.id,
      { ...ana, urlDeRetrato: `${base}/otra.png` },
      opciones(),
    );

    expect(editada.retrato).not.toBe(viejo);
    // Queda uno solo: el anterior no se acumula en el disco.
    expect(await archivos()).toEqual([editada.retrato]);
  });

  it('conserva el retrato cuando no se toca la URL', async () => {
    const creada = await altaDeIntegrante(
      db,
      { ...ana, urlDeRetrato: `${base}/foto.png` },
      opciones(),
    );

    const editada = await edicionDeIntegrante(
      db,
      creada.id,
      { nombre: 'Ana María Pérez', fechaDeCumpleanos: { mes: 9, dia: 6 } },
      opciones(),
    );

    expect(editada.retrato).toBe(creada.retrato);
    expect(editada.nombre).toBe('Ana María Pérez');
    expect(await archivos()).toEqual([creada.retrato]);
  });

  it('quita el retrato cuando se le pasa null', async () => {
    const creada = await altaDeIntegrante(
      db,
      { ...ana, urlDeRetrato: `${base}/foto.png` },
      opciones(),
    );

    const editada = await edicionDeIntegrante(
      db,
      creada.id,
      { ...ana, urlDeRetrato: null },
      opciones(),
    );

    expect(editada.retrato).toBeNull();
    expect(await archivos()).toEqual([]);
  });

  it('falla con un id que no existe', async () => {
    await expect(edicionDeIntegrante(db, 'no-existe', ana, opciones())).rejects.toThrow(/no existe/i);
  });
});

describe('bajaDeIntegrante', () => {
  it('archiva sin borrar el retrato, porque el archivado conserva sus datos', async () => {
    const creada = await altaDeIntegrante(
      db,
      { ...ana, urlDeRetrato: `${base}/foto.png` },
      opciones(),
    );

    bajaDeIntegrante(db, creada.id);

    expect(buscarIntegrante(db, creada.id)?.archivado).toBe(true);
    expect(await archivos()).toEqual([creada.retrato]);
  });
});
